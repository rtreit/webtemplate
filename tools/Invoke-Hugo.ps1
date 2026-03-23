# Requires Hugo Extended to be installed and available on PATH.

param(
    [Parameter(ValueFromRemainingArguments)]
    [string[]]$HugoArgs
)

$hugoCommand = Get-Command hugo -ErrorAction SilentlyContinue

if (-not $hugoCommand) {
    $rerunCommand = if ($HugoArgs.Count -gt 0) {
        ".\tools\Invoke-Hugo.ps1 " + ($HugoArgs -join " ")
    } else {
        ".\tools\Invoke-Hugo.ps1 version"
    }

    @(
        "Hugo Extended was not found on PATH."
        "Install it on Windows with:"
        "  winget install --id Hugo.Hugo.Extended --source winget"
        "After installation, restart PowerShell and rerun:"
        "  $rerunCommand"
    ) | ForEach-Object { Write-Output $_ }
    exit 1
}

$versionOutput = & $hugoCommand.Source version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to query the installed Hugo version."
    exit $LASTEXITCODE
}

if ($versionOutput -notmatch 'extended') {
    @(
        "This site requires Hugo Extended, but the installed Hugo binary does not report extended support."
        "Install or upgrade it on Windows with:"
        "  winget install --id Hugo.Hugo.Extended --source winget"
    ) | ForEach-Object { Write-Output $_ }
    exit 1
}

& $hugoCommand.Source @HugoArgs
exit $LASTEXITCODE
