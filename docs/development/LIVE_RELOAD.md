# Live Reloading with Air

To avoid manually restarting the server after every code change, we recommend using [Air](https://github.com/air-verse/air). Air watches your Go files and automatically recompiles and restarts the application when changes are detected.

## 1. Installation

Install the `air` binary:

```bash
go install github.com/air-verse/air@latest
```

## 2. Configuration

Create a `.air.toml` file in the project root.

**Important for VSCode Users:** If you use "Save All" or have autosave enabled, we recommend setting a `delay` (e.g., 1000ms) to prevent rapid restart loops while multiple files are being saved.

Recommended `.air.toml`:

```toml
# Config file for [Air](https://github.com/air-verse/air) in TOML format

# Working directory
root = "."
tmp_dir = "tmp"

[build]
# Build the API binary. using .exe for Windows compatibility (works on Linux/Mac too usually, or just remove extension)
cmd = "go build -o ./tmp/api.exe ./cmd/api/api.go"
# Binary file yields from `cmd`.
bin = "./tmp/api.exe"
# Watch these filename extensions.
include_ext = ["go", "tpl", "tmpl", "html", "yaml", "yml", "json"]
# Ignore these filename extensions or directories.
exclude_dir = ["assets", "tmp", "vendor", "frontend", "viz", "node_modules", "build", "docs", ".git", ".vscode", ".devcontainer"]
# Exclude specific regular expressions.
exclude_regex = ["_test.go"]
# Exclude unchanged files.
exclude_unchanged = true
# Follow symlink for directories
follow_symlink = true
# This log file places in your tmp_dir.
log = "air.log"
# It's not necessary to trigger build each time file changes if it's too frequent.
delay = 1000 # ms (Set to 1000ms to handle VSCode 'Save All' gracefully)
# Stop running old binary when build errors occur.
stop_on_error = true
# Send Interrupt signal before killing process (windows does not support this feature)
send_interrupt = false
# Delay after sending Interrupt signal
kill_delay = 500 # ms

[log]
# Show log time
time = true

[color]
# Customize each part's color. If no color found, use the raw app log.
main = "magenta"
watcher = "cyan"
build = "yellow"
runner = "green"

[misc]
# Delete tmp directory on exit
clean_on_exit = true
```

## 3. Usage

Instead of running `go run cmd/api/api.go`, simply run:

```bash
air
```

The server will start, and any subsequent saves to `.go` files will trigger a rebuild.
