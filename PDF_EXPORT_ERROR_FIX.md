# 🔧 Sửa Lỗi PDF Export - Connection Closed

## ❌ Lỗi Gốc

```
PDF export error: Error: Protocol error: Connection closed. 
Most likely the page has been closed.
```

## 🔍 Nguyên Nhân

1. **Page bị đóng sớm** - Puppeteer page bị crash hoặc timeout trong quá trình render
2. **HTML quá lớn** - Một số sections có quá nhiều dữ liệu khiến page crash
3. **Timeout** - `networkidle0` wait strategy quá strict, timeout trước khi render xong
4. **Memory issues** - Render nhiều sections liên tiếp gây memory pressure

## ✅ Giải Pháp Đã Áp Dụng

### 1. **Cải Thiện Error Handling**
- ✅ Kiểm tra `page.isClosed()` trước mỗi operation
- ✅ Safe close page trong finally block
- ✅ Ignore "closed" errors khi cleanup
- ✅ Recreate page nếu bị crash

### 2. **Tối Ưu Wait Strategy**
- ✅ Đổi từ `networkidle0` → `domcontentloaded` (nhanh hơn)
- ✅ Fallback to `load` nếu timeout
- ✅ Thêm timeout cho từng bước
- ✅ Wait 500ms sau khi load content

### 3. **Tăng Timeout**
- ✅ PDF_TIMEOUT: 120s → 300s (5 phút)
- ✅ Content loading: 30s
- ✅ PDF generation: 60s
- ✅ Browser launch: 60s

### 4. **Page Management**
- ✅ Kiểm tra page state trước mỗi section
- ✅ Recreate page nếu bị closed
- ✅ Set viewport và timeout cho mỗi page mới
- ✅ Verify page trước khi render

### 5. **Browser Configuration**
- ✅ Thêm `--disable-web-security`
- ✅ Thêm `--disable-features=IsolateOrigins,site-per-process`
- ✅ Set timeout cho browser launch

### 6. **Concurrency**
- ✅ Giảm từ 2 → 1 để tránh memory pressure

## 📝 Code Changes

### `server/src/services/pdf-multi-section.service.ts`

1. **renderSectionAsPDF()**:
   - Verify page.isClosed() trước mỗi operation
   - Fallback wait strategy
   - Better error messages

2. **generateForKey()**:
   - Page recreation logic
   - Verify page state trước render
   - Safe close trong finally

3. **getBrowser()**:
   - Thêm browser args
   - Set timeout

## 🧪 Testing

Sau khi sửa, test với:
1. Techpack có nhiều sections
2. Techpack có nhiều data (nhiều BOM items, measurements, colorways)
3. Techpack có hình ảnh lớn
4. Multiple PDF exports liên tiếp

## 📊 Expected Behavior

- ✅ PDF generation không bị crash
- ✅ Page được recreate nếu bị closed
- ✅ Error messages rõ ràng hơn
- ✅ Timeout được handle đúng cách
- ✅ Memory usage ổn định hơn

## 🚨 Nếu Vẫn Còn Lỗi

1. **Kiểm tra logs** để xem section nào bị lỗi
2. **Giảm data** trong section đó (nếu quá lớn)
3. **Tăng timeout** thêm nữa nếu cần
4. **Kiểm tra memory** của server

