# Usage: .\test-webhook.ps1 [-Secret <secret>] [-Url <url>]
param(
    [string]$Secret = "secret",
    [string]$Url = "http://localhost:3001/webhook"
)

function Send-Webhook {
    param([string]$Payload, [string]$Description)

    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($Secret)
    $sig = "sha256=" + ([System.BitConverter]::ToString(
        $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Payload))
    )).Replace("-", "").ToLower()

    Write-Host "`n--- $Description ---" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri $Url -Method POST -UseBasicParsing `
            -Headers @{ "Content-Type" = "application/json"; "X-Hub-Signature-256" = $sig } `
            -Body $Payload
        Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "Body:   $($response.Content)"
    } catch {
        Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        Write-Host "Body:   $($_.ErrorDetails.Message)"
    }
}

# 1. Valid Ready payload → 202 Accepted
$readyPayload = '{"action":"edited","projects_v2_item":{"node_id":"PVTI_test"},"changes":{"field_value":{"field_name":"Status","to":{"name":"Ready"}}}}'
Send-Webhook -Payload $readyPayload -Description "Valid Ready payload (expect 202)"

# 2. Invalid signature → 401
Write-Host "`n--- Invalid signature (expect 401) ---" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri $Url -Method POST -UseBasicParsing `
        -Headers @{ "Content-Type" = "application/json"; "X-Hub-Signature-256" = "sha256=badhash" } `
        -Body $readyPayload
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Body:   $($response.Content)"
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Body:   $($_.ErrorDetails.Message)"
}

# 3. Non-Ready status → 200 ignored
$ignoredPayload = '{"action":"edited","projects_v2_item":{"node_id":"PVTI_test"},"changes":{"field_value":{"field_name":"Status","to":{"name":"In Progress"}}}}'
Send-Webhook -Payload $ignoredPayload -Description "Non-Ready status (expect 200 ignored)"
