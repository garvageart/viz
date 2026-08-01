package settings

// This whole thing is a little bit fragile and might change a bit more.
// I don't like how everything is a string that has to be inferred lmao
// Surely there's a better way to do this?
// UPDATE lol: Functions that do generations but now we must create tests for this stuff

// I guess this is just the first pass of implementing the default/overide pattern
// https://web.archive.org/web/20250706041703/https://double.finance/blog/default_override

import (
	"errors"
	"log/slog"

	"gorm.io/gorm"

	"viz/internal/entities"
	imaTime "viz/internal/time"
	"viz/internal/utils"
)

var defaultSettings = []entities.SettingDefault{
	EnumSetting(
		"theme",
		"Theme",
		"System",
		[]string{"Light", "Dark", "System"},
		true,
		"General",
		"Choose your preferred theme: Light, Dark, or System Default.",
	),
	// TODO: Make this is a list of CSS theme files read from the filesyste
	StringSetting(
		"colour_scheme",
		"Colour Theme",
		"viz-black",
		true,
		"General",
		"Choose your preferred colour CSS colour scheme",
	),
	EnumSetting(
		"timezone",
		"",
		"Africa/Johannesburg",
		imaTime.Timezones,
		true,
		"General",
		"Your current timezone (IANA database identifier, e.g. Africa/Johannesburg).",
	),
	BoolSetting(
		"first_run_complete",
		"",
		false,
		false,
		"System",
		"Internal flag indicating if the initial superadmin setup has been completed.",
	),
	BoolSetting(
		"onboarding_complete",
		"",
		false,
		false,
		"User",
		"Internal flag indicating if a user has completed their personal onboarding flow.",
	),
}

// SeedDefaultSettings inserts initial default settings into the database if they don't already exist.
func SeedDefaultSettings(db *gorm.DB, logger *slog.Logger) {
	err := db.Transaction(func(tx *gorm.DB) error {
		// Clean up settings that have been deleted or moved (no longer in defaultSettings)
		activeNames := make(map[string]bool)
		for _, setting := range defaultSettings {
			activeNames[setting.Name] = true
		}

		var allDefaults []entities.SettingDefault
		if err := tx.Unscoped().Find(&allDefaults).Error; err != nil {
			logger.Error("failed to query default settings for cleanup", slog.Any("error", err))
			return err
		}

		for _, existingDefault := range allDefaults {
			if !activeNames[existingDefault.Name] {
				// 1. Delete all overrides for this setting
				if err := tx.Unscoped().Where("name = ?", existingDefault.Name).Delete(&entities.SettingOverride{}).Error; err != nil {
					logger.Error("failed to delete overrides for removed setting", slog.String("setting_name", existingDefault.Name), slog.Any("error", err))
					return err
				}
				logger.Info("removed overrides for deleted setting", slog.String("setting_name", existingDefault.Name))

				// 2. Delete the default setting record
				if err := tx.Unscoped().Delete(&existingDefault).Error; err != nil {
					logger.Error("failed to delete default setting from database", slog.String("setting_name", existingDefault.Name), slog.Any("error", err))
					return err
				}
				logger.Info("removed deleted default setting from database", slog.String("setting_name", existingDefault.Name))
			}
		}

		// Seeding loop
		for _, setting := range defaultSettings {
			var existing entities.SettingDefault

			// Manually find first to allow Unscoped to find soft-deleted records reliably
			err := tx.Unscoped().Where("name = ?", setting.Name).First(&existing).Error

			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					// Not found, create it
					if createErr := tx.Create(&setting).Error; createErr != nil {
						logger.Error("failed to create default setting", slog.String("setting_name", setting.Name), slog.Any("error", createErr))
						return createErr
					}
					logger.Info("created default setting", slog.String("setting_name", setting.Name))
				} else {
					logger.Error("failed to query default setting", slog.String("setting_name", setting.Name), slog.Any("error", err))
					return err
				}
				continue
			}

			// If found (including soft-deleted), check if update is needed
			wasDeleted := existing.DeletedAt.Valid

			if wasDeleted ||
				existing.Value != setting.Value ||
				existing.DisplayName != setting.DisplayName ||
				existing.Description != setting.Description ||
				existing.Group != setting.Group ||
				existing.IsUserEditable != setting.IsUserEditable ||
				existing.ValueType != setting.ValueType ||
				!utils.EqualStringSlices(existing.AllowedValues, setting.AllowedValues) {

				existing.Value = setting.Value
				existing.DisplayName = setting.DisplayName
				existing.Description = setting.Description
				existing.Group = setting.Group
				existing.IsUserEditable = setting.IsUserEditable
				existing.ValueType = setting.ValueType
				existing.AllowedValues = setting.AllowedValues

				if wasDeleted {
					existing.DeletedAt = gorm.DeletedAt{} // Reset to NULL
				}

				if updateErr := tx.Unscoped().Save(&existing).Error; updateErr != nil {
					logger.Error("failed to update default setting", slog.String("setting_name", setting.Name), slog.Any("error", updateErr))
					return updateErr
				}
				logger.Info("updated default setting", slog.String("setting_name", setting.Name))
			} else {
				logger.Info("default setting up-to-date", slog.String("setting_name", setting.Name))
			}
		}

		return nil
	})

	if err != nil {
		logger.Error("failed to complete settings seeding transaction", slog.Any("error", err))
	} else {
		logger.Info("successfully completed settings seeding transaction")
	}
}
