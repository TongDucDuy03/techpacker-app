# Seed Scripts

Scripts để khởi tạo dữ liệu ban đầu cho database.

## Tạo Admin User

Script này tạo tài khoản admin đầu tiên nếu database đang trống.

### Cách sử dụng:

#### 1. Chạy với cấu hình mặc định:
```bash
npm run seed:admin
```

**Thông tin đăng nhập mặc định:**
- Email: `admin@techpacker.com`
- Password: `Admin123!`
- Role: `admin`

#### 2. Chạy với thông tin tùy chỉnh qua command line:
```bash
npm run seed:admin -- --email your@email.com --password YourPassword123! --firstName Admin --lastName User
```

#### 3. Chạy với biến môi trường (thêm vào file `.env`):
```env
ADMIN_EMAIL=admin@techpacker.com
ADMIN_PASSWORD=Admin123!
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=User
```

Sau đó chạy:
```bash
npm run seed:admin
```

### Lưu ý:

- Script sẽ **không tạo** admin nếu đã có admin user trong database
- Script sẽ **không tạo** nếu email đã tồn tại
- **QUAN TRỌNG**: Đổi mật khẩu mặc định sau lần đăng nhập đầu tiên!

### Ví dụ:

```bash
# Tạo admin với email và password tùy chỉnh
npm run seed:admin -- --email admin@mycompany.com --password SecurePass123!

# Tạo admin với đầy đủ thông tin
npm run seed:admin -- --email admin@mycompany.com --password SecurePass123! --firstName John --lastName Doe
```

