package db

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	_ "github.com/joho/godotenv/autoload"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	imaglog "imagine/log"
	"imagine/utils"
)

func (db *DB) Connect() (*gorm.DB, error) {
	if db.Logger == nil {
		db.Logger = SetupDatabaseLogger()
	}

	logger := db.Logger
	logger.Info("Connecting to Postgres...")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=disable", db.Address, db.User, db.Password, db.DatabaseName, db.Port)
	client, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return client, err
	}

	logger.Info("Successfully connected to PostgresSQL", slog.Group("connection",
		slog.String("address", db.Address),
		slog.Int("port", db.Port),
		slog.String("database", db.DatabaseName),
		slog.String("table", db.TableNameString),
	))

	if db.TableNameString != "" {
		db.Table = client.Table(db.TableNameString)
	} else {
		logger.Warn("No table name provided, consider providing a table name or use the SetTable() method to avoid errors")
	}

	// Set the client to the `Client` field on the receiver to be used else where
	db.Client = client
	return client, nil
}

func (db *DB) TableName() string {
	return db.TableNameString
}

func (db *DB) SetTable(tableName string) *gorm.DB {
	db.TableNameString = tableName

	db.Table = db.Client.Table(db.TableNameString)
	return db.Table
}

func (db *DB) Disconnect(client *gorm.DB) error {
	sqlDB, err := client.DB()
	if err != nil {
		return fmt.Errorf("failed to return sql.DB: %v", err)
	}

	return sqlDB.Close()
}

func (db *DB) Delete(value interface{}, conds ...interface{}) (*gorm.DB, error) {
	result := db.Client.Delete(value, conds...)

	if result.Error != nil {
		return result, fmt.Errorf("failed to delete document: %v", result.Error)
	}

	return result, nil
}

func (db *DB) Exists(dest interface{}, conds ...interface{}) (bool, error) {
	result := db.Client.Take(dest, conds...)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return false, nil
		}

		return false, fmt.Errorf("failed to get document: %v", result.Error)
	}

	return true, nil
}

func SetupDatabaseLogger() *slog.Logger {
	httpLogFileDefaults := imaglog.LogFileDefaults
	logLevel := imaglog.DefaultLogLevel

	// Setup file logger
	logFileWriter := imaglog.FileLog{
		Directory: httpLogFileDefaults.Directory + "/postgres",
		Filename:  fmt.Sprintf("%s-%s", httpLogFileDefaults.Filename, "postgresdb"),
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

	var db = &DB{
		Address:         "localhost",
		Port:            27017,
		User:            os.Getenv("MONGO_USER"),
		Password:        os.Getenv("MONGO_PASSWORD"),
		AppName:         utils.AppName,
		DatabaseName:    "imagine-dev",
		TableNameString: "images",
		Context:         mongoCtx,
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
