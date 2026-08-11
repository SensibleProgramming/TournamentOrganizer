<#
.SYNOPSIS
  Thin wrapper around Playwright E2E tests for the Angular frontend.
  Replaces the inline `cd tournament-client && npx playwright test ...` step in e2e.md.

.PARAMETER Spec
  Optional path/pattern passed straight to `playwright test`. Omit to run the full suite.

.EXAMPLE
  ./run-e2e.ps1
  ./run-e2e.ps1 -Spec e2e/stores/store-list.spec.ts
#>
param(
    [string]$Spec = ''
)

$ErrorActionPreference = 'Continue'
$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Push-Location (Join-Path $RepoRoot 'tournament-client')
try {
    if ($Spec) {
        npx playwright test $Spec --reporter=list
    } else {
        npx playwright test --reporter=list
    }
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
