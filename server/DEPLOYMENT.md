# Deployment Guide - PDF Export trên Linux Server

## Vấn đề

Khi deploy lên server Linux, PDF export có thể gặp lỗi:
```
Failed to launch Puppeteer browser: Failed to launch the browser process! spawn ... ENOENT
```

## Giải pháp

### 1. Cài đặt System Dependencies cho Puppeteer (Linux)

Puppeteer cần các system libraries để chạy Chromium. Chạy các lệnh sau trên server Linux:

#### Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils
```

#### CentOS/RHEL:
```bash
sudo yum install -y \
  alsa-lib \
  atk \
  cups-libs \
  gtk3 \
  ipa-gothic-fonts \
  libXcomposite \
  libXcursor \
  libXdamage \
  libXext \
  libXi \
  libXrandr \
  libXScrnSaver \
  libXtst \
  pango \
  xorg-x11-fonts-100dpi \
  xorg-x11-fonts-75dpi \
  xorg-x11-utils
```

### 2. Cài đặt Chromium (Tùy chọn)

Nếu muốn sử dụng Chromium được cài đặt trên system thay vì Chromium bundle của Puppeteer:

#### Ubuntu/Debian:
```bash
sudo apt-get install -y chromium-browser
```

Sau đó set environment variable:
```bash
export CHROME_PATH=/usr/bin/chromium-browser
# Hoặc
export CHROME_PATH=/usr/bin/chromium
```

#### CentOS/RHEL:
```bash
sudo yum install -y chromium
export CHROME_PATH=/usr/bin/chromium
```

### 3. Cấu hình Environment Variables

Thêm vào file `.env` trên server:

```env
# Nếu muốn dùng Chromium system (tùy chọn)
# CHROME_PATH=/usr/bin/chromium-browser

# Nếu không set CHROME_PATH, Puppeteer sẽ tự động dùng Chromium bundle
```

### 4. Kiểm tra Puppeteer có Chromium bundle không

Sau khi `npm install`, kiểm tra:
```bash
ls node_modules/puppeteer/.local-chromium/
```

Nếu có thư mục này, Puppeteer đã download Chromium bundle.

### 5. Test PDF Export

Sau khi cài đặt, test lại:
```bash
curl http://localhost:4001/api/v1/techpacks/{techpackId}/pdf
```

## Troubleshooting

### Lỗi: "Failed to launch browser"

1. **Kiểm tra permissions**: Đảm bảo user chạy Node.js có quyền execute Chromium
```bash
   ls -la /usr/bin/chromium-browser
```

2. **Kiểm tra CHROME_PATH**: Nếu set `CHROME_PATH`, đảm bảo đường dẫn đúng
```bash
   which chromium-browser
   # hoặc
   which chromium
   ```

3. **Test Chromium manually**:
```bash
   chromium-browser --version
   # hoặc
   chromium --version
   ```

4. **Kiểm tra logs**: Xem server logs để biết Puppeteer đang tìm Chrome ở đâu
   ```
   Using Chrome/Chromium from: /usr/bin/chromium-browser
   # hoặc
   Using Puppeteer bundled Chromium
   ```

### Lỗi: "No space left on device"

Puppeteer cần ~200-300MB disk space cho Chromium bundle. Kiểm tra:
```bash
df -h
```

### Lỗi: "Permission denied"

Nếu chạy với user không có quyền:
```bash
# Option 1: Chạy với user có quyền
sudo -u www-data node dist/index.js

# Option 2: Set permissions
sudo chmod +x /usr/bin/chromium-browser
```

## Production Best Practices

1. **Sử dụng Puppeteer bundled Chromium** (không set `CHROME_PATH`):
   - Đảm bảo version Chromium nhất quán
   - Không phụ thuộc vào system packages

2. **Set resource limits**:
   ```bash
   # Limit memory cho Node.js process
   NODE_OPTIONS="--max-old-space-size=2048" npm start
   ```

3. **Monitor memory usage**: Puppeteer có thể tốn nhiều RAM
   ```bash
   # Monitor
   pm2 monit
   ```

4. **Cleanup browser instances**: Code đã có `closeBrowser()` để cleanup

## Docker Deployment

Nếu deploy bằng Docker, thêm vào Dockerfile:

```dockerfile
# Install dependencies
RUN apt-get update && apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils \
  && rm -rf /var/lib/apt/lists/*
```
