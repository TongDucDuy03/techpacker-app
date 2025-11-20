# Hệ Thống Upload và Lưu Trữ Ảnh trong TechPacker

## Tổng Quan

Hệ thống TechPacker có nhiều trường ảnh khác nhau, mỗi trường có endpoint upload riêng để tránh conflict và dễ quản lý.

## Các Trường Ảnh Trong Hệ Thống

### 1. **Article Info - Design Sketch** 
- **Trường dữ liệu**: `articleInfo.designSketchUrl`
- **Endpoint**: `POST /api/v1/techpacks/upload-sketch`
- **Field name**: `designSketch`
- **Mục đích**: Ảnh phác thảo thiết kế sản phẩm
- **Vị trí**: Tab "Article Info"
- **Bắt buộc**: Có (khi lifecycleStage là 'Concept' hoặc 'Design')
- **File location**: `server/uploads/designSketch-{timestamp}-{random}.{ext}`

### 2. **Article Info - Company Logo** 
- **Trường dữ liệu**: `articleInfo.companyLogoUrl`
- **Endpoint**: `POST /api/v1/techpacks/upload-company-logo`
- **Field name**: `companyLogo`
- **Mục đích**: Logo thương hiệu hiển thị trên cover và header của mọi trang PDF
- **Vị trí**: Tab "Article Info"
- **Bắt buộc**: Không (khuyến khích để nhận diện thương hiệu)
- **File location**: `server/uploads/companyLogo-{timestamp}-{random}.{ext}`

### 3. **Colorway - Main Image**
- **Trường dữ liệu**: `colorway.imageUrl`
- **Endpoint**: `POST /api/v1/techpacks/upload-colorway-image`
- **Field name**: `colorwayImage`
- **Mục đích**: Ảnh đại diện cho colorway (màu sắc của sản phẩm)
- **Vị trí**: Tab "Colorways"
- **Bắt buộc**: Không
- **File location**: `server/uploads/colorwayImage-{timestamp}-{random}.{ext}`

### 4. **Colorway Part - Part Image**
- **Trường dữ liệu**: `colorway.parts[].imageUrl`
- **Endpoint**: Có thể dùng chung với colorway hoặc endpoint riêng (hiện tại chưa có endpoint riêng)
- **Field name**: (chưa có upload riêng, có thể nhập URL trực tiếp)
- **Mục đích**: Ảnh của từng phần cụ thể trong colorway (ví dụ: ảnh màu của cổ áo, tay áo)
- **Vị trí**: Tab "Colorways" > Colorway Parts
- **Bắt buộc**: Không

### 5. **Construction - How to Measure Image**
- **Trường dữ liệu**: `howToMeasure[].imageUrl`
- **Endpoint**: `POST /api/v1/techpacks/upload-construction-image`
- **Field name**: `constructionImage`
- **Mục đích**: Ảnh minh họa cách đo cho từng điểm đo (POM)
- **Vị trí**: Tab "Construction" hoặc "How to Measure"
- **Bắt buộc**: Không
- **File location**: `server/uploads/constructionImage-{timestamp}-{random}.{ext}`

### 6. **How to Measure Tab - Image**
- **Trường dữ liệu**: `howToMeasure[].imageUrl`
- **Endpoint**: Hiện tại dùng FileReader (base64), chưa upload lên server
- **Mục đích**: Ảnh hướng dẫn cách đo
- **Vị trí**: Tab "How to Measure"
- **Bắt buộc**: Không
- **Lưu ý**: Hiện tại lưu dưới dạng base64 data URL, nên chuyển sang upload lên server

## Cơ Chế Upload và Lưu Trữ

### Backend Upload Middleware
- **File**: `server/src/middleware/upload.middleware.ts`
- **Storage**: Multer disk storage
- **Thư mục lưu**: `server/uploads/`
- **Tên file**: `{fieldname}-{timestamp}-{random}.{ext}`
- **Giới hạn kích thước**: 5MB
- **Định dạng cho phép**: JPEG, JPG, PNG, GIF, SVG

### Static File Serving
- **Route**: `/uploads/*`
- **Cấu hình**: `app.use('/uploads', express.static(path.join(__dirname, '../uploads')))`
- **URL format**: `/uploads/{filename}`

### Frontend API Client
- **Base URL**: Tự động detect từ hostname
- **Timeout**: 30 giây (đã tăng từ 10s)
- **Content-Type**: `multipart/form-data` cho upload

## Các Endpoint Upload

### 1. Upload Design Sketch (Article Info)
```javascript
POST /api/v1/techpacks/upload-sketch
Content-Type: multipart/form-data
Body: {
  designSketch: File
}
Response: {
  success: true,
  data: {
    url: "/uploads/designSketch-1234567890-987654321.jpg"
  }
}
```

### 2. Upload Company Logo (Article Info)
```javascript
POST /api/v1/techpacks/upload-company-logo
Content-Type: multipart/form-data
Body: {
  companyLogo: File
}
Response: {
  success: true,
  data: {
    url: "/uploads/companyLogo-1234567890-987654321.jpg"
  }
}
```

### 3. Upload Colorway Image
```javascript
POST /api/v1/techpacks/upload-colorway-image
Content-Type: multipart/form-data
Body: {
  colorwayImage: File
}
Response: {
  success: true,
  data: {
    url: "/uploads/colorwayImage-1234567890-987654321.jpg"
  }
}
```

### 4. Upload Construction Image
```javascript
POST /api/v1/techpacks/upload-construction-image
Content-Type: multipart/form-data
Body: {
  constructionImage: File
}
Response: {
  success: true,
  data: {
    url: "/uploads/constructionImage-1234567890-987654321.jpg"
  }
}
```

## Cấu Trúc Database

### TechPack Model
```typescript
{
  articleInfo: {
    designSketchUrl?: string;  // Article Info image
    companyLogoUrl?: string;   // Company logo used across PDFs
  },
  colorways: [{
    imageUrl?: string;          // Colorway main image
    parts: [{
      imageUrl?: string;        // Colorway part image
    }]
  }],
  howToMeasure: [{
    imageUrl?: string;          // How to measure image
  }]
}
```

## Vấn Đề Đã Sửa

### Trước đây:
- ❌ ColorwayTab và ArticleInfoTab đều dùng endpoint `/upload-sketch` với field name `designSketch`
- ❌ Gây conflict và khó phân biệt loại ảnh
- ❌ ConstructionTab cũng dùng chung endpoint

### Sau khi sửa:
- ✅ Mỗi loại ảnh có endpoint riêng
- ✅ Field name khác nhau để tránh conflict
- ✅ Dễ quản lý và debug
- ✅ Có thể mở rộng thêm endpoint cho các loại ảnh khác

## Cách Sử Dụng

### Upload ảnh Article Info:
```typescript
const formData = new FormData();
formData.append('designSketch', file);
const response = await api.post('/techpacks/upload-sketch', formData);
```

### Upload logo công ty:
```typescript
const formData = new FormData();
formData.append('companyLogo', file);
const response = await api.post('/techpacks/upload-company-logo', formData);
```

### Upload ảnh Colorway:
```typescript
const formData = new FormData();
formData.append('colorwayImage', file);
const response = await api.post('/techpacks/upload-colorway-image', formData);
```

### Upload ảnh Construction:
```typescript
const formData = new FormData();
formData.append('constructionImage', file);
const response = await api.post('/techpacks/upload-construction-image', formData);
```

## Lưu Ý

1. **File Size**: Tất cả ảnh đều có giới hạn 5MB
2. **File Types**: Chỉ chấp nhận JPEG, JPG, PNG, GIF, SVG
3. **URL Resolution**: Frontend có helper function `resolveImageUrl()` để xử lý relative/absolute URLs
4. **Static Serving**: Ảnh được serve từ `/uploads` route, không cần `/api/v1` prefix
5. **Security**: Tất cả endpoint upload đều yêu cầu authentication và role Admin/Designer

## Cải Tiến Đề Xuất

1. ✅ Đã tạo endpoint riêng cho colorway (hoàn thành)
2. ✅ Đã tạo endpoint riêng cho construction (hoàn thành)
3. ⚠️ HowToMeasureTab nên chuyển từ base64 sang upload lên server
4. ⚠️ Có thể tạo endpoint riêng cho colorway part image nếu cần
5. ⚠️ Có thể thêm image compression/resize trước khi lưu

