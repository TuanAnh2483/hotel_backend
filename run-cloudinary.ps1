param(
    [string]$EnvFile = ".env.cloudinary"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$envPath = Join-Path $root $EnvFile

if (-not (Test-Path -LiteralPath $envPath)) {
    Write-Host "Missing $EnvFile." -ForegroundColor Yellow
    Write-Host "Create it from .env.cloudinary.example and fill your real Cloudinary values."
    Write-Host ""
    Write-Host "Copy-Item .env.cloudinary.example .env.cloudinary"
    exit 1
}

Get-Content -LiteralPath $envPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
        return
    }

    $parts = $line.Split("=", 2)
    if ($parts.Count -ne 2 -or -not $parts[0].Trim()) {
        return
    }

    $name = $parts[0].Trim()
    $value = $parts[1].Trim()
    if (
        ($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
        $value = $value.Substring(1, $value.Length - 2)
    }

    [Environment]::SetEnvironmentVariable($name, $value, "Process")
}

$requiredNames = @(
    "UPLOAD_PROVIDER",
    "UPLOAD_CLOUDINARY_ENABLED",
    "UPLOAD_CLOUDINARY_CLOUD_NAME",
    "UPLOAD_CLOUDINARY_API_KEY",
    "UPLOAD_CLOUDINARY_API_SECRET"
)

$missing = @()
foreach ($name in $requiredNames) {
    $value = [Environment]::GetEnvironmentVariable($name, "Process")
    if ([string]::IsNullOrWhiteSpace($value) -or $value.StartsWith("your_")) {
        $missing += $name
    }
}

if ($missing.Count -gt 0) {
    Write-Host "Cloudinary config is incomplete in ${EnvFile}:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host " - $_" }
    exit 1
}

if ($env:UPLOAD_PROVIDER -ne "cloudinary") {
    Write-Host "UPLOAD_PROVIDER must be cloudinary, current value: $env:UPLOAD_PROVIDER" -ForegroundColor Red
    exit 1
}

Write-Host "Starting backend with Cloudinary provider..." -ForegroundColor Green
Write-Host "Cloudinary cloud name: $env:UPLOAD_CLOUDINARY_CLOUD_NAME"

Set-Location $root
& .\mvnw.cmd spring-boot:run
