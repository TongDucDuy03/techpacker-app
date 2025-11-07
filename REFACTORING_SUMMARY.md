# Tóm tắt Refactoring TechPack Data Flow

## ✅ Đã hoàn thành

### 1. Refactor BOM: ID-based operations
- ✅ Thêm `updateBomItemById` và `deleteBomItemById` vào TechPackContext
- ✅ Cập nhật BomTab để sử dụng ID-based operations
- ✅ Giữ lại index-based methods để backward compatibility

### 2. Refactor Colorways: ID-based operations  
- ✅ Thêm `updateColorwayById` và `deleteColorwayById` vào TechPackContext
- ⏳ Cần cập nhật ColorwayTab để sử dụng ID-based operations

## 🔄 Đang thực hiện

### 3. Refactor Measurements: ID-based operations
- ⏳ Cần thêm `updateMeasurementById` và `deleteMeasurementById`
- ⏳ Cập nhật MeasurementTab để sử dụng ID-based operations

## 📋 Cần thực hiện tiếp

### 4. Sửa Construction: Loại bỏ hack videoUrl
**Vấn đề hiện tại:**
- `status` và `comments` được encode vào `videoUrl` dưới dạng JSON string
- Code: `__METADATA__${JSON.stringify({status, comments, originalVideoUrl})}`

**Giải pháp:**
1. Thêm trường `status` và `comments` vào `HowToMeasure` interface
2. Cập nhật backend model để có các trường này
3. Sửa ConstructionTab để không encode/decode metadata
4. Migration script để chuyển đổi dữ liệu cũ

**Files cần sửa:**
- `src/types/techpack.ts` - Thêm fields vào HowToMeasure
- `src/components/TechPackForm/tabs/ConstructionTab.tsx` - Loại bỏ encode/decode
- `server/src/models/techpack.model.ts` - Thêm fields vào schema

### 5. Đồng bộ Validation Schema FE-BE
**Cần kiểm tra:**
- `bomItemValidationSchema` trong FE có match với backend validation không?
- `measurementValidationSchema` có đầy đủ rules không?
- Backend có validation middleware cho các endpoints không?

**Files cần kiểm tra:**
- `src/utils/validationSchemas.ts`
- `server/src/validation/techpack.validation.ts`
- `server/src/routes/subdocument.routes.ts`

### 6. Kiểm tra Upload Endpoint
**Cần kiểm tra:**
- Endpoint `/api/techpacks/upload-sketch` có tồn tại không?
- Nếu chưa có, tạo endpoint nhận `multipart/form-data`
- Trả về `{ success: true, data: { url: string } }`

**Files cần kiểm tra/tạo:**
- `server/src/routes/techpack.routes.ts`
- `server/src/controllers/techpack.controller.ts`
- Có thể cần middleware `multer` hoặc `formidable`

### 7. Sửa Lint/TypeScript Warnings
**Cần kiểm tra:**
- Unused imports
- Implicit `any` types
- Type mismatches
- Missing type definitions

**Command để check:**
```bash
npm run lint
npm run type-check
```

## 📝 Notes

### Colorways và Revision Flow
- Colorways hiện đã nằm trong `state.techpack.colorways`
- Khi `saveTechPack()` được gọi, colorways sẽ được lưu cùng với BOM, Measurements
- Revision sẽ được tạo tự động khi có thay đổi
- ✅ Không cần thay đổi gì thêm về revision flow cho Colorways

### Backward Compatibility
- Tất cả các hàm index-based vẫn được giữ lại
- Các tab có thể dần migrate sang ID-based
- Không breaking changes

## 🎯 Priority Order

1. ✅ BOM ID-based (Done)
2. ⏳ Measurements ID-based (In Progress)
3. ⏳ Colorways ID-based (Next)
4. 🔴 Construction hack removal (High Priority - Data integrity)
5. 🔴 Validation sync (High Priority - Data quality)
6. 🟡 Upload endpoint (Medium Priority)
7. 🟢 Lint warnings (Low Priority - Code quality)

