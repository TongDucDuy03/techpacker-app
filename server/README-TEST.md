# TechPack CRUD Test Script

## Prerequisites

1. **Install axios** (if not already installed):
   ```bash
   cd server
   npm install axios
   ```

2. **Start the server**:
   ```bash
   npm run dev
   ```
   Server should be running on `http://localhost:5000`

3. **Create a test user** (if not exists):
   - Email: `test@techpacker.com`
   - Password: `password123`
   - Role: `designer` or `admin`
   
   Or use custom credentials:
   ```bash
   TEST_EMAIL=your@email.com TEST_PASSWORD=yourpassword node test-crud.js
   ```

## Running the Test

### Basic Usage:
```bash
cd server
node test-crud.js
```

### With Custom API URL:
```bash
API_URL=http://localhost:5000/api/v1 node test-crud.js
```

## What the Test Does

The test script performs the following operations:

1. **Login** - Authenticates with test credentials
2. **CREATE** - Creates a new TechPack with:
   - All Article Info fields (supplier, productClass, brand, collection, targetMarket, pricePoint, etc.)
   - BOM items
   - Measurements
   - Colorways
   - HowToMeasure instructions
3. **READ** - Retrieves the created TechPack and verifies all fields are saved
4. **LIST** - Lists all TechPacks and verifies the new one appears
5. **UPDATE** - Updates the TechPack with new values and adds a BOM item
6. **DELETE** - Deletes the TechPack

## Expected Output

```
🚀 Starting TechPack CRUD Tests...
📍 API URL: http://localhost:5000/api/v1

🔐 Step 1: Login...
✅ Login successful
✅ User ID: 507f1f77bcf86cd799439011

📝 Step 2: CREATE TechPack...
✅ TechPack created successfully
   ID: 507f1f77bcf86cd799439012
   Product Name: Test Product CRUD
   Article Code: TEST-CRUD-1234567890
   Supplier: Test Supplier
   Category: Shirts
   Gender: Unisex
   Brand: Test Brand
   Collection: Test Collection
   BOM Items: 1
   Measurements: 1
   Colorways: 1

📖 Step 3: READ TechPack...
✅ TechPack retrieved successfully
✅ All fields saved correctly!

📋 Step 4: LIST TechPacks...
✅ TechPacks listed successfully

✏️  Step 5: UPDATE TechPack...
✅ TechPack updated successfully
✅ All updates saved correctly!

🗑️  Step 6: DELETE TechPack...
✅ TechPack deleted successfully

==================================================
📊 TEST SUMMARY
==================================================
Login:        ✅ PASS
Create:       ✅ PASS
Read:         ✅ PASS
List:         ✅ PASS
Update:       ✅ PASS
Delete:       ✅ PASS
==================================================

Result: 6/6 tests passed
🎉 All tests passed!
```

## Troubleshooting

### "axios is not installed"
```bash
npm install axios
```

### "Login failed"
- Check if test user exists
- Verify email/password are correct
- Check server is running

### "Create failed: Validation failed"
- Check server logs for specific validation errors
- Verify all required fields are being sent

### "Fields not saved"
- Check server logs
- Verify the fields are in the request body
- Check database to see what was actually saved

## Customizing Test Data

Edit `test-crud.js` and modify the `testTechPack` object to test with different data.

