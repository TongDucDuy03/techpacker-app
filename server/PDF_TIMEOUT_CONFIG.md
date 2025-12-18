# PDF Export Timeout Configuration

## Vấn đề

PDF export có thể gặp lỗi timeout khi:
- TechPack có nhiều images
- Server chậm hoặc tải cao
- Network latency cao khi load images
- PDF có nhiều pages

## Giải pháp đã áp dụng

### 1. Tăng Timeout Settings

Code đã được cấu hình với các timeout sau:

| Operation | Default Timeout | Environment Variable | Mô tả |
|-----------|----------------|---------------------|-------|
| Browser Launch | 120s (2 phút) | `PDF_BROWSER_LAUNCH_TIMEOUT` | Thời gian để launch Chromium |
| Page Set Content | 180s (3 phút) | `PDF_PAGE_SET_CONTENT_TIMEOUT` | Thời gian để load HTML và DOM |
| PDF Generation | 120s (2 phút) | `PDF_GENERATION_TIMEOUT` | Thời gian để generate PDF từ page |
| Express Request | 300s (5 phút) | N/A | Timeout cho HTTP request |

### 2. Tối ưu hóa Performance

- **Image Loading**: Không block trên image errors, timeout 5s/image
- **DOM Loading**: Dùng `domcontentloaded` thay vì `networkidle0` để không chờ tất cả images
- **Wait Time**: Giảm từ 2000ms xuống 1000ms cho layout settling

### 3. Cấu hình Environment Variables

Thêm vào file `.env` trên server:

```env
# PDF Generation Timeouts (milliseconds)
PDF_BROWSER_LAUNCH_TIMEOUT=120000    # 2 minutes
PDF_PAGE_SET_CONTENT_TIMEOUT=180000  # 3 minutes  
PDF_GENERATION_TIMEOUT=120000        # 2 minutes
```

### 4. Nginx/Proxy Configuration

Nếu có Nginx hoặc reverse proxy ở phía trước, cần tăng timeout:

**Nginx:**
```nginx
location /api/v1/techpacks/ {
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    # ... other proxy settings
}
```

**Apache:**
```apache
ProxyTimeout 300
```

**PM2 (nếu dùng):**
```json
{
  "apps": [{
    "name": "techpacker-api",
    "script": "dist/index.js",
    "kill_timeout": 300000
  }]
}
```

## Troubleshooting

### Lỗi: "timeout of 30000ms exceeded"

**Nguyên nhân**: Express hoặc proxy timeout quá thấp

**Giải pháp**:
1. Kiểm tra Nginx/Apache timeout settings
2. Tăng timeout trong `.env`:
   ```env
   PDF_PAGE_SET_CONTENT_TIMEOUT=300000  # 5 phút
   PDF_GENERATION_TIMEOUT=180000         # 3 phút
   ```
3. Restart server sau khi thay đổi

### Lỗi: "Browser launch timeout"

**Nguyên nhân**: Server thiếu resources hoặc Chromium chưa được cài đặt

**Giải pháp**:
1. Kiểm tra system resources:
   ```bash
   free -h
   df -h
   ```
2. Tăng timeout:
   ```env
   PDF_BROWSER_LAUNCH_TIMEOUT=180000  # 3 phút
   ```
3. Đảm bảo đã cài đủ dependencies (xem `DEPLOYMENT.md`)

### PDF generation chậm

**Nguyên nhân**: Nhiều images hoặc images lớn

**Giải pháp**:
1. Optimize images trước khi upload (compress, resize)
2. Sử dụng CDN cho images
3. Tăng timeout:
   ```env
   PDF_PAGE_SET_CONTENT_TIMEOUT=300000  # 5 phút
   ```

## Monitoring

Theo dõi logs để xác định bottleneck:

```bash
# Xem logs
pm2 logs techpacker-api

# Filter PDF-related logs
pm2 logs techpacker-api | grep -i "pdf\|timeout\|browser"
```

Logs sẽ hiển thị:
- `Browser launched successfully` - Browser đã launch
- `Using template: ...` - Template đã load
- `PDF generation error:` - Lỗi nếu có

## Best Practices

1. **Production**: Set timeout cao hơn (5-10 phút) để đảm bảo PDF lớn có thể được generate
2. **Development**: Có thể giữ timeout thấp hơn để fail fast
3. **Monitoring**: Track thời gian generate PDF để optimize
4. **Caching**: Consider cache PDF đã generate để tránh regenerate

## Testing

Test với TechPack có nhiều images:

```bash
# Test với curl
curl -X GET "http://localhost:4001/api/v1/techpacks/{id}/pdf" \
  -H "Authorization: Bearer {token}" \
  --max-time 600 \
  -o test.pdf
```

Nếu thành công, file `test.pdf` sẽ được download.

