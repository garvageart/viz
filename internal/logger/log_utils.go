package logger

import (
	"io"
	"log/slog"
	"os"
	"time"

	"regexp"
	"runtime"

	"github.com/dromara/carbon/v2"

	"viz/internal/utils"
)

const (
	ConsoleDateTimeDefaultFormatCarbon = "d-m-Y H:i:s"
)

const (
	// idk wtf this is about
	ServerLoggerGroupKey = "http-chi-server"
	// NOTE: Only here for reference, not currently used in any logic
	LogFileNameFormat = "{AppName}-{AppVersion}-{DateTime}-{Context}[?].log"
)

var (
	LogFileDate    = carbon.Now().Format(FileDateTimeDefaultFormatCarbon)
	DateTimeStdOut = carbon.Now().Format(ConsoleDateTimeDefaultFormatCarbon)
)

var (
	LoggerProgramInfoGroup = slog.Group("program_info",
		slog.String("go_version", runtime.Version()),
		slog.String("environment", utils.Environment),
		slog.String("os", runtime.GOOS),
		slog.Int("pid", os.Getpid()),
		slog.String("app_version", utils.GetAppVersion()),
	)
)

type LogFormat struct {
	Json any
	Text any
}

type ImalogHandlerOptions struct {
	// Not yet implemented
	ShowSource       bool
	Format           LogFormat
	Writer           io.Writer
	OutputEmptyAttrs bool
	*slog.HandlerOptions
}

func StripAnsi(str string) string {
	regex := regexp.MustCompile("/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g")
	return regex.ReplaceAllString(str, "")
}

// ConvertTimeToLocal creates a ReplaceAttr function that converts UTC time to local time
func ConvertTimeToLocal(next func([]string, slog.Attr) slog.Attr) func([]string, slog.Attr) slog.Attr {
	return func(groups []string, a slog.Attr) slog.Attr {
		if a.Key == slog.TimeKey {
			if t, ok := a.Value.Any().(time.Time); ok {
				// Convert the time to local timezone
				localTime := t.Local()
				a.Value = slog.TimeValue(localTime)
			}
		}
		if next == nil {
			return a
		}
		return next(groups, a)
	}
}

// ConvertTimeToLocalIfEnabled creates a ReplaceAttr function that conditionally converts time based on timezone config
func ConvertTimeToLocalIfEnabled(useLocal bool, next func([]string, slog.Attr) slog.Attr) func([]string, slog.Attr) slog.Attr {
	if !useLocal {
		return next
	}
	return ConvertTimeToLocal(next)
}
