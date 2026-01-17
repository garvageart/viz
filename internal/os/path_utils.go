package os

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

var (
	CurrentWorkingDirectory = func() string {
		cwd, err := os.Getwd()
		if err != nil {
			panic(fmt.Errorf("error retrieving current working directory: %w", err))
		}

		return StandardisePaths(cwd)
	}()

	ProjectRoot = func() string {
		curr, err := os.Getwd()
		if err != nil {
			return CurrentWorkingDirectory
		}

		for {
			if _, err := os.Stat(filepath.Join(curr, "go.mod")); err == nil {
				return StandardisePaths(curr)
			}

			parent := filepath.Dir(curr)
			if parent == curr {
				break
			}
			curr = parent
		}

		return CurrentWorkingDirectory
	}()
)

// Microsoft you will pay for your crimes against standards
func StandardisePaths(path string) string {
	if runtime.GOOS == "windows" {
		return strings.ReplaceAll(path, "/", "\\")
	} else {
		return strings.ReplaceAll(path, "\\", "/")
	}
}
