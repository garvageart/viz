package entities

// Models returns the list of all GORM entity models used by viz.
// Used for database initialization, schema cache warmup, test DB setup, and migration tooling.
func Models() []any {
	return []any{
		ImageAsset{},
		Collection{},
		CollectionImage{},
		Session{},
		APIKey{},
		User{},
		DownloadToken{},
		WorkerJob{},
		UserWithPassword{},
		SettingDefault{},
		SettingOverride{},
		ImageTransform{},
	}
}
