# PowerShell script to restart server with clean cache
Write-Host "🔄 Restarting server with clean cache..."

# Stop any running node processes
Write-Host "Stopping any running node processes..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Clear TypeScript cache
Write-Host "Clearing TypeScript cache..."
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
}
if (Test-Path ".tsbuildinfo") {
    Remove-Item -Force ".tsbuildinfo" -ErrorAction SilentlyContinue
}

# Clear any compiled dist folder
if (Test-Path "dist") {
    Write-Host "Clearing dist folder..."
    Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
}

Write-Host "✅ Cache cleared. Starting server..."
Write-Host ""
Write-Host "Now run: npm run dev"
Write-Host ""


