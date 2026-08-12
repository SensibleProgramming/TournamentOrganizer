<#
.SYNOPSIS
  Create a single GitHub finding issue, add it to the project board, set Status=Backlog
  and Priority. Replaces the ~80-line duplicated per-finding agent prompt template that
  used to live inline in fuzz.md Phase 5 and security-audit.md Phase 6.

.PARAMETER Severity
  CRITICAL | HIGH | MEDIUM | LOW

.PARAMETER Prefix
  Issue title prefix, e.g. "[Security]" or "[Fuzz]"

.PARAMETER Title
  Short finding title (goes after the prefix+severity tag)

.PARAMETER BodyFile
  Path to a markdown file containing the full issue body (summary, location,
  reproduction, suggested fix, etc. — the caller composes this content since it
  is finding-specific; this script only handles the mechanical filing part)

.PARAMETER ExtraLabels
  Additional labels beyond the severity-derived type/priority pair, e.g. @('security')
  for security-flavored findings (fuzz/security-audit/fuzz-angular). Defaults to
  @('security') to match those three callers' existing behavior. Pass @() explicitly
  for non-security findings (e.g. a zone-check or test-flakiness issue).

.OUTPUTS
  Prints "#<N> | <SEVERITY> | <title>" on success.

.EXAMPLE
  ./gh-issue-file.ps1 -Severity HIGH -Prefix "[Fuzz]" -Title "500 on POST /api/players with null email" -BodyFile ./finding-body.md
  ./gh-issue-file.ps1 -Severity MEDIUM -Prefix "[Zone]" -Title "Missing detectChanges in ngOnInit" -BodyFile ./finding-body.md -ExtraLabels @()
#>
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')]
    [string]$Severity,

    [Parameter(Mandatory = $true)]
    [string]$Prefix,

    [Parameter(Mandatory = $true)]
    [string]$Title,

    [Parameter(Mandatory = $true)]
    [string]$BodyFile,

    [string[]]$ExtraLabels = @('security')
)

$ErrorActionPreference = 'Stop'

$Repo = 'SensibleProgramming/TournamentOrganizer'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$GhBoard = Join-Path $ScriptDir 'gh-board.ps1'

if (-not (Test-Path $BodyFile)) {
    throw "Body file not found: $BodyFile"
}

$LabelMap = @{
    'CRITICAL' = @('type: bug', 'priority: P1')
    'HIGH'     = @('type: bug', 'priority: P2')
    'MEDIUM'   = @('type: chore', 'priority: P3')
    'LOW'      = @('type: chore', 'priority: P4')
}
$labels = $LabelMap[$Severity]

$issueTitle = "$Prefix[$Severity] $Title"

$labelArgs = @()
foreach ($l in $ExtraLabels + $labels) { $labelArgs += @('--label', $l) }

$issueUrl = gh issue create --repo $Repo --title $issueTitle --body-file $BodyFile @labelArgs
if ($LASTEXITCODE -ne 0) { throw "gh issue create failed" }

$issueNumber = ($issueUrl -split '/')[-1]

$itemId = & $GhBoard -Action AddItem -Value $issueUrl
& $GhBoard -Action SetStatus -Item $itemId -Value 'Backlog' | Out-Null
& $GhBoard -Action SetPriority -Item $itemId -Value $Severity | Out-Null

Write-Output "#$issueNumber | $Severity | $Title"
