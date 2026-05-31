# Kill any process using port 8080 before starting
$pid8080 = (netstat -ano | findstr ":8080" | findstr "LISTENING" | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -First 1)
if ($pid8080) {
    Write-Host "Killing process on port 8080 (PID $pid8080)..."
    taskkill /PID $pid8080 /F | Out-Null
    Start-Sleep -Seconds 1
}

Write-Host "Starting hotel-backend..."
.\mvnw.cmd spring-boot:run
