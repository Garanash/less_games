param(
    [switch]$Docker
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$DockerBin = "C:\Program Files\Docker\Docker\resources\bin"

if (Test-Path $DockerBin) {
    $env:Path += ";$DockerBin"
}

function Test-PortListening($Port) {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

Set-Location $Root

if ($Docker) {
    Write-Host "Starting via Docker Compose..." -ForegroundColor Cyan
    docker compose up --build
    exit $LASTEXITCODE
}

if (-not (Test-Path "$Root\.env")) {
    Copy-Item "$Root\.env.example" "$Root\.env"
}

if (-not (Test-Path "$Root\backend\.env")) {
    Copy-Item "$Root\.env" "$Root\backend\.env"
}

Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Set-Location "$Root\backend"
if (-not (Test-Path ".venv")) {
    python -m venv .venv
}
& .\.venv\Scripts\pip install -r requirements.txt -q -i https://pypi.org/simple

Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location "$Root\frontend"
if (-not (Test-Path "node_modules")) {
    npm install
}

Write-Host "Building frontend..." -ForegroundColor Cyan
npm run build

if (Test-PortListening 8000) {
    Write-Host "Port 8000 already in use - backend may already be running" -ForegroundColor Yellow
} else {
    Write-Host "Starting backend on http://localhost:8000" -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\backend'; .\.venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    Start-Sleep -Seconds 3
}

if (Test-PortListening 3000) {
    Write-Host "Restarting frontend (port 3000 was in use — stale chunks otherwise)" -ForegroundColor Yellow
    $frontendPid = (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue).OwningProcess
    if ($frontendPid) {
        Stop-Process -Id $frontendPid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

if (-not (Test-PortListening 3000)) {
    Write-Host "Starting frontend on http://localhost:3000" -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\frontend'; npm run start"
}

Write-Host ""
Write-Host "Less Game Editor is starting!" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000"
Write-Host "  Backend:  http://localhost:8000"
Write-Host "  Demo login: demo@example.com / demo12345"
Write-Host ""
Write-Host "For Docker mode run: .\start.ps1 -Docker"
