# Пересборка и перезапуск фронтенда (устраняет ошибки Failed to load chunk)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
    Write-Host "Stopping process on port 3000 (PID $($conn.OwningProcess))..." -ForegroundColor Yellow
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
}

Write-Host "Building..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Starting http://localhost:3000" -ForegroundColor Green
npm run start
