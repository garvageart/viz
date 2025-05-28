package libos

***REMOVED***
***REMOVED***
	"path/filepath"
***REMOVED***

type File struct {
	Path string
***REMOVED***

type OsPerm struct {
	DirPerm  os.FileMode
	FilePerm os.FileMode
***REMOVED***

func (fl File***REMOVED*** Open(date string***REMOVED*** (file *os.File, err error***REMOVED*** {
	path := fl.Path

	err = os.MkdirAll(filepath.Dir(path***REMOVED***, os.ModePerm***REMOVED***

***REMOVED***
		return file, err
***REMOVED***

	// Using all these flags allows us to append to the file not overwrite the data lmao (important!***REMOVED***
	return os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644***REMOVED***
***REMOVED***

func (fl File***REMOVED*** Write(data []byte***REMOVED*** (n int, err error***REMOVED*** {
	file, err := fl.Open(fl.Path***REMOVED***

***REMOVED***
		return 0, err
***REMOVED***

	defer file.Close(***REMOVED***

	return file.Write([]byte(data***REMOVED******REMOVED***
***REMOVED***

func (fl File***REMOVED*** Read(***REMOVED*** ([]byte, error***REMOVED*** {
	return os.ReadFile(fl.Path***REMOVED***
***REMOVED***
