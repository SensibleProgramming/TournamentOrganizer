<#
.SYNOPSIS
  Build both the .NET backend and Angular frontend, print a condensed error/warning
  summary, and exit non-zero if either build fails. Replaces the manual "run dotnet
  build, run ng build, summarize" steps duplicated across build.md, implement-next.md
  Step 5, and refactor-angular.md Step 5.

.OUTPUTS
  Prints "BACKEND: OK" / "BACKEND: FAILED" and "FRONTEND: OK" / "FRONTEND: FAILED",
  followed by any error/warning lines. Exit code 0 only if both succeeded.
#>
$ErrorActionPreference = 'Continue'
$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

$overallExit = 0

Write-Output '--- Backend: dotnet build ---'
Push-Location (Join-Path $RepoRoot 'src\TournamentOrganizer.Api')
$backendOutput = dotnet build | Out-String
$backendExit = $LASTEXITCODE
Pop-Location

if ($backendExit -eq 0) {
    Write-Output 'BACKEND: OK'
} else {
    Write-Output 'BACKEND: FAILED'
    $overallExit = 1
}
$backendOutput -split "`n" | Where-Object { $_ -match 'error|warning' } | ForEach-Object { Write-Output $_.Trim() }

Write-Output ''
Write-Output '--- Frontend: ng build ---'
Push-Location (Join-Path $RepoRoot 'tournament-client')
$frontendOutput = npx ng build | Out-String
$frontendExit = $LASTEXITCODE
Pop-Location

if ($frontendExit -eq 0) {
    Write-Output 'FRONTEND: OK'
} else {
    Write-Output 'FRONTEND: FAILED'
    $overallExit = 1
}
$frontendOutput -split "`n" | Where-Object { $_ -match 'ERROR|WARNING' } | ForEach-Object { Write-Output $_.Trim() }

exit $overallExit
