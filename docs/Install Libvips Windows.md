# How to install libvips on Windows

## Windows

+ Install [msys2-x86_64](http://www.msys2.org/)
+ In msys shell, do:
```
pacman -Syuu
pacman -S mingw-w64-x86_64-gcc
pacman -S mingw-w64-x86_64-pkg-config
pacman -S mingw-w64-x86_64-libvips
pacman -S mingw-w64-x86_64-zlib
pacman -S mingw-w64-x86_64-poppler
pacman -S mingw-w64-x86_64-libjxl
pacman -S mingw-w64-x86_64-openslide
```

+ Switch to cmd.exe shell, and do:
```
set PATH=<msys64>\mingw64\bin;%PATH%
set PKG_CONFIG_PATH=<msys64>\mingw64\lib\pkgconfig
```

The default installation path of `msys2` is `C:\msys64` and you must change
`<msys64>` to your installation path of `msys2`.


## Common

Check if pkg-config is able to find the right libvips include and libs:

```
pkg-config --cflags --libs vips
```

Per the security update https://groups.google.com/forum/#!topic/golang-announce/X7N1mvntnoU
you may need whitelist the -Xpreprocessor flag in your environment.

```
export CGO_CFLAGS_ALLOW='-Xpreprocessor'
```

## vipsgen

Currently, this project uses [`vipsgen`](https://github.com/cshum/vipsgen) to create Go bindings for libvips. Make sure your local version of libvips matches the one used by vipsgen.

The releases page of [`vipsgen`](https://github.com/cshum/vipsgen/releases) shows when the library bindings support the latest version of libvips.

You can check the version of the local libvips by running `vips --version`.