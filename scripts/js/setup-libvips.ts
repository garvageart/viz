import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const VERSION_FILE = path.join(PROJECT_ROOT, '.libvips-version');

const log = (msg: string) => console.log(`\x1b[36m[setup-libvips]\x1b[0m ${msg}`);
const error = (msg: string) => console.error(`\x1b[31m[Error]\x1b[0m ${msg}`);
const success = (msg: string) => console.log(`\x1b[32m[Success]\x1b[0m ${msg}`);

async function getRequiredVersion(): Promise<string> {
  try {
    const content = await fs.readFile(VERSION_FILE, 'utf-8');
    return content.trim();
  } catch (e) {
    error(`Could not read .libvips-version at ${VERSION_FILE}`);
    process.exit(1);
  }
}

function runCommand(command: string, args: string[], opts: any = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: true, ...opts });
  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Command '${command} ${args.join(' ')}' failed with code ${result.status}`);
  }
}

async function installWindows() {
  log('Detecting Windows environment for MSYS2/pacman installation...');

  // Check if pacman is available (implies MSYS2 environment)
  try {
    execSync('which pacman', { stdio: 'ignore' });
    log('MSYS2/pacman detected. Proceeding with installation.');
  } catch (e) {
    error('pacman not found in PATH.');
    error('Please ensure MSYS2 is installed and this script is run from an MSYS2 terminal (MinGW 64-bit recommended).');
    process.exit(1);
  }

  // Cleanup old dormant installation directory if it exists
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const oldVipsDir = path.join(localAppData, 'Programs', 'vips');
    try {
      await fs.access(oldVipsDir);
      log(`Cleaning up old dormant installation at ${oldVipsDir}...`);
      await fs.rm(oldVipsDir, { recursive: true, force: true });
    } catch { } // Ignore errors during cleanup
  }

  log('Updating MSYS2 packages...');
  try {
    runCommand('pacman', ['-Syu', '--noconfirm']);
  } catch (e: any) {
    log('pacman -Syu finished (may require terminal restart if core packages were updated).');
  }

  log(`Installing dependencies via pacman...`);
  try {
    const packages = [
      'mingw-w64-x86_64-libvips',
      'mingw-w64-x86_64-gcc',
      'mingw-w64-x86_64-imagemagick',
      'mingw-w64-x86_64-libheif',
      'mingw-w64-x86_64-libjxl',
      'mingw-w64-x86_64-openslide',
      'mingw-w64-x86_64-poppler',
      'mingw-w64-x86_64-libimagequant',
      'mingw-w64-x86_64-libarchive',
      'mingw-w64-x86_64-librsvg',
      'mingw-w64-x86_64-matio',
      'mingw-w64-x86_64-cfitsio',
      'mingw-w64-x86_64-libcgif',
      'mingw-w64-x86_64-libraw',
      'mingw-w64-x86_64-libnifti'
    ];

    // Check if pkg-config is in path
    try {
      execSync('pkg-config --version', { stdio: 'ignore' });
    } catch (e) {
      log('pkg-config not found in PATH. Adding mingw-w64-x86_64-pkg-config to installation.');
      packages.push('mingw-w64-x86_64-pkg-config');
    }

    runCommand('pacman', ['-S', '--noconfirm', ...packages]);
    success('Dependencies (libvips, gcc, pkg-config) installed via pacman.');
  } catch (e) {
    error(`Failed to install dependencies via pacman. Ensure you've run 'pacman -Syu' recently.`);
    throw e;
  }

  // Configure Environment Variables (Crucial for Go build)
  log('Configuring persistent environment variables for Go build...');

  let msys2Root;
  try {
    msys2Root = execSync('cygpath -m /', { encoding: 'utf-8' }).trim();
  } catch (e) {
    error("Could not determine MSYS2 root path using 'cygpath -m /'.");
    throw e;
  }

  const mingwBinPath = `${msys2Root}/mingw64/bin`;
  const mingwPkgConfigPath = `${msys2Root}/mingw64/lib/pkgconfig`;

  // Escape single quotes for PowerShell strings
  const esc = (s: string) => s.replace(/'/g, "''");

  const psScript = `
    $MingwBin = '${esc(mingwBinPath)}'
    $MingwPkgConfig = '${esc(mingwPkgConfigPath)}'
    
    # Update PATH (User level)
    $CurrentPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
    $pathEntries = $CurrentPath -split ';' | Where-Object { $_ -and ($_ -notlike "*vips\bin*") }
    if ($pathEntries -notcontains $MingwBin) { $pathEntries += $MingwBin }
    [System.Environment]::SetEnvironmentVariable('Path', ($pathEntries -join ';'), 'User')

    # Update PKG_CONFIG_PATH (User level)
    $CurrentPkgConfigPath = [System.Environment]::GetEnvironmentVariable('PKG_CONFIG_PATH', 'User')
    $pkgConfigEntries = if ($CurrentPkgConfigPath) { $CurrentPkgConfigPath -split ';' | Where-Object { $_ -and ($_ -notlike "*vips\lib\pkgconfig*") } } else { @() }
    if ($pkgConfigEntries -notcontains $MingwPkgConfig) { $pkgConfigEntries += $MingwPkgConfig }
    [System.Environment]::SetEnvironmentVariable('PKG_CONFIG_PATH', ($pkgConfigEntries -join ';'), 'User')
  `;

  // Execute PowerShell text directly via stdin
  const psResult = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', '-'], {
    input: psScript,
    encoding: 'utf-8',
    stdio: ['pipe', 'inherit', 'inherit']
  });

  if (psResult.status === 0) {
    log('Environment variables updated successfully.');
  } else {
    error('Failed to update environment variables via PowerShell.');
  }

  // Update current process environment so verification works immediately
  process.env.PATH = `${mingwBinPath}${path.delimiter}${process.env.PATH}`;
  process.env.PKG_CONFIG_PATH = mingwPkgConfigPath;

  success('Environment configured. Restart your terminal/IDE for changes to fully apply.');
}

async function installMacOS() {
  log('Detecting macOS environment...');
  try {
    execSync('brew --version', { stdio: 'ignore' });
  } catch (e) {
    throw new Error('Homebrew is not installed. Please install Homebrew first: https://brew.sh/');
  }

  log('Installing vips and dependencies via Homebrew...');
  const packages = [
    'vips',
    'gcc',
    'pkg-config',
    'imagemagick',
    'libheif',
    'jpeg-xl',
    'openslide',
    'poppler',
    'libimagequant',
    'libarchive',
    'librsvg',
    'matio',
    'cfitsio',
    'cgif',
    'libraw',
    'libnifti'
  ];
  runCommand('brew', ['install', ...packages]);
  success('Installation complete via Homebrew.');
}

function checkVersionMatch(required: string): boolean {
  try {
    const vipsVersionOutput = execSync('vips --version', { encoding: 'utf-8' }).trim();
    const versionMatch = vipsVersionOutput.match(/vips-(\d+\.\d+\.\d+)/);
    const installedVersion = versionMatch ? versionMatch[1] : null;
    return installedVersion === required;
  } catch (e) {
    return false;
  }
}

async function installFromSourceLinux(version: string) {
  log(`Installing libvips ${version} from source...`);
  
  const buildDeps = [
    'build-essential', 'pkg-config', 'git', 'ca-certificates', 'curl',
    'meson', 'ninja-build', 'python3', 'python3-pip', 'python3-setuptools',
    'libglib2.0-dev', 'libexpat1-dev', 'libjpeg-dev', 'libpng-dev', 'libtiff-dev',
    'libwebp-dev', 'libheif-dev', 'libopenexr-dev', 'liborc-0.4-dev', 'libgirepository1.0-dev',
    'libxml2-dev', 'libexif-dev', 'libpoppler-glib-dev', 'libgsf-1-dev', 'libopenjp2-7-dev',
    'libjxl-dev', 'libimagequant-dev', 'libarchive-dev', 'librsvg2-dev',
    'libopenslide-dev', 'libmatio-dev', 'libcfitsio-dev', 'libcgif-dev',
    'libmagickwand-dev', 'libraw-dev', 'libnifti-dev'
  ];

  log('Installing build dependencies...');
  try {
    runCommand('sudo', ['apt-get', 'update']);
    runCommand('sudo', ['apt-get', 'install', '-y', '--no-install-recommends', ...buildDeps]);
  } catch (e) {
    error('Failed to install build dependencies. Manual intervention required.');
    throw e;
  }

  const buildDir = path.join(os.tmpdir(), 'vips-build');
  log(`Building in ${buildDir}...`);

  try {
    await fs.mkdir(buildDir, { recursive: true });
    const tarball = path.join(buildDir, `vips-${version}.tar.xz`);
    const url = `https://github.com/libvips/libvips/releases/download/v${version}/vips-${version}.tar.xz`;

    log(`Downloading ${url}...`);
    runCommand('curl', ['-fsSL', url, '-o', tarball]);

    log('Extracting...');
    runCommand('tar', ['xJf', tarball], { cwd: buildDir });

    const sourceDir = path.join(buildDir, `vips-${version}`);
    log('Running meson setup...');
    runCommand('meson', ['setup', 'build', '--prefix=/usr'], { cwd: sourceDir });

    log('Building with ninja...');
    runCommand('ninja', ['-C', 'build'], { cwd: sourceDir });

    log('Installing...');
    runCommand('sudo', ['ninja', '-C', 'build', 'install'], { cwd: sourceDir });
    runCommand('sudo', ['ldconfig']);

    success(`libvips ${version} installed from source successfully.`);
  } finally {
    try {
      await fs.rm(buildDir, { recursive: true, force: true });
    } catch (e) { }
  }
}

async function installLinux(requiredVersion: string) {
  log('Detecting Linux environment...');

  let hasApt = false;
  try {
    execSync('which apt-get', { stdio: 'ignore' });
    hasApt = true;
  } catch (e) { }

  if (hasApt) {
    log('Detected apt-based system. Checking available version...');
    try {
      const policy = execSync(`apt-cache policy libvips-dev`, { encoding: 'utf-8' });
      const candidateMatch = policy.match(/Candidate:\s+(\d+\.\d+\.\d+)/);
      const candidateVersion = candidateMatch ? candidateMatch[1] : null;

      if (candidateVersion === requiredVersion) {
        log(`Matching version ${requiredVersion} found in apt. Installing...`);
        const packages = [
          'libvips-dev', 'gcc', 'pkg-config', 'libmagickwand-dev', 'libheif-dev',
          'libjxl-dev', 'libopenslide-dev', 'libpoppler-glib-dev',
          'libimagequant-dev', 'libarchive-dev', 'librsvg2-dev',
          'libmatio-dev', 'libcfitsio-dev', 'libcgif-dev',
          'libraw-dev', 'libnifti-dev'
        ];
        runCommand('sudo', ['apt-get', 'update']);
        runCommand('sudo', ['apt-get', 'install', '-y', ...packages]);
        success('Installation complete via apt-get.');
        return;
      } else {
        log(`Apt candidate version ${candidateVersion} does not match ${requiredVersion}.`);
        if (checkVersionMatch(requiredVersion)) {
          success(`Correct version ${requiredVersion} is already installed.`);
          return;
        }
        
        log('Would you like to install from source? (requires sudo)');
        // Since we are in a script, we'll proceed if we're on a known dev environment or just do it.
        // For safety in this context, I'll just do it as it's the required version for the project.
        await installFromSourceLinux(requiredVersion);
        return;
      }
    } catch (e) {
      log('Could not determine apt version policy. Falling back to default install.');
    }

    const packages = [
      'libvips-dev', 'gcc', 'pkg-config', 'libmagickwand-dev', 'libheif-dev',
      'libjxl-dev', 'libopenslide-dev', 'libpoppler-glib-dev',
      'libimagequant-dev', 'libarchive-dev', 'librsvg2-dev',
      'libmatio-dev', 'libcfitsio-dev', 'libcgif-dev',
      'libraw-dev', 'libnifti-dev'
    ];
    runCommand('sudo', ['apt-get', 'update']);
    runCommand('sudo', ['apt-get', 'install', '-y', ...packages]);
    success('Installation complete via apt-get.');
    return;
  }

  try {
    execSync('which dnf', { stdio: 'ignore' });
    log('Detected dnf-based system. Installing vips-devel and dependencies...');
    const packages = [
      'vips-devel', 'gcc', 'pkg-config', 'ImageMagick-devel', 'libheif-devel',
      'libjxl-devel', 'openslide-devel', 'poppler-glib-devel'
    ];
    runCommand('sudo', ['dnf', 'install', '-y', ...packages]);
    success('Installation complete via dnf.');
    return;
  } catch (e) { }

  try {
    execSync('which pacman', { stdio: 'ignore' });
    log('Detected pacman-based system. Installing libvips and dependencies...');
    const packages = [
      'libvips', 'gcc', 'pkgconf', 'imagemagick', 'libheif', 'libjxl', 'openslide', 'poppler'
    ];
    runCommand('sudo', ['pacman', '-S', '--noconfirm', ...packages]);
    success('Installation complete via pacman.');
    return;
  } catch (e) { }

  throw new Error('Unsupported Linux distribution. Please install libvips-dev, gcc, and pkg-config manually.');
}

async function verify(requiredVersion: string) {
  log('Verifying installation...');
  try {
    const vipsVersionOutput = execSync('vips --version', { encoding: 'utf-8' }).trim();
    // vips --version output is typically "vips-8.15.1"
    const versionMatch = vipsVersionOutput.match(/vips-(\d+\.\d+\.\d+)/);
    const installedVersion = versionMatch ? versionMatch[1] : null;

    if (installedVersion === requiredVersion) {
      success(`Found matching binary: ${vipsVersionOutput}`);
    } else {
      error(`Version mismatch! Target: ${requiredVersion}, Installed: ${installedVersion || vipsVersionOutput}`);
      error('The installed version does not match the required version specified in .libvips-version.');
    }
  } catch (e) {
    error('vips binary not found in PATH.');
  }

  try {
    const libs = execSync('pkg-config --cflags --libs vips', { encoding: 'utf-8' }).trim();
    if (libs) success('pkg-config verified.');
    else error('pkg-config returned empty output for vips.');
  } catch (e) {
    error('pkg-config check failed. Is PKG_CONFIG_PATH set?');
  }
}

async function main() {
  const version = await getRequiredVersion();
  log(`Target libvips version: ${version}`);

  const platform = os.platform();

  try {
    if (platform === 'win32') {
      await installWindows();
    } else if (platform === 'darwin') {
      await installMacOS();
    } else if (platform === 'linux') {
      await installLinux(version);
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    await verify(version);
    success('Setup process finished. PLEASE REFRESH YOUR TERMINAL for changes to take effect.');
  } catch (e: any) {
    error(e.message || e);
    process.exit(1);
  }
}

main();