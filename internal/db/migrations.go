package db

import (
	"log/slog"

	"gorm.io/gorm"
)

// MigrateUsersTable handles manual migrations for the users table.
func MigrateUsersTable(db *gorm.DB, logger *slog.Logger) {
	migrator := db.Migrator()

	// Check if 'username' column exists and 'name' does not
	if migrator.HasColumn("users", "username") && !migrator.HasColumn("users", "name") {
		logger.Info("Renaming users.username to users.name")
		if err := migrator.RenameColumn("users", "username", "name"); err != nil {
			logger.Error("Failed to rename users.username to users.name", slog.Any("error", err))
		}
	}
}
