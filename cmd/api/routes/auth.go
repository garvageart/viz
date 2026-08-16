package routes

import (
	"encoding/base64"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/dromara/carbon/v2"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
	_ "github.com/joho/godotenv/autoload"
	"gorm.io/gorm"

	gonanoid "github.com/matoous/go-nanoid/v2"
	"golang.org/x/oauth2"

	"viz/internal/auth"
	oauth "viz/internal/auth/oauth"
	"viz/internal/config"
	"viz/internal/crypto"
	"viz/internal/dto"
	"viz/internal/entities"
	libhttp "viz/internal/http"
	"viz/internal/uid"
)

type VizAuthCodeFlow struct {
	Code  string `json:"code"`
	State string `json:"state"`
}

// Idk what this is or what I meant to put here
type VizAuthPasswordFlow struct {
	State string
}

func AuthRouter(db *gorm.DB, logger *slog.Logger) *chi.Mux {
	router := chi.NewRouter()
	router.Post("/login", func(res http.ResponseWriter, req *http.Request) {
		// Accept minimal login payload to avoid coupling to entities
		var login struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}

		err := render.DecodeJSON(req.Body, &login)
		if err != nil {
			libhttp.ServerError(res, req, err, logger, nil,
				"invalid request body",
				"Something went wrong, please try again later",
			)
			return
		}

		if login.Email == "" || login.Password == "" {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Required fields are missing"})
			return
		}

		// Fetch password hash and uid directly from users table by email
		var row struct {
			UID      string
			Password string
		}

		tx := db.Model(&entities.User{}).Select("uid, password").Where("email = ?", login.Email).Scan(&row)
		if tx.Error != nil || row.Password == "" {
			// Uniform error for both "user not found" and "empty password" to prevent user enumeration
			render.Status(req, http.StatusUnauthorized)
			render.JSON(res, req, dto.ErrorResponse{Error: "Invalid email or password"})
			return
		}

		argonParams := &crypto.Argon2Params{
			MemoryMB: config.AppConfig.Security.Argon2MemoryMB,
			Time:     config.AppConfig.Security.Argon2Time,
			Threads:  config.AppConfig.Security.Argon2Threads,
		}

		isValidPass, err := crypto.VerifyPassword(row.Password, login.Password, argonParams)
		if err != nil {
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to verify password"})
			return
		}

		if !isValidPass {
			render.Status(req, http.StatusUnauthorized)
			render.JSON(res, req, dto.ErrorResponse{Error: "Invalid email or password"})
			return
		}

		// Create auth token and persistent session
		authToken := auth.GenerateAuthToken()
		expiryTime := carbon.Now().AddYear().StdTime()
		http.SetCookie(res, libhttp.CreateAuthTokenCookie(expiryTime, authToken))

		// Persist session for server-side validation
		lastActive := time.Now()
		sess := entities.Session{
			Token:      authToken,
			Uid:        uid.MustGenerate(),
			UserUid:    row.UID,
			ClientIp:   &req.RemoteAddr,
			UserAgent:  new(req.UserAgent()),
			LastActive: &lastActive,
			ExpiresAt:  &expiryTime,
		}

		if err := db.Create(&sess).Error; err != nil {
			libhttp.ServerError(res, req, err, logger, nil,
				"failed to create session",
				"Something went wrong while signing you in. Please try again.",
			)
			return
		}

		logger.Info("user authenticated", slog.String("request_id", libhttp.GetRequestID(req)))
		render.Status(req, http.StatusOK)
		render.JSON(res, req, dto.MessageResponse{Message: "User authenticated"})
	})

	router.Get("/session", func(res http.ResponseWriter, req *http.Request) {
		var userSession entities.Session
		cookieToken, err := req.Cookie(libhttp.AuthTokenCookie)

		if err != nil {
			if err == http.ErrNoCookie {
				render.Status(req, http.StatusUnauthorized)
				render.JSON(res, req, dto.ErrorResponse{Error: "No session cookie"})
				return
			}

			libhttp.ServerError(res, req, err, logger, nil,
				"failed to read session cookie",
				"Something went wrong, please try again later",
			)
			return
		}

		err = db.Where("token = ?", cookieToken.Value).First(&userSession).Error
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				render.Status(req, http.StatusUnauthorized)
				render.JSON(res, req, dto.ErrorResponse{Error: "Session not found"})
				return
			}

			libhttp.ServerError(res, req, err, logger, nil,
				"failed to get session",
				"Something went wrong, please try again later",
			)
			return
		}

		if userSession.ExpiresAt != nil && userSession.ExpiresAt.Before(time.Now()) {
			db.Delete(&userSession)
			libhttp.ClearCookie(libhttp.AuthTokenCookie, res)
			render.Status(req, http.StatusUnauthorized)
			render.JSON(res, req, dto.ErrorResponse{Error: "Session expired"})
			return
		}

		// Async debounce update of LastActive
		if userSession.LastActive == nil || time.Since(*userSession.LastActive) > 5*time.Minute {
			// Capture needed vars for goroutine
			uid := userSession.Uid
			go func() {
				if err := db.Model(&entities.Session{}).Where("uid = ?", uid).Update("last_active", time.Now()).Error; err != nil {
					logger.Error("failed to update session last_active", slog.Any("error", err))
				}
			}()
		}

		var user entities.User
		if err := db.Where("uid = ?", userSession.UserUid).First(&user).Error; err == nil {
			libhttp.SetSessionCache(cookieToken.Value, &user, userSession.ExpiresAt)
		}

		lastActiveNano := int64(0)
		if userSession.LastActive != nil {
			lastActiveNano = userSession.LastActive.UnixNano()
		}
		etag := fmt.Sprintf("W/\"%s-%d\"", userSession.Uid, lastActiveNano)

		res.Header().Set("Cache-Control", "private, max-age=60, must-revalidate")
		res.Header().Set("ETag", etag)

		if match := req.Header.Get("If-None-Match"); match == etag {
			res.WriteHeader(http.StatusNotModified)
			return
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, userSession.DTO())
	})

	router.Get("/oauth", func(res http.ResponseWriter, req *http.Request) {
		var oauthConfig *oauth2.Config
		provider := req.FormValue("provider")

		switch provider {
		default:
			providerErr := errors.New("unsupported provider")
			if provider != "" {
				providerErr = errors.New("no provider... provided")
				libhttp.ServerError(res, req, providerErr, logger, nil,
					"",
					"Error siging you in. Please try again later.",
				)
			} else {
				libhttp.ServerError(res, req, providerErr, logger, nil,
					"",
					"Error siging you in. Please try again later.",
				)
			}
		}

		state, err := gonanoid.New(32)
		if err != nil {
			libhttp.ServerError(res, req, err, logger, nil,
				"error generating oauth state",
				"",
			)
			return
		}

		stateHash := crypto.CreateHash([]byte(state))
		encryptedStateB64 := base64.URLEncoding.EncodeToString(stateHash)

		// 5 minute max window to login using the generated state
		http.SetCookie(res, &http.Cookie{
			Name:  libhttp.RedirectCookie,
			Value: encryptedStateB64,
			// TODO: Make this expires value configureable
			Expires:  carbon.Now().AddMinutes(5).StdTime(),
			Path:     "/",
			Secure:   true,
			HttpOnly: true, // client doesn't use this value, make HttpOnly
			SameSite: http.SameSiteLaxMode,
		})

		oauthUrl, err := oauth.SetupOAuthURL(res, req, oauthConfig, provider, state)
		if err != nil {

			libhttp.ServerError(res, req, err, logger, nil,
				"",
				"",
			)
			return
		}

		http.Redirect(res, req, oauthUrl, http.StatusTemporaryRedirect)
	})

	router.Post("/oauth/{provider}", func(res http.ResponseWriter, req *http.Request) {
		provider := strings.ToLower(chi.URLParam(req, "provider"))
		state := req.FormValue("state")

		// Validate state against the hash stored in the redirect_state cookie
		redirectCookie, cookieErr := req.Cookie(libhttp.RedirectCookie)
		if cookieErr != nil || redirectCookie.Value == "" {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Missing or invalid OAuth state"})
			return
		}

		stateHash := crypto.CreateHash([]byte(state))
		expectedHash, decodeErr := base64.URLEncoding.DecodeString(redirectCookie.Value)
		if decodeErr != nil || !crypto.VerifyHash(stateHash, expectedHash) {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "OAuth state validation failed"})
			return
		}

		var actualUserData struct {
			Email   string `json:"email"`
			Name    string `json:"name"`
			Picture string `json:"picture"`
		}

		switch provider {

		default:
			res.WriteHeader(http.StatusBadRequest)
			res.Write([]byte("OAuth provider unsupported"))
		}

		expiryTime := carbon.Now().AddYear().StdTime()

		tokenString := auth.GenerateAuthToken()

		// Store the state value in a cookie for the client session
		http.SetCookie(res, &http.Cookie{
			Name:     libhttp.StateCookie,
			Value:    state,
			Expires:  expiryTime,
			Path:     "/",
			Secure:   true,
			SameSite: http.SameSiteLaxMode,
		})

		// delete the temporary redirect state from the browser
		http.SetCookie(res, &http.Cookie{
			Name:     libhttp.RedirectCookie,
			Value:    "",
			Path:     "/",
			Expires:  time.Unix(0, 0),
			HttpOnly: true,
		})

		http.SetCookie(res, libhttp.CreateAuthTokenCookie(expiryTime, tokenString))

		logger.Info("User logged in with OAuth", slog.String("provider", provider))
		render.JSON(res, req, actualUserData)
	})

	router.Post("/logout", func(res http.ResponseWriter, req *http.Request) {
		if cookie, err := req.Cookie(libhttp.AuthTokenCookie); err == nil && cookie.Value != "" {
			// don't fail the logout if DB delete errors
			tx := db.Where("token = ?", cookie.Value).Delete(&entities.Session{})
			if tx.Error != nil {
				logger.Warn("failed to delete session on logout", slog.String("request_id", libhttp.GetRequestID(req)), slog.Any("error", tx.Error))
			}

			// Invalidate any in-memory cache for this session token so other requests
			// don't continue using a now-deleted session until their cache entry expires.
			libhttp.ClearSessionCache(cookie.Value)
		}

		// clear anything related to auth in the browser. even stuff that may linger
		libhttp.ClearCookie(libhttp.AuthTokenCookie, res)
		libhttp.ClearCookie(libhttp.StateCookie, res)
		libhttp.ClearCookie(libhttp.RedirectCookie, res)
		libhttp.ClearCookie(libhttp.RefreshTokenCookie, res)

		render.Status(req, http.StatusOK)
		render.JSON(res, req, dto.MessageResponse{Message: "Logged out"})
	})

	return router
}
