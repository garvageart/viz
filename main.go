package main

***REMOVED***
	"imagine/log"
***REMOVED***

func main(***REMOVED*** {
	handlers := log.SetupLogHandlers(***REMOVED***
	logger := log.CreateLogger(handlers***REMOVED***

	logger.Info("This is an info message"***REMOVED***
	logger.Error("This is an error message"***REMOVED***
	logger.Debug("This is a debug message"***REMOVED***
	logger.Warn("This is a warning message"***REMOVED***
***REMOVED***
