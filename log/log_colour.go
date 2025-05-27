package log

***REMOVED***
	"bytes"
***REMOVED***
	"encoding/json"
***REMOVED***
	"io"
	"log/slog"
	"strconv"
	"sync"
***REMOVED***

const (
	Reset = "\033[0m"

	Black        = 30
	Red          = 31
	Green        = 32
	Yellow       = 33
	Blue         = 34
	Magenta      = 35
	Cyan         = 36
	LightGray    = 37
	DarkGray     = 90
	LightRed     = 91
	LightGreen   = 92
	LightYellow  = 93
	LightBlue    = 94
	LightMagenta = 95
	LightCyan    = 96
	White        = 97
***REMOVED***

const (
	timeFormat = "[01-02-2006 15:04:05.000]"
***REMOVED***

type LogMessage struct {
	Time        string
	LevelString string
	Level       int
	Message     string
	Bytes       string
***REMOVED***

type SlogColourHandler struct {
	handler    slog.Handler
	buffer     *bytes.Buffer
	mutex      *sync.Mutex
	showRecord bool
***REMOVED***

func RGBToAnsiString(r, g, b uint8***REMOVED*** string {
	return fmt.Sprintf("\033[38;2;%d;%d;%dm", r, g, b***REMOVED***
***REMOVED***

func colorize(colorCode int, v string***REMOVED*** string {
	return fmt.Sprintf("\033[%sm%s%s", strconv.Itoa(colorCode***REMOVED***, v, Reset***REMOVED***
***REMOVED***

func (h *SlogColourHandler***REMOVED*** Enabled(ctx context.Context, level slog.Level***REMOVED*** bool {
	return true
***REMOVED***

func (h *SlogColourHandler***REMOVED*** computeAttrs(ctx context.Context, r slog.Record***REMOVED*** (map[string]any, error***REMOVED*** {
	if !h.showRecord {
	***REMOVED***, nil
***REMOVED***

	h.mutex.Lock(***REMOVED***
	defer func(***REMOVED*** {
		h.buffer.Reset(***REMOVED***
		h.mutex.Unlock(***REMOVED***
***REMOVED***(***REMOVED***

	if err := h.handler.Handle(ctx, r***REMOVED***; err != nil {
	***REMOVED***, fmt.Errorf("error when calling inner handler's Handle: %w", err***REMOVED***
***REMOVED***

	var attrs map[string]any
	err := json.Unmarshal(h.buffer.Bytes(***REMOVED***, &attrs***REMOVED***

***REMOVED***
	***REMOVED***, fmt.Errorf("error when unmarshaling inner handler's Handle result: %w", err***REMOVED***
***REMOVED***

	return attrs, nil
***REMOVED***

func SuppressDefaults(next func([]string, slog.Attr***REMOVED*** slog.Attr***REMOVED*** func([]string, slog.Attr***REMOVED*** slog.Attr {
	return func(groups []string, a slog.Attr***REMOVED*** slog.Attr {
		if a.Key == slog.TimeKey ||
			a.Key == slog.LevelKey ||
			a.Key == slog.MessageKey {
			return slog.Attr{***REMOVED***
	***REMOVED***
		if next == nil {
			return a
	***REMOVED***
		return next(groups, a***REMOVED***
***REMOVED***
***REMOVED***

func (h *SlogColourHandler***REMOVED*** WithAttrs(attrs []slog.Attr***REMOVED*** slog.Handler {
	return h
***REMOVED***

func (h *SlogColourHandler***REMOVED*** WithGroup(name string***REMOVED*** slog.Handler {
	return h
***REMOVED***

func (h *SlogColourHandler***REMOVED*** Handle(ctx context.Context, record slog.Record***REMOVED*** error {
	var attrs map[string]any
	var err error
	var buffer []byte

	attrs, err = h.computeAttrs(ctx, record***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***

	// Don't marshal JSON if we don't have any record attributes to show
	// so that the final displayed text in the terminal remains blank
	if len(attrs***REMOVED*** > 0 {
		buffer, err = json.MarshalIndent(attrs, "", "  "***REMOVED***
	***REMOVED***
			return fmt.Errorf("error when marshaling attrs: %w", err***REMOVED***
	***REMOVED***
***REMOVED***

	levelString := record.Level.String(***REMOVED*** + ":"

	switch record.Level {
	case slog.LevelDebug:
		levelString = colorize(Magenta, levelString***REMOVED***
	case slog.LevelInfo:
		levelString = colorize(Cyan, levelString***REMOVED***
	case slog.LevelWarn:
		levelString = colorize(LightYellow, levelString***REMOVED***
	case slog.LevelError:
		levelString = colorize(LightRed, levelString***REMOVED***
***REMOVED***

	// Contain map details into a map and convert it to the struct shape
	// so we can log the details in order
	toPrint := map[string]any{
	***REMOVED***:    colorize(LightGray, record.Time.Format(timeFormat***REMOVED******REMOVED***,
		"levelString":   levelString,
		"level":   record.Level,
		"message": colorize(White, record.Message***REMOVED***,
		"bytes":   colorize(DarkGray, string(buffer***REMOVED******REMOVED***,
***REMOVED***

	b, err := json.Marshal(toPrint***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***

	var logMessage LogMessage

	err = json.Unmarshal(b, &logMessage***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***

	fmt.Println(logMessage.Time, logMessage.LevelString, logMessage.Message, logMessage.Bytes***REMOVED***

***REMOVED***
***REMOVED***

func NewColourLogger(opts *ImalogHandlerOptions***REMOVED*** *SlogColourHandler {
	if opts == nil {
		opts = &ImalogHandlerOptions{***REMOVED***
***REMOVED***

	var writer io.Writer
	buffer := &bytes.Buffer{***REMOVED***

	if opts.Writer != nil {
		writer = opts.Writer
***REMOVED*** else {
		writer = buffer
***REMOVED***

	return &SlogColourHandler{
		buffer:     buffer,
		mutex:      &sync.Mutex{***REMOVED***,
		showRecord: opts.ShowRecord,
		handler:    slog.NewJSONHandler(writer, opts.HandlerOptions***REMOVED***,
***REMOVED***
***REMOVED***
