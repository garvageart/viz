package frontend

import (
	"os"
	"path/filepath"
)

const (
	DefaultTheme          = "viz-black"
	ThemeStylePlaceholder = "%viz.css.theme_style%"
	ThemeAttrPlaceholder  = "%THEME_ATTR%"
	IndexHtml             = "index.html"
)

var (
	FrontendBuildDir = os.Getenv("VIZ_FRONTEND_BUILD_PATH")
	ThemeDir         = filepath.Join(FrontendBuildDir, "themes")
)
