# Test TechPack Flow - Hướng dẫn kiểm tra

## Các vấn đề đã được sửa:

### 1. ✅ Save Function không lưu dữ liệu
- **Vấn đề**: Hàm `saveTechPack` trong TechPackContext chỉ là simulation
- **Giải pháp**: Cập nhật để gọi API thực sự (createTechPack hoặc updateTechPack)
- **File đã sửa**: `src/contexts/TechPackContext.tsx`

### 2. ✅ TechPackList không load dữ liệu
- **Vấn đề**: Type mismatch giữa frontend và backend
- **Giải pháp**: Cập nhật API client để sử dụng `ApiTechPack` type
- **File đã sửa**: `src/lib/api.ts`

### 3. ✅ Backend routes thiếu authentication
- **Vấn đề**: Route POST `/api/techpacks` thiếu middleware `requireAuth`
- **Giải pháp**: Thêm `requireAuth` middleware
- **File đã sửa**: `server/src/routes/techpack.routes.ts`

### 4. ✅ Data mapping không đúng
- **Vấn đề**: Backend controller không map đúng dữ liệu từ frontend
- **Giải pháp**: Cập nhật controller để map `articleInfo` và các fields khác
- **File đã sửa**: `server/src/controllers/techpack.controller.ts`

### 5. ✅ Validation rules không phù hợp
- **Vấn đề**: Validation rules không match với cấu trúc dữ liệu mới
- **Giải pháp**: Cập nhật validation để hỗ trợ cả `articleInfo.*` và direct fields
- **File đã sửa**: `server/src/routes/techpack.routes.ts`

## Cách test toàn bộ flow:

### Bước 1: Khởi động backend
```bash
cd server
npm run dev
```

### Bước 2: Khởi động frontend
```bash
npm run dev
```

### Bước 3: Test Save Function
1. Mở ứng dụng trong browser
2. Click "Create New" để tạo tech pack mới
3. Điền thông tin trong tab "Article Info":
   - Article Code: `TEST-001-SS25`
   - Product Name: `Test Product`
   - Supplier: `Test Supplier`
   - Season: `SS25`
   - Fabric Description: `Test fabric`
4. Click "Save" button
5. Kiểm tra console để xem API call thành công
6. Kiểm tra database để xem record được tạo

### Bước 4: Test List Loading
1. Click "Back to List"
2. Kiểm tra xem tech pack vừa tạo có xuất hiện trong danh sách
3. Kiểm tra stats (Total Tech Packs, Draft count, etc.)

### Bước 5: Test Update Function
1. Click vào tech pack trong list để edit
2. Thay đổi một số thông tin
3. Click "Save"
4. Kiểm tra xem thay đổi được lưu

## Kiểm tra Database:

### MongoDB
```javascript
// Kết nối MongoDB và kiểm tra
use techpacker_app
db.techpacks.find().pretty()
```

### Hoặc sử dụng MongoDB Compass
- Kết nối đến `mongodb://127.0.0.1:27017`
- Chọn database `techpacker_app`
- Xem collection `techpacks`

## Kiểm tra API trực tiếp:

### Test POST (Create)
```bash
curl -X POST http://localhost:4001/api/v1/techpacks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "articleInfo": {
      "articleCode": "TEST-002-SS25",
      "productName": "Test Product 2",
      "supplier": "Test Supplier",
      "season": "SS25",
      "fabricDescription": "Test fabric description"
    }
  }'
```

### Test GET (List)
```bash
curl -X GET http://localhost:4001/api/v1/techpacks \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting:

### Nếu vẫn có lỗi:
1. Kiểm tra console browser để xem lỗi frontend
2. Kiểm tra console server để xem lỗi backend
3. Kiểm tra network tab để xem API calls
4. Kiểm tra database connection

### Common Issues:
- **401 Unauthorized**: Kiểm tra authentication token
- **400 Bad Request**: Kiểm tra validation rules
- **500 Internal Server Error**: Kiểm tra database connection và server logs

