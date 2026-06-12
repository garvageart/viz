package migrations

import "embed"

//go:embed sql/*.sql
var EmbedFS embed.FS
