# TechPack API Test Script (PowerShell)
# Chạy script này để test API endpoints

Write-Host "🧪 Testing TechPack API..." -ForegroundColor Green

# Base URL
$BASE_URL = "http://localhost:4001/api/v1"

# Test data
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$TEST_DATA = @{
    articleInfo = @{
        articleCode = "TEST-$timestamp"
        productName = "Test Product"
        supplier = "Test Supplier"
        season = "SS25"
        fabricDescription = "Test fabric description"
        gender = "Unisex"
        productClass = "Shirts"
    }
} | ConvertTo-Json -Depth 3

Write-Host "📡 Testing POST /techpacks (Create)..." -ForegroundColor Yellow
try {
    $CREATE_RESPONSE = Invoke-RestMethod -Uri "$BASE_URL/techpacks" -Method POST -Body $TEST_DATA -ContentType "application/json"
    Write-Host "✅ TechPack created successfully!" -ForegroundColor Green
    Write-Host "Response: $($CREATE_RESPONSE | ConvertTo-Json -Depth 3)" -ForegroundColor Cyan
    
    $TECHPACK_ID = $CREATE_RESPONSE.data._id
    if ($TECHPACK_ID) {
        Write-Host "📡 Testing GET /techpacks (List)..." -ForegroundColor Yellow
        $LIST_RESPONSE = Invoke-RestMethod -Uri "$BASE_URL/techpacks" -Method GET
        Write-Host "✅ List retrieved successfully!" -ForegroundColor Green
        Write-Host "Total items: $($LIST_RESPONSE.data.Count)" -ForegroundColor Cyan
        
        Write-Host "📡 Testing GET /techpacks/$TECHPACK_ID (Get by ID)..." -ForegroundColor Yellow
        $GET_RESPONSE = Invoke-RestMethod -Uri "$BASE_URL/techpacks/$TECHPACK_ID" -Method GET
        Write-Host "✅ TechPack retrieved by ID!" -ForegroundColor Green
        Write-Host "Product Name: $($GET_RESPONSE.data.productName)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "Make sure the server is running on port 4001" -ForegroundColor Yellow
}

Write-Host "🏁 Test completed!" -ForegroundColor Green

