<#
.SYNOPSIS
  Single entry point for all Tournament Organizer GitHub project board mutations.
  Replaces the copy-pasted `gh project item-edit` blocks (and their hardcoded
  field/option IDs) that used to live in implement-next.md, implement-parallel.md,
  fuzz.md, security-audit.md, scope-task.md, and done.md.

.DESCRIPTION
  All field and option IDs are looked up once here (confirmed live against
  `gh project field-list 2 --owner SensibleProgramming` on 2026-08-11) so a
  board schema change only needs to be fixed in one place.

.PARAMETER Action
  AddItem      - add an issue/PR URL to the board, prints the new item ID
  ItemForIssue - resolve and print the project item ID for a given issue number
  SetStatus    - Value one of: Brainstorming, Backlog, Ready, In Progress, In Review, Done
  SetIteration - Value one of: Iteration1, Iteration2, Iteration3
  SetPoints    - Value is a number (1,2,3,5,8,13)
  SetPriority  - Value one of: P1, P2, P3, P4 (or the full option names)

.EXAMPLE
  ./gh-board.ps1 -Action ItemForIssue -Value 42
  ./gh-board.ps1 -Action SetStatus -Item PVTI_xxx -Value "In Review"
  ./gh-board.ps1 -Action SetPoints -Item PVTI_xxx -Value 5
  ./gh-board.ps1 -Action AddItem -Value "https://github.com/SensibleProgramming/TournamentOrganizer/issues/99"
#>
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('AddItem', 'ItemForIssue', 'SetStatus', 'SetIteration', 'SetPoints', 'SetPriority')]
    [string]$Action,

    [string]$Item,

    [Parameter(Mandatory = $true)]
    [string]$Value
)

$ErrorActionPreference = 'Stop'

$Owner = 'SensibleProgramming'
$ProjectNumber = 2
$ProjectId = 'PVT_kwDOECHdcM4BSqCs'

$StatusField = 'PVTSSF_lADOECHdcM4BSqCszhAIG6Q'
$StatusOptions = @{
    'Brainstorming' = 'f9090218'
    'Backlog'       = 'f75ad846'
    'Ready'         = 'f8227f40'
    'In Progress'   = '47fc9ee4'
    'In Review'     = '2d25f841'
    'Done'          = '98236657'
}

$IterationField = 'PVTIF_lADOECHdcM4BSqCszhAIG7A'
$IterationOptions = @{
    'Iteration1' = '449f6210'
    'Iteration2' = '4ce1e9d2'
    'Iteration3' = '17db6b27'
}

$PointsField = 'PVTF_lADOECHdcM4BSqCszhAIG60'

$PriorityField = 'PVTSSF_lADOECHdcM4BSqCszhAIG64'
$PriorityOptions = @{
    'P1'          = 'f0632831'
    'P1 - Critical' = 'f0632831'
    'CRITICAL'    = 'f0632831'
    'P2'          = '9cda3662'
    'P2 - High'   = '9cda3662'
    'HIGH'        = '9cda3662'
    'P3'          = '33db6854'
    'P3 - Medium' = '33db6854'
    'MEDIUM'      = '33db6854'
    'P4'          = '60447b02'
    'P4 - Low'    = '60447b02'
    'LOW'         = '60447b02'
}

function Resolve-ItemIdForIssue([int]$IssueNumber) {
    $json = gh project item-list $ProjectNumber --owner $Owner --format json | ConvertFrom-Json
    $found = $json.items | Where-Object { $_.content.number -eq $IssueNumber } | Select-Object -First 1
    if (-not $found) {
        throw "No project item found for issue #$IssueNumber"
    }
    return $found.id
}

switch ($Action) {
    'AddItem' {
        $itemId = gh project item-add $ProjectNumber --owner $Owner --url $Value --format json --jq '.id'
        Write-Output $itemId
    }
    'ItemForIssue' {
        $itemId = Resolve-ItemIdForIssue -IssueNumber ([int]$Value)
        Write-Output $itemId
    }
    'SetStatus' {
        if (-not $Item) { throw '-Item is required for SetStatus' }
        if (-not $StatusOptions.ContainsKey($Value)) {
            throw "Unknown status '$Value'. Valid: $($StatusOptions.Keys -join ', ')"
        }
        gh project item-edit --project-id $ProjectId --id $Item --field-id $StatusField --single-select-option-id $StatusOptions[$Value] | Out-Null
        Write-Output "Status -> $Value"
    }
    'SetIteration' {
        if (-not $Item) { throw '-Item is required for SetIteration' }
        if (-not $IterationOptions.ContainsKey($Value)) {
            throw "Unknown iteration '$Value'. Valid: $($IterationOptions.Keys -join ', ')"
        }
        gh project item-edit --project-id $ProjectId --id $Item --field-id $IterationField --iteration-id $IterationOptions[$Value] | Out-Null
        Write-Output "Iteration -> $Value"
    }
    'SetPoints' {
        if (-not $Item) { throw '-Item is required for SetPoints' }
        gh project item-edit --project-id $ProjectId --id $Item --field-id $PointsField --number $Value | Out-Null
        Write-Output "Story Points -> $Value"
    }
    'SetPriority' {
        if (-not $Item) { throw '-Item is required for SetPriority' }
        if (-not $PriorityOptions.ContainsKey($Value)) {
            throw "Unknown priority '$Value'. Valid: $($PriorityOptions.Keys -join ', ')"
        }
        gh project item-edit --project-id $ProjectId --id $Item --field-id $PriorityField --single-select-option-id $PriorityOptions[$Value] | Out-Null
        Write-Output "Priority -> $Value"
    }
}
