# Test TechPacker Fixes (PowerShell)
# Script để test các sửa đổi cho authentication và navigation

Write-Host "🧪 Testing TechPacker Fixes..." -ForegroundColor Green

$BASE_URL = "http://localhost:4001/api/v1"

# Test 1: Test POST request (should not return 401)
Write-Host "`n📡 Test 1: POST /techpacks (should not return 401)" -ForegroundColor Yellow
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$TEST_DATA = @{
    articleInfo = @{
        articleCode = "FIX-TEST-$timestamp"
        productName = "Fix Test Product"
        supplier = "Fix Test Supplier"
        season = "SS25"
        fabricDescription = "Fix test fabric description"
        gender = "Unisex"
        productClass = "Shirts"
    }
} | ConvertTo-Json -Depth 3

try {
    $CREATE_RESPONSE = Invoke-RestMethod -Uri "$BASE_URL/techpacks" -Method POST -Body $TEST_DATA -ContentType "application/json"
    Write-Host "✅ POST request successful! No 401 error." -ForegroundColor Green
    Write-Host "Created TechPack ID: $($CREATE_RESPONSE.data._id)" -ForegroundColor Cyan
    
    # Test 2: Test GET request
    Write-Host "`n📡 Test 2: GET /techpacks (should return list)" -ForegroundColor Yellow
    $LIST_RESPONSE = Invoke-RestMethod -Uri "$BASE_URL/techpacks" -Method GET
    Write-Host "✅ GET request successful!" -ForegroundColor Green
    Write-Host "Total TechPacks: $($LIST_RESPONSE.data.Count)" -ForegroundColor Cyan
    
    # Test 3: Verify our created item is in the list
    $ourItem = $LIST_RESPONSE.data | Where-Object { $_.articleCode -eq "FIX-TEST-$timestamp" }
    if ($ourItem) {
        Write-Host "✅ Our created TechPack found in list!" -ForegroundColor Green
        Write-Host "Product Name: $($ourItem.productName)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Our created TechPack not found in list" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "🚨 401 Unauthorized error still exists!" -ForegroundColor Red
        Write-Host "Make sure authentication middleware is removed from routes" -ForegroundColor Yellow
    }
}

# Test 4: Test frontend navigation (manual check)
Write-Host "`n🌐 Test 4: Frontend Navigation Test" -ForegroundColor Yellow
Write-Host "Please manually test:" -ForegroundColor Cyan
Write-Host "1. Open http://localhost:5173 in browser" -ForegroundColor White
Write-Host "2. Click 'Create New' button" -ForegroundColor White
Write-Host "3. Fill in Article Info form" -ForegroundColor White
Write-Host "4. Click 'Save' button" -ForegroundColor White
Write-Host "5. Check console for 'TechPack created successfully'" -ForegroundColor White
Write-Host "6. Click 'Back to List' button" -ForegroundColor White
Write-Host "7. Verify navigation works and item appears in list" -ForegroundColor White

Write-Host "`n🏁 Test completed!" -ForegroundColor Green
Write-Host "If all tests pass, both issues should be resolved!" -ForegroundColor Green

