package db

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	_ "github.com/joho/godotenv/autoload"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	imaglog "imagine/log"
	"imagine/utils"
)

func (db *DB) Connect() (*mongo.Client, error) {
	if db.Logger == nil {
		db.Logger = SetupMongoLogger()
	}

	logger := db.Logger

	host := fmt.Sprintf("%s:%d", db.Address, db.Port)
	logger.Info("Connecting to MongoDB...")

	clientOpts := options.ClientOptions{
		AppName: &db.AppName,
		Auth: &options.Credential{
			Username:   db.User,
			Password:   db.Password,
			AuthSource: "admin",
		},
		Hosts: []string{host},
	}

	client, err := mongo.Connect(&clientOpts)
	if err != nil {
		return client, err
	}

	err = client.Ping(db.Context, nil)
	if err != nil {
		return client, fmt.Errorf("error pinging mongo: %w", err)
	}

	if db.DatabaseName != "" {
		client.Database(db.DatabaseName)
		dbOptions := options.Database().SetBSONOptions(&options.BSONOptions{
			// Useless bc it doesn't do the underscore properly so it's whatever
			// Maybe it'll magically start working one day
			UseJSONStructTags: true,
		})

		db.Database = client.Database(db.DatabaseName, dbOptions)
	} else {
		logger.Warn("No database name provided, consider providing a database name or use the SetDatabase() method to avoid errors")
	}

	if db.CollectionName != "" {
		db.Collection = db.Database.Collection(db.CollectionName)
	} else {
		logger.Warn("No collection name provided, consider providing a collection name or use the SetCollection() method to avoid errors")
	}

	logger.Info("Successfully connected to MongoDB", slog.Group("connection",
		slog.String("address", db.Address),
		slog.Int("port", db.Port),
		slog.String("database", db.DatabaseName),
		slog.String("collection", db.CollectionName),
	))

	// Set the client to the `Client` field on the receiver to be used else where
	db.Client = client
	return client, nil
}

func (db *DB) SetCollection(collectionName string, opts *options.CollectionOptions) *mongo.Collection {
	db.CollectionName = collectionName
	options := options.Collection().
		SetBSONOptions(opts.BSONOptions)

	db.Collection = db.Database.Collection(collectionName, options)
	return db.Collection
}

func (db *DB) SetDatabase(databaseName string, opts *options.DatabaseOptions) *mongo.Database {
	db.DatabaseName = databaseName
	options := options.Database().
		SetBSONOptions(opts.BSONOptions)

	db.Database = db.Client.Database(databaseName, options)
	return db.Database
}

func (db *DB) Disconnect(client *mongo.Client) error {
	err := client.Disconnect(db.Context)
	if err != nil {
		return err
	}
	return nil
}

func (db *DB) Delete(document bson.D) (*mongo.DeleteResult, error) {
	result, err := db.Database.Collection(db.CollectionName).DeleteOne(db.Context, document)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (db *DB) Exists(filter bson.D) (bool, error) {
	err := db.Database.Collection(db.CollectionName).FindOne(db.Context, filter).Err()
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (db *DB) Find(filter bson.D, result any) (*mongo.Cursor, error) {
	cursor, err := db.Database.Collection(db.CollectionName).Find(db.Context, filter)
	if err != nil {
		return nil, err
	}

	defer cursor.Close(db.Context)
	cursorErr := cursor.All(db.Context, result)
	if cursorErr != nil {
		return nil, cursorErr
	}

	return cursor, nil
}

func (db *DB) FindOne(filter bson.D, result any) error {
	err := db.Database.Collection(db.CollectionName).FindOne(db.Context, filter).Decode(result)
	if err != nil {
		return err
	}
	return nil
}

func (db DB) Insert(document bson.D) (*mongo.InsertOneResult, error) {
	result, err := db.Database.Collection(db.CollectionName).InsertOne(db.Context, document)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (db *DB) Update(filter bson.D, document bson.D) (*mongo.UpdateResult, error) {
	result, err := db.Database.Collection(db.CollectionName).UpdateOne(db.Context, filter, document)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (db *DB) UpdateMany(filter bson.D, documents []bson.D) (*mongo.UpdateResult, error) {
	result, err := db.Database.Collection(db.CollectionName).UpdateMany(db.Context, filter, documents)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (db *DB) DeleteMany(documents []bson.D) (*mongo.DeleteResult, error) {
	result, err := db.Database.Collection(db.CollectionName).DeleteMany(db.Context, documents)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (db *DB) InsertMany(documents []bson.D) (*mongo.InsertManyResult, error) {
	result, err := db.Database.Collection(db.CollectionName).InsertMany(db.Context, documents)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (db *DB) ReplaceOne(filter bson.D, replacement bson.D) (*mongo.UpdateResult, error) {
	result, err := db.Database.Collection(db.CollectionName).ReplaceOne(db.Context, filter, replacement)

	if err != nil {
		return nil, err
	}

	return result, nil
}

func SetupMongoLogger() *slog.Logger {
	httpLogFileDefaults := imaglog.LogFileDefaults
	logLevel := imaglog.DefaultLogLevel

	// Setup file logger
	logFileWriter := imaglog.FileLog{
		Directory: httpLogFileDefaults.Directory + "/mongo",
		Filename:  fmt.Sprintf("%s-%s", httpLogFileDefaults.Filename, "mongodb"),
	}

	fileHandler := imaglog.NewFileLogger(&imaglog.ImalogHandlerOptions{
		Writer: logFileWriter,
		HandlerOptions: &slog.HandlerOptions{
			AddSource: true,
			Level:     logLevel,
		},
	})

	consoleHandler := imaglog.NewColourLogger(&imaglog.ImalogHandlerOptions{
		HandlerOptions: &slog.HandlerOptions{
			Level:     logLevel,
			AddSource: false,
		},
		Writer:           os.Stderr,
		OutputEmptyAttrs: true,
	})

	return imaglog.CreateLogger([]slog.Handler{fileHandler, consoleHandler})
}

// This is just for testing
// DO NOT USE IN PROD
func Initis() error {
	mongoCtx, cancelMongo := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancelMongo()

	var db DBClient = &DB{
		Address:        "localhost",
		Port:           27017,
		User:           os.Getenv("MONGO_USER"),
		Password:       os.Getenv("MONGO_PASSWORD"),
		AppName:        utils.AppName,
		DatabaseName:   "imagine-dev",
		CollectionName: "images",
		Context:        mongoCtx,
	}

	client, err := db.Connect()
	if err != nil {
		panic(err)
	}

	defer func() {
		if client != nil {
			if disconnectErr := db.Disconnect(client); disconnectErr != nil {
				panic("error disconnecting from MongoDB: " + disconnectErr.Error())
			}

			fmt.Println("Disconnected from MongoDB")
		}
	}()
	return err
}
