package http

***REMOVED***
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/render"
***REMOVED***

func ServerError(res http.ResponseWriter, req *http.Request, err error, logger *slog.Logger, logArgs *slog.Attr, msg string, userMsg string***REMOVED*** {
	jsonResponse := map[string]any{
		"user_message": "something went wrong on our side, please try again later",
		"message":      msg,
***REMOVED***

	msg = strings.TrimSpace(msg***REMOVED***
	userMsg = strings.TrimSpace(userMsg***REMOVED***

	if userMsg != "" {
		jsonResponse["user_message"] = userMsg
***REMOVED***

	if msg != "" {
		jsonResponse["message"] = msg
***REMOVED*** else {
		msg = userMsg
***REMOVED***

	if msg != "" {
		jsonResponse["error"] = err.Error(***REMOVED***
***REMOVED***

	if logArgs == nil {
		logArgs = &slog.Attr{***REMOVED***
***REMOVED***


	logger.Error(msg, *logArgs, slog.String("err", err.Error(***REMOVED******REMOVED******REMOVED***

	res.WriteHeader(http.StatusInternalServerError***REMOVED***
	render.JSON(res, req, jsonResponse***REMOVED***
***REMOVED***
