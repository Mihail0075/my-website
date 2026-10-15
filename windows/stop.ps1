# Kargo Roman — го запира серверот што работи во позадина.
$conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($conn) { Stop-Process -Id $conn.OwningProcess -Force; Write-Host "Серверот е запрен." } else { Write-Host "Серверот не работи." }
