package utils

***REMOVED***
	"encoding/json"
***REMOVED***
	"log"
	"maps"
***REMOVED***
	"slices"
	"strings"

	"go.uber.org/zap"
***REMOVED***

// A struct to hold default date values useful for formatting Golang dates
type DateFormatValues struct {
	Year        string
	MonthDigit  string
	MonthString string
	Day         string
	Hour        string
	Minute      string
	Second      string
***REMOVED***

var DefaultDateTimeValues = &DateFormatValues{
	Year:        "2006",
	MonthDigit:  "01",
	MonthString: "January",
	Day:         "02",
	Hour:        "15",
	Minute:      "04",
	Second:      "05",
***REMOVED***

const (
	DefaultDateTimeFormat = "02012006_150405"
***REMOVED***

func GetAppVersion(***REMOVED*** string {
	data, err := os.ReadFile("version.txt"***REMOVED***

***REMOVED***
		fmt.Println("Error reading version file", err***REMOVED***
		return ""
***REMOVED***

	return strings.Split(string(data***REMOVED***, "\n"***REMOVED***[0]
***REMOVED***

// Utility function to log and panic if an error occurs
func FailOnError(err error, msg string***REMOVED*** {
***REMOVED***
		log.Panicf("%s: %s", msg, err***REMOVED***
***REMOVED***
***REMOVED***

func FileExists(path string***REMOVED*** bool {
	info, err := os.Stat(path***REMOVED***

	if os.IsNotExist(err***REMOVED*** {
		return false
***REMOVED***

	return !info.IsDir(***REMOVED***
***REMOVED***

// Converts a map to a slice of zap.Fields
func MapToZapFields(inputMap map[string]any***REMOVED*** []zap.Field {
	fields := make([]zap.Field, 0, len(inputMap***REMOVED******REMOVED***

	for key, val := range inputMap {
		fields = append(fields, zap.Any(key, val***REMOVED******REMOVED***
***REMOVED***

	return fields
***REMOVED***

func MapToSlice(inputMap map[string]any***REMOVED*** []any {
	return slices.Collect(maps.Values(inputMap***REMOVED******REMOVED***
***REMOVED***

func IsEnvironment(env string***REMOVED*** bool {
	return os.Getenv("env"***REMOVED*** == env ||
		os.Getenv("ENV"***REMOVED*** == env ||
		os.Getenv("environment"***REMOVED*** == env
***REMOVED***

func JsonToMap(jsonString string***REMOVED*** (map[string]any, error***REMOVED*** {
	result := make(map[string]any***REMOVED***

	err := json.Unmarshal([]byte(jsonString***REMOVED***, &result***REMOVED***

***REMOVED***
	***REMOVED***, err
***REMOVED***

***REMOVED***
***REMOVED***
