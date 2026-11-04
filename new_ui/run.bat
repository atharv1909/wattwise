@echo off
set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
cd /d "%~dp0"
echo Starting WattWise Telemetry Service (:3003)...
start "WattWise Telemetry (:3003)" cmd /k "cd mini-services\telemetry && bun run dev"
echo Starting WattWise Next.js Web App (:3000)...
bun run dev

