***REMOVED***

import "go.mongodb.org/mongo-driver/v2/bson"

func ToBSONDocument(v interface{***REMOVED******REMOVED*** (doc *bson.D, err error***REMOVED*** {
	data, err := bson.Marshal(v***REMOVED***
***REMOVED***
		return
***REMOVED***

	err = bson.Unmarshal(data, &doc***REMOVED***
	return
***REMOVED***