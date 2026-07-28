package os

import (
	"fmt"
	"os"
	"path/filepath"
)

var (
	CurrentWorkingDirectory string
	ProjectRoot             string
)

func init() {
	cwd, err := os.Getwd()
	if err != nil {
		panic(fmt.Errorf("error retrieving current working directory: %w", err))
	}

	CurrentWorkingDirectory = filepath.Clean(cwd)

	// Finding project root (this seems redundant? but project root and current working directory aren't always the same)
	// First try to find the repository/workspace root by looking for go.work or .git
	tmp := cwd
	for {
		if _, err := os.Stat(filepath.Join(tmp, "go.work")); err == nil {
			ProjectRoot = filepath.Clean(tmp)
		}
		if _, err := os.Stat(filepath.Join(tmp, ".git")); err == nil {
			ProjectRoot = filepath.Clean(tmp)
		}

		parent := filepath.Dir(tmp)
		if parent == tmp {
			break
		}
		tmp = parent
	}

	// Fallback to searching for the nearest go.mod
	if ProjectRoot == "" {
		for {
			if _, err := os.Stat(filepath.Join(cwd, "go.mod")); err == nil {
				ProjectRoot = filepath.Clean(cwd)
				break
			}

			parent := filepath.Dir(cwd)
			if parent == cwd {
				break
			}
			cwd = parent
		}
	}

	// Last resort: use the current working directory
	if ProjectRoot == "" {
		ProjectRoot = CurrentWorkingDirectory
	}
}
