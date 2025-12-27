# PDF Size Optimization - Giảm Dung Lượng File PDF

## Tổng Quan

Đã thực hiện tối ưu hóa để giảm dung lượng file PDF export từ **35MB xuống mục tiêu <10MB** (tối ưu nhất là ~3MB).

## Các Thay Đổi Đã Thực Hiện

### 1. Image Compression Utility (`server/src/utils/image-compression.util.ts`)

- **Tạo utility mới** để nén ảnh sử dụng `sharp`
- **Tính năng:**
  - Tự động resize ảnh về kích thước tối đa (mặc định: 1200x800px)
  - Nén JPEG với quality 65% (giảm từ 90%)
  - Hỗ trợ batch compression với concurrency limit
  - Convert sang base64 data URI để embed trực tiếp vào PDF
  - Xử lý cả data URI, URL, và local file paths

### 2. PDF Service Updates (`server/src/services/pdf.service.ts`)

- **Thêm image compression vào quá trình tạo PDF:**
  - `prepareImageUrlCompressed()`: Method mới để nén ảnh trước khi embed
  - Cập nhật `prepareBOMDataOptimized()`: Nén tất cả BOM images (800x600px, quality 65%)
  - Cập nhật `prepareHowToMeasureOptimized()`: Nén construction images (1000x700px)
  - Cập nhật `prepareColorwaysOptimized()`: Nén colorway images (1000x700px)
  - Cập nhật `prepareTechPackDataAsync()`: Nén logo (400x200px) và cover image (1200x800px)

- **Thêm Puppeteer page evaluation:**
  - Compress thêm các ảnh còn sót trong page bằng Canvas API
  - Fallback mechanism cho các ảnh chưa được compress

### 3. Controller Updates (`server/src/controllers/techpack.controller.ts`)

- **Giảm image quality:**
  - Từ `imageQuality: 90` → `imageQuality: 65`
  - Thêm `imageMaxWidth: 1200` và `imageMaxHeight: 800`

### 4. Template CSS Updates (`server/src/templates/techpack-full-template.ejs`)

- **Thêm CSS constraints để giới hạn kích thước ảnh:**
  - Global: `max-width: 1200px, max-height: 800px`
  - Logo/Header: `max-width: 400px, max-height: 200px`
  - BOM thumbnails: `max-width: 800px, max-height: 600px`
  - How to measure: `max-width: 1000px, max-height: 700px`
  - Colorway: `max-width: 1000px, max-height: 700px`

## Kết Quả Mong Đợi

### Trước khi tối ưu:
- **File size:** ~35MB cho 9 trang với nhiều ảnh
- **Image quality:** 90%
- **Image dimensions:** Không giới hạn

### Sau khi tối ưu:
- **File size:** Mục tiêu **<10MB** (tối ưu nhất ~3MB)
- **Image quality:** 65% (vẫn đủ rõ cho PDF)
- **Image dimensions:** 
  - Logo: 400x200px
  - BOM thumbnails: 800x600px
  - Main images: 1200x800px
  - Cover/Design sketch: 1200x800px

## Cách Sử Dụng

### Mặc định (đã được cấu hình):
```typescript
const pdfOptions = {
  imageQuality: 65,        // Quality 65% (tốt cho PDF)
  imageMaxWidth: 1200,     // Max width
  imageMaxHeight: 800,     // Max height
};
```

### Tùy chỉnh (nếu cần):
```typescript
const pdfOptions = {
  imageQuality: 60,        // Thấp hơn = file nhỏ hơn nhưng chất lượng kém hơn
  imageMaxWidth: 1000,     // Nhỏ hơn = file nhỏ hơn
  imageMaxHeight: 700,
};
```

## Lưu Ý

1. **Chất lượng ảnh:** Quality 65% vẫn đủ rõ cho PDF, nhưng nếu cần chất lượng cao hơn có thể tăng lên 70-75%
2. **Kích thước ảnh:** Các giới hạn hiện tại phù hợp với A4 landscape (1050px width at 96dpi)
3. **Performance:** Image compression chạy song song (batch) để tối ưu thời gian
4. **Fallback:** Nếu compression thất bại, hệ thống sẽ sử dụng ảnh gốc

## Testing

Để test kết quả:
1. Export một techpack có nhiều ảnh (9+ trang)
2. Kiểm tra file size - nên giảm từ ~35MB xuống <10MB
3. Kiểm tra chất lượng ảnh - vẫn đủ rõ để đọc và in

## Tùy Chỉnh Thêm (Nếu Cần)

Nếu vẫn cần giảm thêm dung lượng:

1. **Giảm quality xuống 55-60%:**
   ```typescript
   imageQuality: 55
   ```

2. **Giảm kích thước ảnh:**
   ```typescript
   imageMaxWidth: 1000,
   imageMaxHeight: 700,
   ```

3. **Bỏ một số ảnh không cần thiết** trong template (nếu có)

4. **Sử dụng WebP format** thay vì JPEG (cần update code)




