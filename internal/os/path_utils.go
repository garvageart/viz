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
