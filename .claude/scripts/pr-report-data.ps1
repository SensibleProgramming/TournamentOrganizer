<#
.SYNOPSIS
  Gather all data needed for the /report AI-assisted-code report in one pass:
  merged PRs filtered to AI-assisted ones, per-PR metadata (issue ref, model,
  files changed), and story points cross-referenced from the project board.
  Replaces report.md Steps 1-4 (which made a separate `gh` call per PR for
  story points and per PR for files-changed).

.PARAMETER Since
  Only include PRs merged on/after this date (YYYY-MM-DD).

.PARAMETER Iteration
  1, 2, or 3 — filters to that iteration's date window.

.PARAMETER Model
  Substring filter on the extracted model name (e.g. "haiku").

.OUTPUTS
  JSON array of {number, mergedAt, title, url, issue, model, storyPoints, filesChanged}
#>
param(
    [string]$Since = '',
    [int]$Iteration = 0,
    [string]$Model = ''
)

$ErrorActionPreference = 'Stop'
$Repo = 'SensibleProgramming/TournamentOrganizer'
$Owner = 'SensibleProgramming'

$IterationWindows = @{
    1 = @{ Start = '2026-03-17'; End = '2026-03-30' }
    2 = @{ Start = '2026-03-31'; End = '2026-04-13' }
    3 = @{ Start = '2026-04-14'; End = '2026-04-27' }
}

# --- Fetch all merged PRs against dev ---
$prsJson = gh pr list --repo $Repo --base dev --state merged --limit 200 `
    --json number,title,body,mergedAt,url | ConvertFrom-Json

# --- Fetch the board once, build issue -> storyPoints lookup ---
$boardJson = gh project item-list 2 --owner $Owner --format json | ConvertFrom-Json
$pointsByIssue = @{}
foreach ($item in $boardJson.items) {
    if ($item.content.number) {
        $pts = $item.storyPoints
        $pointsByIssue[[int]$item.content.number] = if ($null -ne $pts) { $pts } else { '-' }
    }
}

$rows = @()

foreach ($pr in $prsJson) {
    $body = if ($pr.body) { $pr.body } else { '' }

    $isAi = $false
    if ($body -match 'Generated with \[Claude Code\]') { $isAi = $true }
    elseif ($body -match 'Co-Authored-By: Claude') { $isAi = $true }
    else {
        # Fallback: check commit messages
        $commits = gh pr view $pr.number --repo $Repo --json commits --jq '.commits[].messageBody' 2>$null
        if ($commits -match 'Co-Authored-By: Claude') { $isAi = $true }
    }
    if (-not $isAi) { continue }

    $mergedDate = ($pr.mergedAt -split 'T')[0]

    if ($Since -and ($mergedDate -lt $Since)) { continue }
    if ($Iteration -gt 0) {
        $win = $IterationWindows[$Iteration]
        if ($mergedDate -lt $win.Start -or $mergedDate -gt $win.End) { continue }
    }

    $issueMatch = [regex]::Match($body, '(?:References|Closes)\s+#(\d+)')
    $issueNumber = if ($issueMatch.Success) { [int]$issueMatch.Groups[1].Value } else { $null }
    $issueDisplay = if ($issueNumber) { "#$issueNumber" } else { '-' }

    $modelMatch = [regex]::Match($body, 'Model:\s*`([^`]+)`')
    $modelName = if ($modelMatch.Success) { $modelMatch.Groups[1].Value } else { 'claude-sonnet-4-6' }

    if ($Model -and ($modelName -notmatch [regex]::Escape($Model))) { continue }

    $storyPoints = if ($issueNumber -and $pointsByIssue.ContainsKey($issueNumber)) { $pointsByIssue[$issueNumber] } else { '-' }

    $filesChanged = gh pr view $pr.number --repo $Repo --json files --jq '.files | length'

    $rows += [PSCustomObject]@{
        number       = $pr.number
        mergedAt     = $mergedDate
        title        = $pr.title
        url          = $pr.url
        issue        = $issueDisplay
        model        = $modelName
        storyPoints  = $storyPoints
        filesChanged = [int]$filesChanged
    }
}

# Windows PowerShell 5.1's ConvertTo-Json unrolls single-element arrays to a bare
# object and mis-serializes a nested empty array as {"value":[],"Count":0} — handle
# 0/1/many explicitly instead of relying on pipeline unrolling.
if ($rows.Count -eq 0) {
    Write-Output '[]'
} elseif ($rows.Count -eq 1) {
    Write-Output ('[' + ($rows[0] | ConvertTo-Json -Depth 5) + ']')
} else {
    $rows | ConvertTo-Json -Depth 5
}
