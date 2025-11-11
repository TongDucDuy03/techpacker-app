# Đề Xuất Tối Ưu Hiệu Năng - TechPack API

## 📊 Phân Tích Vấn Đề Hiện Tại

Từ log, các vấn đề chính:

1. **Redis connection failed** - Cache không hoạt động
   - Mỗi request đều phải query database
   - GET /api/v1/techpacks: **293ms** (rất chậm)

2. **Database Query chậm**:
   - Query phức tạp với `$or` và nhiều điều kiện
   - Populate 2 collections (technicalDesignerId, createdBy)
   - Select nhiều fields không cần thiết
   - Thiếu compound indexes cho query patterns phức tạp

3. **Không có response compression**

---

## 🎯 Các Giải Pháp Đề Xuất

### **ƯU TIÊN CAO** ⚡

#### 1. Fix Redis Connection (Ưu tiên #1)

**Vấn đề:** Redis không kết nối được → Cache không hoạt động

**Giải pháp:**

**Option A: Sử dụng Redis (Khuyến nghị cho Production)**
```bash
# Windows (WSL2 hoặc Docker)
docker run -d -p 6379:6379 redis:7-alpine

# Hoặc cài Redis trên Windows
# Download từ: https://github.com/microsoftarchive/redis/releases
```

**Option B: Fallback to In-Memory Cache (Tạm thời cho Development)**
- Sử dụng `node-cache` hoặc `memory-cache` khi Redis không available
- Tự động fallback khi Redis fail

**File cần sửa:** `server/src/services/cache.service.ts`

---

#### 2. Tối Ưu Database Indexes

**Vấn đề:** Query với `$or` và `sharedWith.userId` không có compound index tối ưu

**Giải pháp:** Thêm compound indexes

**File cần sửa:** `server/src/models/techpack.model.ts`

```typescript
// Thêm các indexes sau:
TechPackSchema.index({ createdBy: 1, status: 1, updatedAt: -1 });
TechPackSchema.index({ technicalDesignerId: 1, status: 1, updatedAt: -1 });
TechPackSchema.index({ 'sharedWith.userId': 1, status: 1, updatedAt: -1 });
// Compound index cho query phức tạp nhất
TechPackSchema.index({ 
  createdBy: 1, 
  'sharedWith.userId': 1, 
  status: 1, 
  updatedAt: -1 
});
```

---

#### 3. Tối Ưu Query trong getTechPacks

**Vấn đề:**
- Populate 2 collections mỗi lần
- Select quá nhiều fields
- Query `$or` phức tạp

**Giải pháp:**

**File cần sửa:** `server/src/controllers/techpack.controller.ts`

```typescript
// 1. Giảm fields select - chỉ lấy fields cần thiết cho list view
.select('articleCode productName brand season status category createdAt updatedAt technicalDesignerId createdBy supplier lifecycleStage gender currency version')

// 2. Tối ưu populate - chỉ populate khi thực sự cần
.populate('technicalDesignerId', 'firstName lastName')
.populate('createdBy', 'firstName lastName')

// 3. Sử dụng lean() để tăng tốc (đã có)

// 4. Tối ưu query - tách query phức tạp thành nhiều query đơn giản hơn
// Thay vì $or phức tạp, có thể query riêng và merge (nếu số lượng nhỏ)
```

---

### **ƯU TIÊN TRUNG BÌNH** ⚡⚡

#### 4. Thêm In-Memory Cache Fallback

**Giải pháp:** Khi Redis fail, tự động chuyển sang in-memory cache

**File mới:** `server/src/services/cache.service.ts` (sửa đổi)

```typescript
import NodeCache from 'node-cache';

private memoryCache: NodeCache | null = null;

// Fallback to memory cache when Redis unavailable
if (!this.isConnected && !this.memoryCache) {
  this.memoryCache = new NodeCache({ 
    stdTTL: 300, // 5 minutes
    checkperiod: 60 
  });
  console.log('⚠️  Using in-memory cache (Redis unavailable)');
}
```

---

#### 5. Response Compression

**Giải pháp:** Thêm compression middleware

**File cần sửa:** `server/src/index.ts`

```typescript
import compression from 'compression';

app.use(compression({
  level: 6, // Compression level 1-9
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

**Cài đặt:**
```bash
npm install compression
npm install --save-dev @types/compression
```

---

#### 6. Tối Ưu Populate

**Vấn đề:** Populate 2 collections mỗi lần query

**Giải pháp:** 
- Chỉ populate khi thực sự cần
- Hoặc sử dụng aggregation pipeline với $lookup (nếu cần nhiều data)

**File cần sửa:** `server/src/controllers/techpack.controller.ts`

```typescript
// Option 1: Lazy populate - chỉ populate khi cần
const techpacks = await TechPack.find(query)
  .select('articleCode productName ... technicalDesignerId createdBy')
  .lean();

// Populate sau nếu cần (chỉ khi có data)
if (techpacks.length > 0) {
  const designerIds = [...new Set(techpacks.map(t => t.technicalDesignerId).filter(Boolean))];
  const creatorIds = [...new Set(techpacks.map(t => t.createdBy).filter(Boolean))];
  
  const [designers, creators] = await Promise.all([
    User.find({ _id: { $in: designerIds } }).select('firstName lastName').lean(),
    User.find({ _id: { $in: creatorIds } }).select('firstName lastName').lean()
  ]);
  
  // Map back to techpacks
  const designerMap = new Map(designers.map(d => [d._id.toString(), d]));
  const creatorMap = new Map(creators.map(c => [c._id.toString(), c]));
  
  techpacks.forEach(tp => {
    tp.technicalDesignerId = designerMap.get(tp.technicalDesignerId?.toString());
    tp.createdBy = creatorMap.get(tp.createdBy?.toString());
  });
}
```

---

### **ƯU TIÊN THẤP** (Nice to have) ⚡⚡⚡

#### 7. Database Query Optimization

**Giải pháp:** Sử dụng aggregation pipeline cho query phức tạp

```typescript
// Thay vì find() với $or, sử dụng aggregation
const pipeline = [
  {
    $match: {
      $or: [
        { createdBy: user._id },
        { technicalDesignerId: user._id },
        { 'sharedWith.userId': user._id }
      ],
      status: { $ne: 'Archived' }
    }
  },
  {
    $lookup: {
      from: 'users',
      localField: 'technicalDesignerId',
      foreignField: '_id',
      as: 'technicalDesigner',
      pipeline: [{ $project: { firstName: 1, lastName: 1 } }]
    }
  },
  {
    $lookup: {
      from: 'users',
      localField: 'createdBy',
      foreignField: '_id',
      as: 'creator',
      pipeline: [{ $project: { firstName: 1, lastName: 1 } }]
    }
  },
  { $sort: { updatedAt: -1 } },
  { $skip: skip },
  { $limit: limitNum }
];
```

---

#### 8. Pagination Optimization

**Giải pháp:** Sử dụng cursor-based pagination thay vì offset-based

```typescript
// Thay vì skip/limit, sử dụng cursor
const cursor = req.query.cursor;
const query = { ...baseQuery };
if (cursor) {
  query._id = { $lt: new Types.ObjectId(cursor) };
}
```

---

## 📋 Kế Hoạch Triển Khai

### Phase 1: Quick Wins (1-2 giờ)
1. ✅ Fix Redis connection hoặc thêm in-memory fallback
2. ✅ Thêm compound indexes
3. ✅ Giảm fields select

**Kỳ vọng:** Giảm từ 293ms → ~50-100ms

### Phase 2: Medium Optimizations (2-4 giờ)
4. ✅ Thêm response compression
5. ✅ Tối ưu populate logic
6. ✅ Cải thiện cache strategy

**Kỳ vọng:** Giảm từ 50-100ms → ~20-50ms

### Phase 3: Advanced (4-8 giờ)
7. ✅ Aggregation pipeline optimization
8. ✅ Cursor-based pagination
9. ✅ Query result caching với smart invalidation

**Kỳ vọng:** Giảm từ 20-50ms → ~10-30ms

---

## 🔧 Hướng Dẫn Triển Khai

### Bước 1: Fix Redis (Ưu tiên cao nhất)

**Option A: Cài Redis**
```bash
# Windows với Docker
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Kiểm tra
docker ps | grep redis
```

**Option B: Thêm In-Memory Fallback**
- Xem code mẫu ở trên

### Bước 2: Thêm Indexes

```bash
# Chạy script để tạo indexes
cd server
node -e "
const mongoose = require('mongoose');
const TechPack = require('./dist/models/techpack.model').default;
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/techpacker')
  .then(() => {
    console.log('Creating indexes...');
    return TechPack.collection.createIndexes();
  })
  .then(() => {
    console.log('Indexes created!');
    process.exit(0);
  });
"
```

### Bước 3: Test Performance

```bash
# Test với curl hoặc Postman
time curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4001/api/v1/techpacks
```

---

## 📊 Metrics Đo Lường

Sau khi triển khai, đo các metrics:

1. **Response Time:**
   - GET /api/v1/techpacks: Mục tiêu < 50ms (hiện tại 293ms)
   - POST /api/v1/techpacks: Mục tiêu < 30ms (hiện tại 21-63ms)

2. **Database Query Time:**
   - Sử dụng MongoDB explain() để đo query time
   - Mục tiêu: < 20ms

3. **Cache Hit Rate:**
   - Mục tiêu: > 80% cho list queries

4. **Throughput:**
   - Requests/second: Mục tiêu > 100 req/s

---

## ⚠️ Lưu Ý

1. **Indexes:** Thêm indexes sẽ làm chậm write operations một chút, nhưng cải thiện read đáng kể
2. **Cache:** Cần invalidate cache đúng cách khi có updates
3. **Memory:** In-memory cache sẽ tốn RAM, cần monitor
4. **Testing:** Test kỹ sau mỗi thay đổi để đảm bảo không break functionality

---

## 🎯 Kết Luận

**Ưu tiên triển khai:**
1. **Fix Redis** (hoặc in-memory fallback) - Impact cao nhất
2. **Thêm indexes** - Impact cao, dễ triển khai
3. **Tối ưu query** - Impact trung bình
4. **Response compression** - Impact thấp nhưng dễ

**Kỳ vọng cải thiện:** 293ms → 20-50ms (giảm 80-90%)

