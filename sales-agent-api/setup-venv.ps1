# Satış asistanı — venv + pip (Windows)
Set-Location $PSScriptRoot
$ErrorActionPreference = 'Stop'

Write-Host '[1/3] Sanal ortam oluşturuluyor...' -ForegroundColor Cyan

function Test-Cmd($name) { Get-Command $name -ErrorAction SilentlyContinue }

if (Test-Cmd py) {
    & py -3 -m venv .venv
} elseif (Test-Cmd python) {
    & python -m venv .venv
} else {
    Write-Host ''
    Write-Host "Python bulunamadı. https://www.python.org/downloads/ — kurarken 'Add python.exe to PATH' işaretleyin." -ForegroundColor Red
    exit 1
}

Write-Host '[2/3] pip ve paketler...' -ForegroundColor Cyan
& .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt

Write-Host '[3/3] Tamam.' -ForegroundColor Green
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host '.env oluşturuldu — OPENAI_API_KEY ekleyin.' -ForegroundColor Yellow
}
Write-Host 'Çalıştırma: cd ..\..  ;  npm run sales-agent'
