package http

***REMOVED***
	"log/slog"

	imalog "imagine/log"

	"go.les-is.online/imagine/utils"
***REMOVED***

func setupChiLogHandler(opts *imalog.ImalogHandlerOptions***REMOVED*** []slog.Handler {
	if opts == nil {
		opts = &imalog.ImalogHandlerOptions{***REMOVED***
***REMOVED***

	httpLogFileDefaults := imalog.LogFileDefaults
	logLevel := func(***REMOVED*** slog.Level {
	***REMOVED***
			return slog.LevelDebug
	***REMOVED***
		return slog.LevelInfo
***REMOVED***(***REMOVED***

	fileHandler := imalog.NewFileLogger(&imalog.ImalogHandlerOptions{
		Writer: imalog.FileLog{
			Directory: httpLogFileDefaults.Directory + "/http",
			Filename:  httpLogFileDefaults.Filename + "-http",
***REMOVED***
		ShowRecord: true,
		HandlerOptions: &slog.HandlerOptions{
			Level: logLevel,
			// Strip all ANSI codes from the log output set by the
			// go-chi logger middleware
			ReplaceAttr: func(groups []string, a slog.Attr***REMOVED*** slog.Attr {
				if a.Key == slog.MessageKey {
					a.Value = slog.StringValue(imalog.StripAnsi(a.Value.String(***REMOVED******REMOVED******REMOVED***
			***REMOVED***

				return a
	***REMOVED***
***REMOVED***
***REMOVED******REMOVED***

	consoleHandler := imalog.NewColourLogger(&imalog.ImalogHandlerOptions{
		ShowRecord: false,
		HandlerOptions: &slog.HandlerOptions{
			Level:     logLevel,
			AddSource: true,
***REMOVED***
***REMOVED******REMOVED***

	return []slog.Handler{
		fileHandler,
		consoleHandler,
***REMOVED***
***REMOVED***

func SetupChiLogger(***REMOVED*** *slog.Logger {
	handlers := setupChiLogHandler(nil***REMOVED***

	logger := imalog.CreateLogger(handlers***REMOVED***

	httpLogger := logger.With(imalog.LoggerProgramInfoGroup***REMOVED***

	return httpLogger
***REMOVED***
