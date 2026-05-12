# Installing libvips

Viz requires **libvips** to be installed on your system. We rely on `pkg-config` to locate the library, ensuring a consistent build process across all operating systems.

We provide a cross-platform setup script to automate this process.

## Automated Installation (Recommended)

**Prerequisites:**
- **Node.js** (v24+) or **Bun** installed.
- **Windows:** [MSYS2](https://www.msys2.org/) must be installed.

Run the setup script from the project root:

**Windows (MSYS2 MinGW 64-bit Terminal):**
```bash
# Ensure you are in the MSYS2 MinGW 64-bit terminal
bun scripts/js/setup-libvips.ts
# OR
npx tsx scripts/js/setup-libvips.ts
```

**macOS / Linux (Standard Terminal):**
```bash
bun scripts/js/setup-libvips.ts
# OR
npx tsx scripts/js/setup-libvips.ts
```

This script will:
1.  **Windows:** Use `pacman` within your MSYS2 environment to install `mingw-w64-x86_64-libvips`. It will also configure your user environment variables (`PATH`, `PKG_CONFIG_PATH`) to point to the MSYS2 MinGW directory.
2.  **macOS:** Install `vips` and `pkg-config` via Homebrew.
3.  **Linux:** Attempt to install `libvips-dev` using your package manager (`apt`, `dnf`, `pacman`).

## Manual Installation

If you prefer to install manually:

### Windows
1.  Install [MSYS2](https://www.msys2.org/).
2.  Open the **MSYS2 MinGW 64-bit** terminal.
3.  Run: `pacman -Syu && pacman -S mingw-w64-x86_64-libvips mingw-w64-x86_64-imagemagick mingw-w64-x86_64-libheif mingw-w64-x86_64-libjxl mingw-w64-x86_64-openslide mingw-w64-x86_64-poppler mingw-w64-x86_64-libimagequant mingw-w64-x86_64-libarchive mingw-w64-x86_64-librsvg mingw-w64-x86_64-matio mingw-w64-x86_64-cfitsio mingw-w64-x86_64-libcgif mingw-w64-x86_64-libraw mingw-w64-x86_64-libnifti`
4.  Add `C:\msys64\mingw64\bin` to your **User PATH**.
5.  Set the `PKG_CONFIG_PATH` environment variable to `C:\msys64\mingw64\lib\pkgconfig`.

### macOS
```bash
brew install vips pkg-config imagemagick libheif jpeg-xl openslide poppler libimagequant libarchive librsvg matio cfitsio cgif libraw libnifti
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install libvips-dev pkg-config libmagickwand-dev libheif-dev libjxl-dev libopenslide-dev libpoppler-glib-dev libimagequant-dev libarchive-dev librsvg2-dev libmatio-dev libcfitsio-dev libcgif-dev libraw-dev libnifti-dev
```

## Verification

After installation, verify that `pkg-config` can see `libvips` and that it has the expected features.

```bash
vips --version
pkg-config --cflags --libs vips
```
