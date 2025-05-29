package log

***REMOVED***
	"bytes"
***REMOVED***
	"encoding/json"
***REMOVED***
	"io"
	"log/slog"
	"strconv"
	"strings"
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
	Level       slog.Level
	Message     string
	Bytes       string
***REMOVED***

type SlogColourHandler struct {
	handler          slog.Handler
	buffer           *bytes.Buffer
	writer           io.Writer
	mutex            *sync.Mutex
	showRecord       bool
	outputEmptyAttrs bool
	replaceAttrs     func(groups []string, a slog.Attr***REMOVED*** slog.Attr
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
	var attrsAsBytes []byte

	var levelString string
	levelAttr := slog.Attr{
		Key:   slog.LevelKey,
		Value: slog.AnyValue(record.Level***REMOVED***,
***REMOVED***

	if h.replaceAttrs != nil {
		levelAttr = h.replaceAttrs([]string{***REMOVED***, levelAttr***REMOVED***
***REMOVED***

	if !levelAttr.Equal(slog.Attr{***REMOVED******REMOVED*** {
		levelString = levelAttr.Value.String(***REMOVED*** + ":"

		if record.Level <= slog.LevelDebug {
			levelString = colorize(LightGreen, levelString***REMOVED***
	***REMOVED*** else if record.Level <= slog.LevelInfo {
			levelString = colorize(Cyan, levelString***REMOVED***
	***REMOVED*** else if record.Level < slog.LevelWarn {
			levelString = colorize(LightBlue, levelString***REMOVED***
	***REMOVED*** else if record.Level < slog.LevelError {
			levelString = colorize(LightYellow, levelString***REMOVED***
	***REMOVED*** else if record.Level <= slog.LevelError+1 {
			levelString = colorize(LightRed, levelString***REMOVED***
	***REMOVED*** else if record.Level > slog.LevelError+1 {
			levelString = colorize(LightMagenta, levelString***REMOVED***
	***REMOVED***
***REMOVED***

	attrs, err = h.computeAttrs(ctx, record***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***

	if h.outputEmptyAttrs || len(attrs***REMOVED*** > 0 {
		attrsAsBytes, err = json.MarshalIndent(attrs, "", "  "***REMOVED***
	***REMOVED***
			return fmt.Errorf("error when marshaling attrs: %w", err***REMOVED***
	***REMOVED***
***REMOVED***

	var timestamp string
	timeAttr := slog.Attr{
		Key:   slog.TimeKey,
		Value: slog.StringValue(record.Time.Format(timeFormat***REMOVED******REMOVED***,
***REMOVED***
	if h.replaceAttrs != nil {
		timeAttr = h.replaceAttrs([]string{***REMOVED***, timeAttr***REMOVED***
***REMOVED***
	if !timeAttr.Equal(slog.Attr{***REMOVED******REMOVED*** {
		timestamp = colorize(LightGray, timeAttr.Value.String(***REMOVED******REMOVED***
***REMOVED***

	var msg string
	msgAttr := slog.Attr{
		Key:   slog.MessageKey,
		Value: slog.StringValue(record.Message***REMOVED***,
***REMOVED***

	if h.replaceAttrs != nil {
		msgAttr = h.replaceAttrs([]string{***REMOVED***, msgAttr***REMOVED***
***REMOVED***

	if !msgAttr.Equal(slog.Attr{***REMOVED******REMOVED*** {
		msg = colorize(White, msgAttr.Value.String(***REMOVED******REMOVED***
***REMOVED***

	out := strings.Builder{***REMOVED***
	if len(timestamp***REMOVED*** > 0 {
		out.WriteString(timestamp***REMOVED***
		out.WriteString(" "***REMOVED***
***REMOVED***
	if len(levelString***REMOVED*** > 0 {
		out.WriteString(levelString***REMOVED***
		out.WriteString(" "***REMOVED***
***REMOVED***
	if len(msg***REMOVED*** > 0 {
		out.WriteString(msg***REMOVED***
		out.WriteString(" "***REMOVED***
***REMOVED***

	// 2 is the minimum length of a []byte when created as a literal
	// Check this so that we don't display an empty []byte string in the console
	// when there are no properties to show
	//
	// TODO: Use the ShowSource field or check if some sort of debug env variable is set,
	// in addition the length check to determine whether we should output
	// any additional messages. This handles any weird potential edges cases
	// Which? Idk but I'd rather not find out lmao
	// This is fine for now
	if len(attrsAsBytes***REMOVED*** > 2 {
		out.WriteString(colorize(DarkGray, string(attrsAsBytes***REMOVED******REMOVED******REMOVED***
***REMOVED***

	_, err = io.WriteString(h.writer, out.String(***REMOVED***+"\n"***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***

***REMOVED***
***REMOVED***

func NewColourLogger(opts *ImalogHandlerOptions***REMOVED*** *SlogColourHandler {
	if opts == nil {
		opts = &ImalogHandlerOptions{***REMOVED***
***REMOVED***

	buffer := &bytes.Buffer{***REMOVED***

	return &SlogColourHandler{
		buffer:     buffer,
		writer:     opts.Writer,
		mutex:      &sync.Mutex{***REMOVED***,
		showRecord: opts.ShowSource,
		handler: slog.NewJSONHandler(buffer, &slog.HandlerOptions{
			Level:       opts.Level,
			AddSource:   opts.AddSource,
			ReplaceAttr: SuppressDefaults(opts.ReplaceAttr***REMOVED***,
	***REMOVED******REMOVED***,
		outputEmptyAttrs: opts.OutputEmptyAttrs,
***REMOVED***
***REMOVED***
