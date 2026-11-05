package entities

// Custom, non-generated entity types live here. This file is safe from code
// generation and can be used to add fields that shouldn't appear in the DTOs
// produced by the OpenAPI generator.

// UserWithPassword embeds the generated User entity and adds a Password field
// for internal/auth storage. GORM will AutoMigrate this type and add the
// `password` column to the existing `users` table.
type UserWithPassword struct {
	User
	Password *string `gorm:"type:text"`
}

// TableName ensures GORM uses the same table as the generated User type.
func (UserWithPassword) TableName() string {
	return "users"
}

// ToUser returns the embedded generated User value.
func (u UserWithPassword) ToUser() User {
	return u.User
}

// FromUser creates a UserWithPassword from a generated User and optional
// password hash.
func FromUser(u User, password *string) UserWithPassword {
	return UserWithPassword{User: u, Password: password}
}

// TableName overrides the default GORM table name (image_assets) to keep using "images".
func (ImageAsset) TableName() string {
	return "images"
}

// TableName overrides the default GORM table name for CollectionImage.
func (CollectionImage) TableName() string {
	return "collection_images"
}

// ImageKeyword represents the many-to-many junction record between ImageAsset and Keyword.
type ImageKeyword struct {
	ImageAssetID uint `gorm:"column:image_asset_id;primaryKey"`
	KeywordID    uint `gorm:"column:keyword_id;primaryKey"`
}

// TableName overrides the default GORM table name for ImageKeyword.
func (ImageKeyword) TableName() string {
	return "image_keywords"
}
