package os

import (
	"fmt"
	"os"
	"path/filepath"
)

var (
	CurrentWorkingDirectory = func() string {
		cwd, err := os.Getwd()
		if err != nil {
			panic(fmt.Errorf("error retrieving current working directory: %w", err))
		}

		return filepath.Clean(cwd)
	}()

	ProjectRoot = func() string {
		curr, err := os.Getwd()
		if err != nil {
			return CurrentWorkingDirectory
		}

		// First try to find the repository/workspace root by looking for go.work or .git
		tmp := curr
		for {
			if _, err := os.Stat(filepath.Join(tmp, "go.work")); err == nil {
				return filepath.Clean(tmp)
			}
			if _, err := os.Stat(filepath.Join(tmp, ".git")); err == nil {
				return filepath.Clean(tmp)
			}

			parent := filepath.Dir(tmp)
			if parent == tmp {
				break
			}
			tmp = parent
		}

		// Fallback to searching for the nearest go.mod
		for {
			if _, err := os.Stat(filepath.Join(curr, "go.mod")); err == nil {
				return filepath.Clean(curr)
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
