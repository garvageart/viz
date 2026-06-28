// THIS IS A RANDOM FILE I USE TO TEST GOLANG STUFF, THIS WAS THE INITIAL ENTRYPOINT
// AT THE VERY BEGINNING OF THE PROJECT BUT NOW IT IS JUST A SCRATCHPAD. DO NOT USE FOR ANYTHING.
// WILL GET REMOVED LATER.
package main

import (
	"fmt"
	"runtime"
)

func main() {
	// Get Go runtime version
	goVersion := runtime.Version()
	// Get OS name (e.g., "linux", "darwin", "windows")
	osName := runtime.GOOS
	// Get architecture (e.g., "amd64", "386")
	arch := runtime.GOARCH

	fmt.Printf("Go Runtime Version: %s\n", goVersion)
	fmt.Printf("Host OS: %s\n", osName)
	fmt.Printf("Architecture: %s\n", arch)
}
