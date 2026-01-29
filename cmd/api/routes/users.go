package routes

import (
	"slices"
	"bytes"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"viz/internal/auth"
	"viz/internal/config"
	"viz/internal/crypto"
	"viz/internal/dto"
	"viz/internal/entities"
	libhttp "viz/internal/http"
	"viz/internal/settings"
	"viz/internal/uid"
	"viz/internal/utils"
)

func AccountsRouter(db *gorm.DB, logger *slog.Logger) *chi.Mux {
	router := chi.NewRouter()

	router.Post("/", func(res http.ResponseWriter, req *http.Request) {
		if !config.GetConfig().UserManagement.AllowManualRegistration {
			render.Status(req, http.StatusForbidden)
			render.JSON(res, req, dto.ErrorResponse{Error: "User Registration disabled, only admin's may register users"})
			return
		}

		var create dto.UserCreate

		err := render.DecodeJSON(req.Body, &create)
		if err != nil {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Invalid request body"})
			return
		}

		if create.Name == "" || create.Password == "" || string(create.Email) == "" {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Required fields are missing"})
			return
		}

		if !utils.IsValidEmail(string(create.Email)) {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Email is invalid"})
			return
		}

		var existingUser entities.User
		tx := db.Where("email = ?", string(create.Email)).First(&existingUser)
		switch tx.Error {
		case nil:
			render.Status(req, http.StatusConflict)
			render.JSON(res, req, dto.ErrorResponse{Error: "User already exists"})
			return
		case gorm.ErrRecordNotFound:
			logger.Info("accounts.create: no existing user", slog.String("email", string(create.Email)))
		default:
			logger.Info("accounts.create: db error when checking existing user", slog.Any("error", tx.Error))
			libhttp.ServerError(res, req, tx.Error, logger, nil,
				"Failed to check existing user",
				"Something went wrong, please try again later",
			)
			return
		}

		id, err := uid.Generate()
		if err != nil {
			libhttp.ServerError(res, req, err, logger, nil,
				"Failed to generate user ID",
				"Something went wrong, please try again later",
			)
			return
		}

		userEnt := entities.User{
			Uid:       id,
			Email:     string(create.Email),
			Username:  create.Name,
			FirstName: "",
			LastName:  "",
		}

		argonParams := &crypto.Argon2Params{
			MemoryMB: config.AppConfig.Security.Argon2MemoryMB,
			Time:     config.AppConfig.Security.Argon2Time,
			Threads:  config.AppConfig.Security.Argon2Threads,
		}

		hashed, err := crypto.HashPassword(create.Password, argonParams)
		if err != nil {
			libhttp.ServerError(res, req, err, logger, nil,
				"Failed to hash password",
				"Something went wrong, please try again later",
			)
			return
		}

		// Create the user and password in a single operation using the
		// non-generated wrapper type so the DTOs remain unchanged.
		uwp := entities.FromUser(userEnt, &hashed)
		txErr := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&uwp).Error; err != nil {
				return err
			}

			// Initialize onboarding_complete to false for new users
			onboardingOverride := entities.SettingOverride{
				UserId: id,
				Name:   settings.SettingNameOnboardingComplete,
				Value:  "false",
			}
			if err := tx.Create(&onboardingOverride).Error; err != nil {
				return err
			}

			return nil
		})

		if txErr != nil {
			libhttp.ServerError(res, req, txErr, logger, nil,
				"Failed to create user",
				"Something went wrong, please try again later",
			)
			return
		}

		render.Status(req, http.StatusCreated)
		render.JSON(res, req, uwp.User.DTO())
	})

	router.Get("/{uid}", func(res http.ResponseWriter, req *http.Request) {
		userID := chi.URLParam(req, "uid")
		var user entities.User

		err := db.Where("uid = ?", userID).First(&user).Error
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.ErrorResponse{Error: "User not found"})
				return
			}

			libhttp.ServerError(res, req, err, logger, nil,
				"Failed to get user",
				"Something went wrong, please try again later",
			)
			return
		}

		render.JSON(res, req, user.DTO())
	})

	// Authenticated routes
	router.Group(func(r chi.Router) {
		r.Use(libhttp.AuthMiddleware(db, logger))

		r.Route("/me", func(r chi.Router) {
			r.Use(libhttp.UserAuthMiddleware)
			r.Get("/", func(res http.ResponseWriter, req *http.Request) {
				user, _ := libhttp.UserFromContext(req)

				// Compute ETag based on user's UpdatedAt and UID and support conditional
				// requests for bandwidth savings.
				etag := fmt.Sprintf("W/\"%d-%s\"", user.UpdatedAt.UnixNano(), user.Uid)
				res.Header().Set("Cache-Control", "private, max-age=60, must-revalidate")
				res.Header().Set("ETag", etag)

				if match := req.Header.Get("If-None-Match"); match == etag {
					res.WriteHeader(http.StatusNotModified)
					return
				}

				render.JSON(res, req, user.DTO())
			})

			r.Put("/onboard", func(res http.ResponseWriter, req *http.Request) {
				user, _ := libhttp.UserFromContext(req)

				onboardingCompleteStr, err := settings.GetSetting(db, settings.SettingNameOnboardingComplete, &user.Uid)
				if err == nil && onboardingCompleteStr == "true" {
					render.Status(req, http.StatusForbidden)
					render.JSON(res, req, dto.ErrorResponse{Error: "Onboarding already completed"})
					return
				}

				var body dto.UserOnboardingBody

				if err := render.DecodeJSON(req.Body, &body); err != nil {
					render.Status(req, http.StatusBadRequest)
					render.JSON(res, req, dto.ErrorResponse{Error: "Invalid request body"})
					return
				}

				txErr := db.Transaction(func(tx *gorm.DB) error {
					// Update User Profile
					updates := make(map[string]interface{})
					if body.FirstName != "" {
						updates["first_name"] = body.FirstName
					}
					if body.LastName != "" {
						updates["last_name"] = body.LastName
					}
					if len(updates) > 0 {
						if err := tx.Model(&user).Updates(updates).Error; err != nil {
							return err
						}
					}

					// Update Settings
					for _, setting := range body.Settings {
						// Verify setting exists and is user editable
						var def entities.SettingDefault
						if err := tx.Where("name = ?", setting.Name).First(&def).Error; err != nil {
							logger.Warn("can't find setting", slog.String("name", setting.Name))
							continue
						}

						if !def.IsUserEditable {
							render.Status(req, http.StatusForbidden)
							render.JSON(res, req, dto.ErrorResponse{Error: fmt.Sprintf("Setting '%s' is not user editable", setting.Name)})
							return nil
						}

						// Validate the value against the allowed values if they are defined
						if def.AllowedValues != nil && len(*def.AllowedValues) > 0 {
							isValid := slices.Contains(*def.AllowedValues, setting.Value)
							if !isValid {
								render.Status(req, http.StatusBadRequest)
								render.JSON(res, req, dto.ErrorResponse{Error: fmt.Sprintf("Invalid value for setting '%s'", setting.Name)})
								return nil
							}
						}

						override := entities.SettingOverride{
							UserId: user.Uid,
							Name:   setting.Name,
							Value:  setting.Value,
						}

						if err := tx.Clauses(clause.OnConflict{
							Columns:   []clause.Column{{Name: "user_id"}, {Name: "name"}},
							DoUpdates: clause.AssignmentColumns([]string{"value"}),
						}).Create(&override).Error; err != nil {
							return err
						}
					}

					// Mark onboarding as complete
					completeOverride := entities.SettingOverride{
						UserId: user.Uid,
						Name:   settings.SettingNameOnboardingComplete,
						Value:  "true",
					}

					if err := tx.Clauses(clause.OnConflict{
						Columns:   []clause.Column{{Name: "user_id"}, {Name: "name"}},
						DoUpdates: clause.AssignmentColumns([]string{"value"}),
					}).Create(&completeOverride).Error; err != nil {
						return err
					}

					return nil
				})

				if txErr != nil {
					libhttp.ServerError(res, req, txErr, logger, nil, "Failed to complete onboarding", "Internal server error")
					return
				}

				db.Where("uid = ?", user.Uid).First(&user)
				render.JSON(res, req, user.DTO())
			})

			r.Patch("/", func(res http.ResponseWriter, req *http.Request) {
				user, _ := libhttp.UserFromContext(req)

				var updates dto.UserUpdate
				if err := render.DecodeJSON(req.Body, &updates); err != nil {
					render.Status(req, http.StatusBadRequest)
					render.JSON(res, req, dto.ErrorResponse{Error: "Invalid request body"})
					return
				}

				updateFields := make(map[string]interface{})
				if updates.FirstName != nil {
					updateFields["first_name"] = *updates.FirstName
				}
				if updates.LastName != nil {
					updateFields["last_name"] = *updates.LastName
				}
				if updates.Username != nil {
					updateFields["username"] = *updates.Username
				}

				if updates.Email != nil {
					if utils.IsValidEmail(string(*updates.Email)) {
						render.Status(req, http.StatusBadRequest)
						render.JSON(res, req, dto.ErrorResponse{Error: "Email is invalid"})
						return
					}

					updateFields["email"] = *updates.Email
				}

				if len(updateFields) == 0 {
					render.Status(req, http.StatusBadRequest)
					render.JSON(res, req, dto.ErrorResponse{Error: "No fields provided for update"})
					return
				}

				if err := db.Model(&user).Updates(updateFields).Error; err != nil {
					libhttp.ServerError(res, req, err, logger, nil,
						"Failed to update user profile",
						"Something went wrong, please try again later",
					)
					return
				}

				// Re-fetch the updated user to ensure all fields are current and to return the latest DTO
				if err := db.Where("uid = ?", user.Uid).First(&user).Error; err != nil {
					libhttp.ServerError(res, req, err, logger, nil,
						"Failed to fetch updated user",
						"Something went wrong, please try again later",
					)
					return
				}

				render.JSON(res, req, user.DTO())
			})

			r.Put("/password", func(res http.ResponseWriter, req *http.Request) {
				user, _ := libhttp.UserFromContext(req)

				var body dto.UserPasswordUpdate

				if err := render.DecodeJSON(req.Body, &body); err != nil {
					render.Status(req, http.StatusBadRequest)
					render.JSON(res, req, dto.ErrorResponse{Error: "Invalid request body"})
					return
				}

				if body.Current == "" || body.New == "" {
					render.Status(req, http.StatusBadRequest)
					render.JSON(res, req, dto.ErrorResponse{Error: "Current and new passwords are required"})
					return
				}

				// Fetch the user's current password hash from DB (not in context user)
				var dbUser struct {
					Password string
				}
				if err := db.Table("users").Select("password").Where("uid = ?", user.Uid).Scan(&dbUser).Error; err != nil {
					libhttp.ServerError(res, req, err, logger, nil, "Failed to fetch user data", "Internal server error")
					return
				}

				// Verify current password
				argon := crypto.CreateArgon2Hash(3, 32, 2, 32, 16)
				parts := strings.Split(dbUser.Password, ":")
				if len(parts) != 2 {
					logger.Error("Invalid password hash format in DB", slog.String("uid", user.Uid))
					render.Status(req, http.StatusInternalServerError)
					render.JSON(res, req, dto.ErrorResponse{Error: "Internal server error"})
					return
				}

				salt, _ := hex.DecodeString(parts[0])
				storedHash, _ := hex.DecodeString(parts[1])
				inputHash, _ := argon.Hash([]byte(body.Current), salt)

				if !bytes.Equal(inputHash, storedHash) {
					render.Status(req, http.StatusUnauthorized)
					render.JSON(res, req, dto.ErrorResponse{Error: "Incorrect current password"})
					return
				}

				// Hash new password and update
				newSalt := argon.GenerateSalt()
				newHash, _ := argon.Hash([]byte(body.New), newSalt)
				passwordString := hex.EncodeToString(newSalt) + ":" + hex.EncodeToString(newHash)

				if err := db.Model(&entities.User{}).Where("uid = ?", user.Uid).Update("password", passwordString).Error; err != nil {
					libhttp.ServerError(res, req, err, logger, nil, "Failed to update password", "Internal server error")
					return
				}

				render.Status(req, http.StatusOK)
				render.JSON(res, req, dto.MessageResponse{Message: "Password updated successfully"})
			})

			r.Route("/settings", func(r chi.Router) {
				r.Use(libhttp.UserAuthMiddleware)
				r.Group(func(r chi.Router) {
					r.Use(libhttp.ScopeMiddleware([]auth.Scope{auth.UserSettingsReadScope}))
					r.Get("/", func(res http.ResponseWriter, req *http.Request) {
						user, _ := libhttp.UserFromContext(req)

						var maxOverrideUpdatedAt, maxDefaultUpdatedAt time.Time

						db.Model(&entities.SettingOverride{}).
							Where("user_id = ?", user.Uid).
							Select("MAX(updated_at)").
							Row().
							Scan(&maxOverrideUpdatedAt)

						db.Model(&entities.SettingDefault{}).
							Select("MAX(updated_at)").
							Row().
							Scan(&maxDefaultUpdatedAt)

						etag := fmt.Sprintf("W/\"%s-%d-%d\"", user.Uid, maxOverrideUpdatedAt.UnixNano(), maxDefaultUpdatedAt.UnixNano())
						res.Header().Set("Cache-Control", "private, max-age=300, must-revalidate")
						res.Header().Set("ETag", etag)

						if match := req.Header.Get("If-None-Match"); match == etag {
							res.WriteHeader(http.StatusNotModified)
							return
						}

						var defaults []entities.SettingDefault
						if err := db.Find(&defaults).Error; err != nil {
							logger.Error("failed to fetch setting defaults", slog.Any("error", err))
							render.Status(req, http.StatusInternalServerError)
							render.JSON(res, req, dto.ErrorResponse{Error: "Failed to fetch defaults"})
							return
						}

						var overrides []entities.SettingOverride
						if err := db.Where("user_id = ?", user.Uid).Find(&overrides).Error; err != nil {
							logger.Error("failed to fetch user setting overrides", slog.Any("error", err))
							render.Status(req, http.StatusInternalServerError)
							render.JSON(res, req, dto.ErrorResponse{Error: "Failed to fetch overrides"})
							return
						}

						overrideMap := make(map[string]entities.SettingOverride)
						for _, o := range overrides {
							overrideMap[o.Name] = o
						}

						userSettings := make([]dto.UserSetting, 0, len(defaults))
						for _, def := range defaults {
							isEditable := def.IsUserEditable
							userSetting := dto.UserSetting{
								Name:           def.Name,
								DefaultValue:   def.Value,
								ValueType:      string(def.ValueType),
								AllowedValues:  def.AllowedValues,
								IsUserEditable: &isEditable,
								Description:    def.Description,
								Group:          def.Group,
							}

							if override, ok := overrideMap[def.Name]; ok {
								userSetting.Value = override.Value
							} else {
								userSetting.Value = def.Value
							}
							userSettings = append(userSettings, userSetting)
						}

						render.JSON(res, req, userSettings)
					})
				})

				r.Group(func(r chi.Router) {
					r.Use(libhttp.ScopeMiddleware([]auth.Scope{auth.UserSettingsUpdateScope}))
					r.Patch("/", func(res http.ResponseWriter, req *http.Request) {
						user, _ := libhttp.UserFromContext(req)

						settingName := req.URL.Query().Get("name")
						if settingName == "" {
							render.Status(req, http.StatusBadRequest)
							render.JSON(res, req, dto.ErrorResponse{Error: "Setting name is required"})
							return
						}

						var reqBody struct {
							Value string `json:"value"`
						}

						if err := render.DecodeJSON(req.Body, &reqBody); err != nil {
							render.Status(req, http.StatusBadRequest)
							render.JSON(res, req, dto.ErrorResponse{Error: "Invalid request body"})
							return
						}

						var userSettingDefaults entities.SettingDefault
						if err := db.Where("name = ?", settingName).First(&userSettingDefaults).Error; err != nil {
							if err == gorm.ErrRecordNotFound {
								render.Status(req, http.StatusNotFound)
								render.JSON(res, req, dto.ErrorResponse{Error: "Setting not found"})
								return
							}
							logger.Error("failed to fetch setting definition", slog.Any("error", err))
							render.Status(req, http.StatusInternalServerError)
							render.JSON(res, req, dto.ErrorResponse{Error: "Failed to fetch settings"})
							return
						}

						if !userSettingDefaults.IsUserEditable {
							render.Status(req, http.StatusForbidden)
							render.JSON(res, req, dto.ErrorResponse{Error: "Setting is not user editable"})
							return
						}

						// Validate the new value based on definition
						if err := validateSettingValue(reqBody.Value, userSettingDefaults); err != nil {
							render.Status(req, http.StatusBadRequest)
							render.JSON(res, req, dto.ErrorResponse{Error: err.Error()})
							return
						}

						override := entities.SettingOverride{
							UserId: user.Uid,
							Name:   settingName,
							Value:  reqBody.Value,
						}

						// Use Upsert to create or update the override
						if err := db.Clauses(clause.OnConflict{
							Columns:   []clause.Column{{Name: "user_id"}, {Name: "name"}},
							DoUpdates: clause.AssignmentColumns([]string{"value"}),
						}).Create(&override).Error; err != nil {
							logger.Error("failed to save setting override", slog.Any("error", err))
							render.Status(req, http.StatusInternalServerError)
							render.JSON(res, req, dto.ErrorResponse{Error: "Failed to save settings"})
							return
						}

						// Return the merged setting for the updated one
						isEditable := userSettingDefaults.IsUserEditable
						userSetting := dto.UserSetting{
							Name:           userSettingDefaults.Name,
							DefaultValue:   userSettingDefaults.Value,
							ValueType:      string(userSettingDefaults.ValueType),
							AllowedValues:  userSettingDefaults.AllowedValues,
							IsUserEditable: &isEditable,
							Description:    userSettingDefaults.Description,
							Group:          userSettingDefaults.Group,
							Value:          override.Value, // The newly set override value
						}

						render.JSON(res, req, userSetting)
					})
				})
			})
		})
	})

	return router
}

// validateSettingValue checks if the provided value conforms to the setting definition.
func validateSettingValue(value string, def entities.SettingDefault) error {
	switch dto.SettingDefaultValueType(def.ValueType) {
	case dto.Boolean:
		if !(strings.EqualFold(value, "true") || strings.EqualFold(value, "false")) {
			return fmt.Errorf("invalid boolean value: %s", value)
		}
	case dto.Integer:
		_, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("invalid integer value: %s", value)
		}
	case dto.Enum:
		if def.AllowedValues != nil && len(*def.AllowedValues) > 0 {
			found := false
			for _, v := range *def.AllowedValues {
				if v == value {
					found = true
					break
				}
			}
			if !found {
				return fmt.Errorf("value '%s' is not in allowed values: %v", value, *def.AllowedValues)
			}
		}
	case dto.Json:
		var js json.RawMessage
		if err := json.Unmarshal([]byte(value), &js); err != nil {
			return fmt.Errorf("invalid JSON value: %s", value)
		}
	case dto.String:
		// Any string is valid
	default:
		return fmt.Errorf("unknown setting value type: %s", def.ValueType)
	}
	return nil
}
