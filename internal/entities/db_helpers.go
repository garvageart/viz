package entities

import (
	"fmt"

	"gorm.io/gorm"

	"viz/internal/dto"
)

func CountUsers(db *gorm.DB) (int64, error) {
	var count int64
	if err := db.Model(&User{}).Count(&count).Error; err != nil {
		return 0, fmt.Errorf("failed to count users: %w", err)
	}

	return count, nil
}

func CountSuperadmins(db *gorm.DB) (int64, error) {
	var count int64
	if err := db.Model(&User{}).Where("role = ?", dto.UserRoleSuperadmin).Count(&count).Error; err != nil {
		return 0, fmt.Errorf("failed to count superadmins: %w", err)
	}

	return count, nil
}

// HardDeleteUser permanently removes a user and all associated relational data from the database.
//
// Operations performed within a single database transaction:
//  1. Deletes all user sessions (Session).
//  2. Deletes all setting overrides and onboarding flags (SettingOverride).
//  3. Deletes all API keys issued to or owned by the user (APIKey).
//  4. Deletes all collections created or owned by the user (Collection), along with their
//     collection-image junctions (CollectionImage).
//  5. Deletes any remaining collection-image junctions added by the user to shared collections.
//  6. Nullifies any remaining collection ownership fields (created_by_id, owner_id) pointing to the user.
//  7. Nullifies image asset ownership references (owner_id, uploaded_by_id) in ImageAsset.
//  8. Deletes the User record itself. Returns gorm.ErrRecordNotFound if no user matches userUid.
//
// This operation is permanent and irreversible.
func HardDeleteUser(db *gorm.DB, userUid string) error {
	return db.Transaction(func(tx *gorm.DB) error {
		// 1. Delete all sessions for the user
		if err := tx.Unscoped().Where("user_uid = ?", userUid).Delete(&Session{}).Error; err != nil {
			return fmt.Errorf("failed to delete user sessions: %w", err)
		}

		// 2. Delete all setting overrides (includes onboarding status)
		if err := tx.Unscoped().Where("user_id = ?", userUid).Delete(&SettingOverride{}).Error; err != nil {
			return fmt.Errorf("failed to delete user settings: %w", err)
		}

		// 3. Delete all API keys for the user
		if tx.Migrator().HasTable(&APIKey{}) {
			if err := tx.Unscoped().Where("user_id = ?", userUid).Delete(&APIKey{}).Error; err != nil {
				return fmt.Errorf("failed to delete user api keys: %w", err)
			}
		}

		// 4. Find all collections owned or created by this user
		var collectionIds []uint
		if err := tx.Model(&Collection{}).Unscoped().
			Where("created_by_id = ? OR owner_id = ?", userUid, userUid).
			Pluck("id", &collectionIds).Error; err != nil {
			return fmt.Errorf("failed to query user collections: %w", err)
		}

		if len(collectionIds) > 0 {
			// Delete collection_images associations for these collections
			if err := tx.Unscoped().Where("collection_id IN ?", collectionIds).Delete(&CollectionImage{}).Error; err != nil {
				return fmt.Errorf("failed to delete collection images: %w", err)
			}

			// Delete the collections themselves
			if err := tx.Unscoped().Where("id IN ?", collectionIds).Delete(&Collection{}).Error; err != nil {
				return fmt.Errorf("failed to delete user collections: %w", err)
			}
		}

		// Delete any remaining collection_images entries added by this user on other collections
		if err := tx.Unscoped().Where("added_by_id = ?", userUid).Delete(&CollectionImage{}).Error; err != nil {
			return fmt.Errorf("failed to delete collection images added by user: %w", err)
		}

		// Nullify any remaining collection references
		if err := tx.Model(&Collection{}).Unscoped().
			Where("created_by_id = ?", userUid).
			Update("created_by_id", nil).Error; err != nil {
			return fmt.Errorf("failed to nullify collection created_by_id: %w", err)
		}

		if err := tx.Model(&Collection{}).Unscoped().
			Where("owner_id = ?", userUid).
			Update("owner_id", nil).Error; err != nil {
			return fmt.Errorf("failed to nullify collection owner_id: %w", err)
		}

		// Nullify ImageAsset user references
		if err := tx.Model(&ImageAsset{}).Unscoped().
			Where("owner_id = ?", userUid).
			Update("owner_id", nil).Error; err != nil {
			return fmt.Errorf("failed to nullify image asset owner_id: %w", err)
		}

		if err := tx.Model(&ImageAsset{}).Unscoped().
			Where("uploaded_by_id = ?", userUid).
			Update("uploaded_by_id", nil).Error; err != nil {
			return fmt.Errorf("failed to nullify image asset uploaded_by_id: %w", err)
		}

		// 5. Delete the user record itself
		res := tx.Unscoped().Where("uid = ?", userUid).Delete(&User{})
		if res.Error != nil {
			return fmt.Errorf("failed to delete user: %w", res.Error)
		}

		if res.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}

		return nil
	})
}
