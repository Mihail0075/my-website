# Kargo Roman — го пушта серверот (ако не работи) и отвора прозорец.
param([string]$screen = "counter")
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$base = "http://localhost:3000"

function Test-Up { try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 "$base/staff/login").StatusCode -eq 200 } catch { $false } }

if (-not (Test-Up)) {
  $logDir = Join-Path $root "logs"; New-Item -ItemType Directory -Force $logDir | Out-Null
  Start-Process -WindowStyle Hidden -FilePath "cmd.exe" -ArgumentList "/c npm start > `"$logDir\server.log`" 2>&1" -WorkingDirectory $root
  for ($i = 0; $i -lt 60 -and -not (Test-Up); $i++) { Start-Sleep -Seconds 1 }
}

$paths = @{ counter = "/staff/counter"; admin = "/staff/admin"; driver = "/staff/driver"; kiosk = "/kiosk" }
$path = $paths[$screen]; if (-not $path) { $path = "/staff" }

# Edge е на секој Windows; --app отвора прозорец без адресна лента, --kiosk на цел екран.
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($edge) {
  $browserProfile = Join-Path $root "data-browser\$screen"
  $mode = if ($screen -eq "kiosk") { "--kiosk" } else { "--app" }
  $url = "$base$path"
  if ($mode -eq "--kiosk") { $args2 = @("--kiosk", $url, "--edge-kiosk-type=fullscreen") } else { $args2 = @("--app=$url") }
  Start-Process $edge -ArgumentList ($args2 + @("--user-data-dir=$browserProfile", "--no-first-run"))
} else {
  Start-Process "$base$path"
}
