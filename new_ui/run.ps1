$env:PATH = "$env:USERPROFILE\.bun\bin;$env:PATH"
$root = $PSScriptRoot

Write-Host "Starting WattWise Telemetry Service on :3003..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PATH = '$env:USERPROFILE\.bun\bin;' + `$env:PATH; cd '$root\mini-services\telemetry'; bun run dev"

Write-Host "Starting WattWise Next.js Web App on http://localhost:3000..." -ForegroundColor Green
cd $root
bun run dev

