// THIS IS A RANDOM FILE I USE TO TEST GOLANG STUFF, THIS WAS THE INITIAL ENTRYPOINT
// AT THE VERY BEGINNING OF THE PROJECT BUT NOW IT IS JUST A SCRATCHPAD. DO NOT USE FOR ANYTHING.
// WILL GET REMOVED LATER.
package main

import (
	"runtime"
	"strings"
)

func main() {
	pc, file, line, ok := runtime.Caller(0)
	if !ok {
		panic("could not get caller info")
	}

	fn := runtime.FuncForPC(pc)
	if fn == nil {
		panic("could not get function info")
	}

	println("Caller info:")
	println("File:", file)
	println("Line:", line)
	println("Function:", fn.Name())
	println("Package:", strings.Split(fn.Name(), ".")[0])
}
