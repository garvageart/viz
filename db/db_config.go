***REMOVED***

***REMOVED***
***REMOVED***

***REMOVED***
***REMOVED***
***REMOVED***

type DB struct {
	Address      string
	Protocol     string
	Port         int
	User         string
	Password     string
	DatabaseName string
	Database     *mongo.Database
	AppName      string
	Collection   string
	Context      context.Context
	DBClient
***REMOVED***

// Will likely be removed soon
type DBClientCollectionString interface {
	Connect(***REMOVED*** *mongo.Client
	Disconnect(*mongo.Client***REMOVED***
	Insert(collection string***REMOVED***
	InsertMany(collection string***REMOVED***
	Update(collection string***REMOVED***
	UpdateMany(collection string***REMOVED***
	ReplaceOne(collection string***REMOVED***
	Exists(collection string, filter bson.D***REMOVED*** bool
	Delete(collection string***REMOVED***
	DeleteMany(collection string***REMOVED***
	Find(collection string, filter bson.D, result any***REMOVED***
	FindOne(collection string, filter bson.D, result any***REMOVED***
***REMOVED***

type DBClient interface {
	Connect(***REMOVED*** (*mongo.Client, error***REMOVED***
	Disconnect(*mongo.Client***REMOVED*** error
	Insert(document bson.D***REMOVED*** (*mongo.InsertOneResult, error***REMOVED***
	InsertMany(documents []bson.D***REMOVED*** (*mongo.InsertManyResult, error***REMOVED***
	Update(filter bson.D, document bson.D***REMOVED*** (*mongo.UpdateResult, error***REMOVED***
	UpdateMany(filter bson.D, documents []bson.D***REMOVED*** (*mongo.UpdateResult, error***REMOVED***
	ReplaceOne(filter bson.D, replacement bson.D***REMOVED*** (*mongo.UpdateResult, error***REMOVED***
	Exists(filter bson.D***REMOVED*** (bool, error***REMOVED***
	Delete(document bson.D***REMOVED*** (*mongo.DeleteResult, error***REMOVED***
	DeleteMany(documents []bson.D***REMOVED*** (*mongo.DeleteResult, error***REMOVED***
	Find(filter bson.D, result any***REMOVED*** (*mongo.Cursor, error***REMOVED***
	FindOne(filter bson.D, result any***REMOVED***
***REMOVED***
