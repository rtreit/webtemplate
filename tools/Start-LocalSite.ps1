param(
    [int]$HugoPort = 1313,
    [int]$Port = 4280
)

function Read-DotEnv {
    param([string]$Path)

    $values = [ordered]@{}
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) {
            return
        }

        $parts = $line.Split("=", 2)
        if ($parts.Count -eq 2) {
            $values[$parts[0].Trim()] = $parts[1]
        }
    }

    return $values
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot

try {
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Error "npm is required to run the Static Web Apps CLI."
        exit 1
    }

    if (-not (Get-Command func -ErrorAction SilentlyContinue)) {
        Write-Error "Azure Functions Core Tools ('func') is required to run the local API."
        exit 1
    }

    if (-not (Test-Path ".env")) {
        Write-Error ".env was not found. Copy .env.example to .env and fill in your values first."
        exit 1
    }

    $envValues = Read-DotEnv ".env"
    foreach ($pair in $envValues.GetEnumerator()) {
        [Environment]::SetEnvironmentVariable($pair.Key, $pair.Value, "Process")
    }

    if (-not (Test-Path "api\local.settings.json")) {
        $localSettings = [ordered]@{
            IsEncrypted = $false
            Values = [ordered]@{}
        }
        foreach ($pair in $envValues.GetEnumerator()) {
            $localSettings.Values[$pair.Key] = $pair.Value
        }
        $localSettings | ConvertTo-Json -Depth 4 | Set-Content -Path "api\local.settings.json" -Encoding utf8
    }

    if (-not (Test-Path "api\node_modules\@azure\storage-blob")) {
        Write-Host "Installing local API dependencies with npm ci..." -ForegroundColor Cyan
        Push-Location "api"
        try {
            npm ci --no-fund --no-audit
            if ($LASTEXITCODE -ne 0) {
                exit $LASTEXITCODE
            }
        } finally {
            Pop-Location
        }
    }

    $hugoUrl = "http://localhost:$HugoPort"
    $existingHugo = $false

    try {
        Invoke-WebRequest $hugoUrl -UseBasicParsing -TimeoutSec 3 | Out-Null
        $existingHugo = $true
    } catch {
        $existingHugo = $false
    }

    $npxArgs = @(
        "--yes"
        "@azure/static-web-apps-cli"
        "start"
        $hugoUrl
        "--api-location"
        "api"
        "--port"
        "$Port"
    )

    if (-not $existingHugo) {
        $runCommand = "pwsh -NoLogo -NoProfile -File .\tools\Invoke-Hugo.ps1 server -D --port $HugoPort"
        $npxArgs += @("--run", $runCommand)
        Write-Host "Starting Hugo on $hugoUrl and serving the combined local site at http://localhost:$Port" -ForegroundColor Cyan
    } else {
        Write-Host "Using the existing Hugo server on $hugoUrl and serving the combined local site at http://localhost:$Port" -ForegroundColor Cyan
    }

    Write-Host "Open http://localhost:$Port/ for the local starter site." -ForegroundColor Green
    & npx @npxArgs
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
