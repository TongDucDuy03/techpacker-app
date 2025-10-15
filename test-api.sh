#!/bin/bash

# TechPack API Test Script
# Chạy script này để test API endpoints

echo "🧪 Testing TechPack API..."

# Base URL
BASE_URL="http://localhost:4001/api/v1"

# Test data
TEST_DATA='{
  "articleInfo": {
    "articleCode": "TEST-'$(date +%s)'",
    "productName": "Test Product",
    "supplier": "Test Supplier",
    "season": "SS25",
    "fabricDescription": "Test fabric description",
    "gender": "Unisex",
    "productClass": "Shirts"
  }
}'

echo "📡 Testing POST /techpacks (Create)..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/techpacks" \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA")

echo "Response: $CREATE_RESPONSE"

# Extract ID from response (if successful)
TECHPACK_ID=$(echo "$CREATE_RESPONSE" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TECHPACK_ID" ]; then
  echo "✅ TechPack created with ID: $TECHPACK_ID"
  
  echo "📡 Testing GET /techpacks (List)..."
  LIST_RESPONSE=$(curl -s -X GET "$BASE_URL/techpacks")
  echo "Response: $LIST_RESPONSE"
  
  echo "📡 Testing GET /techpacks/$TECHPACK_ID (Get by ID)..."
  GET_RESPONSE=$(curl -s -X GET "$BASE_URL/techpacks/$TECHPACK_ID")
  echo "Response: $GET_RESPONSE"
  
else
  echo "❌ Failed to create TechPack"
  echo "Response: $CREATE_RESPONSE"
fi

echo "🏁 Test completed!"
