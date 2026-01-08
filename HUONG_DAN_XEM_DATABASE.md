# Hướng Dẫn Xem Database MongoDB

## 1. Kết nối MongoDB

### Cách 1: Sử dụng MongoDB Compass (GUI Tool - Khuyên dùng)

1. **Tải MongoDB Compass:**
   - Truy cập: https://www.mongodb.com/try/download/compass
   - Tải và cài đặt MongoDB Compass

2. **Kết nối:**
   - Mở MongoDB Compass
   - Nhập connection string từ file config:
     ```
     mongodb://localhost:27017/techpacker
     ```
   - Hoặc nếu có authentication:
     ```
     mongodb://username:password@localhost:27017/techpacker
     ```
   - Click "Connect"

### Cách 2: Sử dụng MongoDB Shell (mongosh)

1. **Cài đặt MongoDB Shell** (nếu chưa có):
   ```bash
   # Windows (sử dụng Chocolatey)
   choco install mongosh
   
   # Hoặc tải từ: https://www.mongodb.com/try/download/shell
   ```

2. **Kết nối:**
   ```bash
   mongosh "mongodb://localhost:27017/techpacker"
   ```

### Cách 3: Sử dụng VS Code Extension

1. **Cài đặt extension:**
   - Mở VS Code
   - Tìm và cài đặt extension: "MongoDB for VS Code"

2. **Kết nối:**
   - Click vào MongoDB icon ở sidebar
   - Add connection với connection string từ config

## 2. Xem Collections và Data

### Trong MongoDB Compass:

1. **Xem danh sách databases:**
   - Database `techpacker` sẽ hiển thị ở sidebar bên trái

2. **Xem collections:**
   - Click vào database `techpacker`
   - Sẽ thấy các collections:
     - `techpacks` - Chứa tất cả tech packs
     - `users` - Chứa users
     - `revisions` - Chứa revisions
     - `activities` - Chứa activity logs

3. **Xem data trong collection `techpacks`:**
   - Click vào collection `techpacks`
   - Sẽ thấy danh sách tất cả tech packs
   - Có thể filter, sort, search trong Compass

### Trong MongoDB Shell:

```javascript
// Chọn database
use techpacker

// Xem tất cả collections
show collections

// Đếm số lượng techpacks
db.techpacks.countDocuments()

// Xem tất cả techpacks
db.techpacks.find().pretty()

// Đếm theo status
db.techpacks.countDocuments({ status: "Draft" })
db.techpacks.countDocuments({ status: "Approved" })
db.techpacks.countDocuments({ status: "Pending Approval" })

// Xem techpacks của page 1 (10 items đầu tiên)
db.techpacks.find().sort({ updatedAt: -1 }).limit(10).pretty()

// Xem techpacks của page 2 (items 11-20)
db.techpacks.find().sort({ updatedAt: -1 }).skip(10).limit(10).pretty()

// Xem techpacks của admin user cụ thể
db.techpacks.find({ createdBy: ObjectId("USER_ID_HERE") }).pretty()

// Xem tất cả techpacks (không filter theo user)
db.techpacks.find({}).count()

// Group by status để xem stats
db.techpacks.aggregate([
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 }
    }
  }
])
```

## 3. Kiểm tra Vấn Đề Pagination

### Query để kiểm tra:

```javascript
// 1. Đếm tổng số techpacks (không filter)
db.techpacks.countDocuments({})

// 2. Đếm techpacks theo status
db.techpacks.aggregate([
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 }
    }
  },
  {
    $sort: { count: -1 }
  }
])

// 3. Xem techpacks của page 1
db.techpacks.find({})
  .sort({ updatedAt: -1 })
  .limit(10)
  .project({ articleName: 1, articleCode: 1, status: 1, updatedAt: 1 })

// 4. Xem techpacks của page 2
db.techpacks.find({})
  .sort({ updatedAt: -1 })
  .skip(10)
  .limit(10)
  .project({ articleName: 1, articleCode: 1, status: 1, updatedAt: 1 })

// 5. Kiểm tra techpacks của admin user
// Lấy user ID của admin trước
db.users.find({ role: "admin" }).project({ _id: 1, email: 1 })

// Sau đó đếm techpacks của admin đó
db.techpacks.countDocuments({ createdBy: ObjectId("ADMIN_USER_ID") })

// 6. Kiểm tra techpacks được share với user
db.techpacks.countDocuments({ "sharedWith.userId": ObjectId("USER_ID") })
```

## 4. Connection String từ Code

Từ file `server/src/config/config.ts`:
- Default: `mongodb://localhost:27017/techpacker`
- Có thể override bằng biến môi trường `MONGO_URI`

## 5. Troubleshooting

### Nếu không kết nối được:

1. **Kiểm tra MongoDB đang chạy:**
   ```bash
   # Windows
   net start MongoDB
   
   # Hoặc kiểm tra service
   services.msc
   ```

2. **Kiểm tra port:**
   - MongoDB mặc định chạy trên port 27017
   - Kiểm tra: `netstat -an | findstr 27017`

3. **Kiểm tra connection string:**
   - Xem trong file `.env` hoặc `server/src/config/config.ts`

## 6. Export Data để Phân Tích

```javascript
// Export tất cả techpacks ra JSON
db.techpacks.find({}).toArray()

// Export với filter
db.techpacks.find({ status: "Draft" }).toArray()
```

Sau đó copy và paste vào file JSON để phân tích.

