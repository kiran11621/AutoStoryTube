$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host "Starting AutoStoryTube..." -ForegroundColor Cyan

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  Write-Warning "FFmpeg not found. Please install FFmpeg and ensure it is on your PATH."
  Write-Host "Windows install options:" -ForegroundColor Yellow
  Write-Host "  - winget install Gyan.FFmpeg" -ForegroundColor Yellow
  Write-Host "  - choco install ffmpeg" -ForegroundColor Yellow
  exit 1
}

if (-not (Test-Path ".venv")) {
  python -m venv .venv
}

& .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

New-Item -ItemType Directory -Force -Path data/uploads, data/outputs, data/credentials | Out-Null

$env:PYTHONPATH = $ProjectRoot

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
