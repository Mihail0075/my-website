# Kargo Roman — инсталација на еден Windows компјутер (шалтер во Прилеп).
# Базата е вградена во апликацијата (папка data), не треба посебен сервер за база.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
Write-Host "== Карго Роман: инсталација во $root" -ForegroundColor Green

# 1) Node.js
function Get-NodeMajor { try { [int]((node --version).TrimStart("v").Split(".")[0]) } catch { 0 } }
if ((Get-NodeMajor) -lt 22) {
  Write-Host "Се инсталира Node.js (LTS)..." -ForegroundColor Yellow
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
  if ((Get-NodeMajor) -lt 22) { throw "Node.js 22+ не е пронајден. Инсталирајте го од nodejs.org и пуштете ја инсталацијата повторно." }
}
Write-Host "Node.js: $(node --version)"

# 2) Поставки (.env) — се креираат само првиот пат
if (-not (Test-Path ".env")) {
  $secret = -join ((1..48) | ForEach-Object { "{0:x}" -f (Get-Random -Maximum 16) })
  @"
DATABASE_URL=pglite:./data
SESSION_SECRET=$secret
APP_URL=http://localhost:3000
LOCKER_MODE=simulated
"@ | Set-Content -Encoding ascii ".env"
  Write-Host "Креиран е .env (база во папката data)."
}

# 3) Пакети, база, build
npm ci --no-fund --no-audit
if ($LASTEXITCODE -ne 0) { throw "npm ci не успеа." }
npm run db:migrate
if ($LASTEXITCODE -ne 0) { throw "Миграцијата не успеа." }

$env:SEED_ADMIN_PASSWORD = "Admin-demo-2026"; $env:SEED_ADMIN_PIN = "739154"
$env:SEED_COUNTER_PASSWORD = "Salter-demo-2026"
$env:SEED_DRIVER_PASSWORD = "Vozac-demo-2026"; $env:SEED_DRIVER_PIN = "482913"
npm run db:seed
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build не успеа." }

# 4) Икони на десктопот
$desktop = [Environment]::GetFolderPath("Desktop")
$shell = New-Object -ComObject WScript.Shell
$icon = Join-Path $PSScriptRoot "kargo-roman.ico"
$links = @(
  @{ Name = "Карго Роман - Шалтер"; Arg = "counter" },
  @{ Name = "Карго Роман - Админ"; Arg = "admin" },
  @{ Name = "Карго Роман - Возач"; Arg = "driver" },
  @{ Name = "Карго Роман - Киоск (демо)"; Arg = "kiosk" }
)
foreach ($l in $links) {
  $s = $shell.CreateShortcut((Join-Path $desktop "$($l.Name).lnk"))
  $s.TargetPath = Join-Path $PSScriptRoot "Start.bat"
  $s.Arguments = $l.Arg
  $s.WorkingDirectory = $root
  $s.WindowStyle = 7
  if (Test-Path $icon) { $s.IconLocation = $icon }
  $s.Save()
}

Write-Host ""
Write-Host "== Готово! На десктопот има 4 икони." -ForegroundColor Green
Write-Host "Демо-најави (сменете ги пред вистинска употреба):"
Write-Host "  admin / Admin-demo-2026          (службен PIN 739154)"
Write-Host "  salter.prilep / Salter-demo-2026"
Write-Host "  vozac / Vozac-demo-2026          (службен PIN 482913)"
