param(
  [switch]$InstallTools,
  [switch]$Build
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Path $PSCommandPath -Parent
$root = Resolve-Path (Join-Path $scriptDir '..')

Write-Host "Repo root: $root"

$specPath = Join-Path $root 'api/openapi/openapi.yaml'
$dtoOutPath = Join-Path $root 'internal/dto/types.gen.go'
$vizDir = Join-Path $root 'viz'

if (-not (Test-Path $specPath)) {
  throw "OpenAPI spec not found at $specPath"
}

# Optionally install tools
if ($InstallTools) {
  Write-Host "Ensuring oapi-codegen is installed..."
  try { Get-Command oapi-codegen -ErrorAction Stop | Out-Null } catch {
    & go install github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@latest
  }

  Write-Host "Ensuring pnpm dev dep openapi-typescript is installed..."
  if (Test-Path $vizDir) {
    Push-Location $vizDir
    try {
      # If pnpm is available, ensure dep exists (will be quick if already present)
      Get-Command pnpm -ErrorAction Stop | Out-Null
      & pnpm add -D openapi-typescript@^7.5.0 | Out-Null
    } catch {
      Write-Warning "pnpm not found. Skipping TS generator install; assuming it's already available in PATH."
    } finally {
      Pop-Location
    }
  }
}

# Ensure oapi runtime dependency exists
Write-Host "Ensuring Go runtime dependency for oapi-codegen is present..."
& go list -m github.com/oapi-codegen/runtime 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  & go get github.com/oapi-codegen/runtime/types@v1.1.0
}

# Generate Go DTOs
Write-Host "Generating Go DTOs from $specPath -> $dtoOutPath"
& oapi-codegen -generate types -package dto -o $dtoOutPath $specPath

# Tidy modules (safe even if nothing changed)
& go mod tidy

# Generate TS interfaces
if (Test-Path $vizDir) {
  Write-Host "Generating TS interfaces in viz..."
  Push-Location $vizDir
  if (Test-Path (Join-Path $vizDir 'package.json')) {
    try {
      Get-Command pnpm -ErrorAction Stop | Out-Null
      & pnpm run gen:api:ts
    } catch {
      Write-Warning "pnpm not found; trying npx openapi-typescript..."
      & npx --yes openapi-typescript ..\api\openapi\openapi.yaml -o src\lib\types\api.gen.ts
    }
  }
  Pop-Location
}

# Optional build checks
if ($Build) {
  Write-Host "Running Go build..."
  & go build ./...
  if (Test-Path $vizDir) {
    Write-Host "Running Svelte/TS check..."
    Push-Location $vizDir
    try { & pnpm run check } catch { Write-Warning "viz check failed (this may be unrelated to API types)." }
    Pop-Location
  }
}

Write-Host "Done."