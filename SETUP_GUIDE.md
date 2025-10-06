# 🚀 TechPacker Project - Setup Guide

Hướng dẫn chi tiết để chạy TechPacker project từ đầu đến cuối.

## 📋 Yêu cầu hệ thống

- **Node.js**: >= 18.0.0
- **MongoDB**: >= 5.0
- **Redis**: >= 6.0 (tùy chọn, cho caching)
- **Git**: Để clone project
- **VS Code**: Recommended IDE

## 🔧 Bước 1: Cài đặt môi trường phát triển

### 1.1 Cài đặt Node.js

**Windows:**
```bash
# Tải và cài đặt từ https://nodejs.org/
# Hoặc sử dụng Chocolatey
choco install nodejs

# Kiểm tra version
node --version
npm --version
```

**macOS:**
```bash
# Sử dụng Homebrew
brew install node

# Hoặc tải từ https://nodejs.org/
```

**Linux (Ubuntu/Debian):**
```bash
# Cài đặt Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Kiểm tra version
node --version
npm --version
```

### 1.2 Cài đặt MongoDB

**Windows:**
```bash
# Tải MongoDB Community Server từ https://www.mongodb.com/try/download/community
# Hoặc sử dụng Chocolatey
choco install mongodb

# Khởi động MongoDB service
net start MongoDB
```

**macOS:**
```bash
# Sử dụng Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Khởi động MongoDB
brew services start mongodb/brew/mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list

# Update package database
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 1.3 Cài đặt Redis (Tùy chọn)

**Windows:**
```bash
# Tải Redis từ https://github.com/microsoftarchive/redis/releases
# Hoặc sử dụng WSL2 với Linux commands
```

**macOS:**
```bash
# Sử dụng Homebrew
brew install redis

# Khởi động Redis
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
# Cài đặt Redis
sudo apt install redis-server

# Khởi động Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 1.4 Kiểm tra các service

```bash
# Kiểm tra MongoDB
mongosh --eval "db.adminCommand('ismaster')"

# Kiểm tra Redis (nếu có)
redis-cli ping
```

## 📦 Bước 2: Thiết lập project

### 2.1 Clone và cài đặt dependencies

```bash
# Di chuyển đến thư mục project
cd techpacker-app/server

# Cài đặt dependencies
npm install

# Cài đặt dev dependencies
npm install --save-dev
```

**Ý nghĩa:** Lệnh này sẽ cài đặt tất cả các package cần thiết được định nghĩa trong `package.json`.

### 2.2 Cấu hình Environment Variables

```bash
# Tạo file environment từ template
cp .env.example .env

# Chỉnh sửa file .env
code .env  # hoặc nano .env
```

**Nội dung file .env:**
```env
# Server Configuration
PORT=4001
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/techpacker_dev

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-for-development-only
JWT_EXPIRES_IN=7d

# Redis (optional)
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Bcrypt
BCRYPT_ROUNDS=10
```

**Ý nghĩa các biến:**
- `PORT`: Cổng mà server sẽ chạy
- `MONGO_URI`: Đường dẫn kết nối MongoDB
- `JWT_SECRET`: Khóa bí mật để mã hóa JWT tokens
- `CORS_ORIGIN`: Domain được phép truy cập API

### 2.3 Build TypeScript

```bash
# Compile TypeScript thành JavaScript
npm run build
```

**Ý nghĩa:** Chuyển đổi code TypeScript trong `src/` thành JavaScript trong `dist/`.

## 🚀 Bước 3: Chạy server

### 3.1 Chạy development mode

```bash
# Chạy server với hot reload
npm run dev
```

**Ý nghĩa:** 
- Sử dụng `nodemon` để tự động restart server khi code thay đổi
- TypeScript được compile tự động
- Suitable cho development

### 3.2 Chạy production mode

```bash
# Build trước
npm run build

# Chạy production server
npm start
```

**Ý nghĩa:** Chạy server từ code JavaScript đã compile, tối ưu cho production.

### 3.3 Kiểm tra server đã chạy

```bash
# Kiểm tra health endpoint
curl http://localhost:4001/health

# Hoặc mở browser
# http://localhost:4001/health
```

**Kết quả mong đợi:**
```json
{
  "success": true,
  "message": "TechPacker API is running!",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

## 🧪 Bước 4: Test và verify

### 4.1 Chạy unit tests

```bash
# Chạy tất cả tests
npm test

# Chạy tests với coverage
npm run test:coverage

# Chạy specific test file
npm test -- auth.test.ts
```

### 4.2 Test API endpoints

```bash
# Test đăng ký user mới
curl -X POST http://localhost:4001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User",
    "role": "Designer"
  }'

# Test đăng nhập
curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 4.3 Truy cập API Documentation

```bash
# Mở Swagger UI
# http://localhost:4001/api/docs
```

## 🔍 Bước 5: Monitoring và debugging

### 5.1 Xem logs

```bash
# Xem logs realtime
npm run dev

# Hoặc check log files (nếu có)
tail -f logs/app.log
```

### 5.2 Debug MongoDB

```bash
# Kết nối MongoDB shell
mongosh techpacker_dev

# Xem collections
show collections

# Xem users
db.users.find().pretty()

# Xem techpacks
db.techpacks.find().pretty()
```

### 5.3 Debug Redis

```bash
# Kết nối Redis CLI
redis-cli

# Xem tất cả keys
KEYS *

# Xem cache stats
INFO stats
```

## 📱 Bước 6: Tích hợp Frontend (Tùy chọn)

Nếu bạn muốn chạy cả frontend:

```bash
# Di chuyển đến thư mục frontend
cd ../client

# Cài đặt dependencies
npm install

# Chạy development server
npm run dev

# Frontend sẽ chạy trên http://localhost:5173
```

## ⚠️ Troubleshooting

### Lỗi thường gặp:

**1. MongoDB connection error:**
```bash
# Kiểm tra MongoDB đang chạy
sudo systemctl status mongod  # Linux
brew services list | grep mongodb  # macOS
```

**2. Port already in use:**
```bash
# Tìm process đang sử dụng port
lsof -i :4001  # macOS/Linux
netstat -ano | findstr :4001  # Windows

# Kill process
kill -9 <PID>
```

**3. Permission errors:**
```bash
# Fix npm permissions (Linux/macOS)
sudo chown -R $(whoami) ~/.npm
```

**4. TypeScript compilation errors:**
```bash
# Clean build
rm -rf dist/
npm run build
```

## 🎯 Các lệnh hữu ích

```bash
# Development
npm run dev          # Chạy dev server với hot reload
npm run build        # Build TypeScript
npm start           # Chạy production server

# Testing
npm test            # Chạy tests
npm run test:watch  # Chạy tests với watch mode
npm run test:coverage # Test coverage report

# Linting & Formatting
npm run lint        # Check code style
npm run lint:fix    # Fix code style issues

# Database
npm run db:seed     # Seed sample data (nếu có)
npm run db:reset    # Reset database (nếu có)
```

## ✅ Checklist hoàn thành

- [ ] Node.js >= 18 đã cài đặt
- [ ] MongoDB đang chạy
- [ ] Redis đang chạy (tùy chọn)
- [ ] Dependencies đã cài đặt
- [ ] File .env đã cấu hình
- [ ] Server chạy thành công trên port 4001
- [ ] Health check trả về 200 OK
- [ ] API documentation accessible
- [ ] Tests pass
- [ ] Có thể tạo user và login

🎉 **Chúc mừng! TechPacker API đã sẵn sàng sử dụng!**
