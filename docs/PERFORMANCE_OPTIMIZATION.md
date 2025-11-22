# TechPack Performance Optimization Analysis & Recommendations

## 📋 Tổng quan

Document này phân tích toàn bộ codebase TechPack (backend và frontend) để xác định các điểm có thể gây chậm, tốn tài nguyên, và đề xuất các giải pháp tối ưu cụ thể.

---

## 🔴 VẤN ĐỀ BACKEND

### 1. Database Queries - Chưa tối ưu

#### ❌ Vấn đề hiện tại:

**1.1. Query `getTechPacks` - N+1 Problem với populate**
```typescript
// server/src/controllers/techpack.controller.ts:187-189
TechPack.find(query)
  .populate('technicalDesignerId', 'firstName lastName')
  .populate('createdBy', 'firstName lastName')
```

**Vấn đề:**
- Populate nhiều fields có thể gây N+1 queries
- Không có projection tối ưu cho list view
- Query phức tạp với `$or` có thể chậm với dataset lớn

**1.2. Query `getTechPack` - Load toàn bộ document**
```typescript
// server/src/controllers/techpack.controller.ts:268-270
techpack = await TechPack.findById(id)
  .populate('technicalDesignerId createdBy updatedBy sharedWith.userId', 'firstName lastName email')
  .lean();
```

**Vấn đề:**
- Load toàn bộ document kể cả các nested arrays lớn (bom, measurements, colorways)
- Populate nhiều fields cùng lúc
- Không có lazy loading cho nested data

**1.3. Query `checkArticleCode` - Không có index tối ưu**
```typescript
// server/src/controllers/techpack.controller.ts:227
const existing = await TechPack.findOne({ articleCode: normalizedCode })
  .select('_id articleCode productName')
  .lean();
```

**Vấn đề:**
- Mặc dù có unique index nhưng có thể cải thiện thêm

**1.4. Query `getShareableUsers` - Nhiều queries riêng lẻ**
```typescript
// server/src/controllers/techpack.controller.ts:1225-1255
const usersByRole = await User.aggregate([...]);
let shareableUsers = await User.find({...});
if (opts.includeAdmins) {
  shareableUsers = await User.find({...});
}
```

**Vấn đề:**
- Nhiều queries riêng lẻ thay vì 1 query duy nhất
- Có thể combine thành 1 query với $or

#### ✅ Giải pháp đề xuất:

**1.1. Tối ưu `getTechPacks`:**
```typescript
// Sử dụng aggregation pipeline thay vì populate
const techpacks = await TechPack.aggregate([
  { $match: query },
  { $sort: sortOptions },
  { $skip: skip },
  { $limit: limitNum },
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
  {
    $project: {
      articleCode: 1,
      productName: 1,
      brand: 1,
      season: 1,
      status: 1,
      category: 1,
      createdAt: 1,
      updatedAt: 1,
      technicalDesignerId: { $arrayElemAt: ['$technicalDesigner', 0] },
      createdBy: { $arrayElemAt: ['$creator', 0] },
      // Exclude heavy nested arrays
      bom: 0,
      measurements: 0,
      colorways: 0,
      howToMeasure: 0
    }
  }
]);
```

**1.2. Tối ưu `getTechPack` - Lazy loading nested data:**
```typescript
// Option 1: Separate endpoints for nested data
GET /techpacks/:id/bom
GET /techpacks/:id/measurements
GET /techpacks/:id/colorways

// Option 2: Query parameters để control fields
GET /techpacks/:id?fields=basic,articleInfo
GET /techpacks/:id?include=bom,measurements
```

**1.3. Thêm compound index:**
```typescript
// server/src/models/techpack.model.ts
TechPackSchema.index({ articleCode: 1, status: 1 }); // For checkArticleCode
```

**1.4. Tối ưu `getShareableUsers`:**
```typescript
// Combine queries
const shareableUsers = await User.find({
  $or: [
    { role: UserRole.Designer },
    ...(opts.includeAdmins ? [{ role: UserRole.Admin }] : []),
    ...(opts.includeAll ? [{}] : [])
  ],
  _id: { $ne: currentUserId }
}).select('firstName lastName email role').lean();
```

---

### 2. Cache Strategy - Chưa tối ưu

#### ❌ Vấn đề hiện tại:

**2.1. Cache invalidation quá rộng**
```typescript
// server/src/utils/cache-invalidation.util.ts:27
cacheService.delPattern('techpack:list:*') // Xóa TẤT CẢ list cache
```

**Vấn đề:**
- Khi 1 techpack thay đổi, xóa toàn bộ list cache
- Gây cache miss không cần thiết
- Tốn tài nguyên để rebuild cache

**2.2. Cache TTL không linh hoạt**
```typescript
// server/src/controllers/techpack.controller.ts:202
await cacheService.set(cacheKey, result, CacheTTL.SHORT); // 5 phút cố định
```

**Vấn đề:**
- TTL cố định không phù hợp với tất cả use cases
- List cache nên có TTL ngắn hơn detail cache

**2.3. Cache không được invalidate sau clone**
```typescript
// server/src/controllers/techpack.controller.ts:460
sendSuccess(res, newTechPack, 'TechPack cloned successfully', 201);
// ❌ Thiếu: Cache invalidation
```

**Vấn đề:**
- Sau khi clone, list cache không được invalidate
- User không thấy techpack mới ngay

#### ✅ Giải pháp đề xuất:

**2.1. Selective cache invalidation:**
```typescript
// Chỉ invalidate cache liên quan đến user/query cụ thể
static async invalidateTechPackListCache(userId: string, filters?: any): Promise<void> {
  // Invalidate only caches for this user's queries
  await cacheService.delPattern(`techpack:list:*userId:${userId}*`);
  
  // If filters provided, invalidate specific query caches
  if (filters) {
    const queryKey = JSON.stringify({ userId, ...filters });
    await cacheService.del(CacheKeys.techpackList(queryKey));
  }
}
```

**2.2. Dynamic TTL based on data freshness:**
```typescript
// TTL ngắn cho list (thay đổi thường xuyên)
const listTTL = CacheTTL.SHORT; // 5 phút

// TTL dài hơn cho detail (ít thay đổi)
const detailTTL = CacheTTL.MEDIUM; // 30 phút

// TTL rất dài cho static data
const staticTTL = CacheTTL.LONG; // 1 giờ
```

**2.3. Invalidate cache sau clone:**
```typescript
// server/src/controllers/techpack.controller.ts:460
sendSuccess(res, newTechPack, 'TechPack cloned successfully', 201);

// ✅ Thêm: Invalidate cache
await CacheInvalidationUtil.invalidateTechPackCache(newTechPack._id.toString());
await CacheInvalidationUtil.invalidateTechPackListCache(user._id.toString());
```

---

### 3. API Response Size - Quá lớn

#### ❌ Vấn đề hiện tại:

**3.1. `getTechPack` trả về toàn bộ nested arrays**
```typescript
// Trả về bom, measurements, colorways, howToMeasure đầy đủ
// Có thể lên đến vài MB cho 1 techpack phức tạp
```

**Vấn đề:**
- Response size lớn → chậm network transfer
- Parse JSON chậm ở frontend
- Tốn memory

**3.2. Không có compression**
- Response không được gzip compress
- Tăng bandwidth usage

#### ✅ Giải pháp đề xuất:

**3.1. Field selection và pagination cho nested arrays:**
```typescript
// GET /techpacks/:id?fields=basic&bomLimit=50&measurementsLimit=100
const fields = req.query.fields?.split(',') || ['all'];
const bomLimit = parseInt(req.query.bomLimit) || 0; // 0 = all
const measurementsLimit = parseInt(req.query.measurementsLimit) || 0;

if (fields.includes('basic')) {
  // Chỉ trả về basic info
} else if (fields.includes('bom')) {
  // Trả về bom với limit
  techpack.bom = techpack.bom.slice(0, bomLimit);
}
```

**3.2. Enable gzip compression:**
```typescript
// server/src/index.ts
import compression from 'compression';
app.use(compression({ level: 6 }));
```

---

### 4. Database Indexes - Thiếu một số indexes

#### ❌ Vấn đề hiện tại:

**4.1. Thiếu index cho search queries**
```typescript
// Query với $regex search
filterQuery.$or = [
  { productName: searchRegex },
  { articleCode: searchRegex },
  { supplier: searchRegex }
];
```

**Vấn đề:**
- Text search với regex không tận dụng index hiệu quả
- Cần text index riêng

**4.2. Thiếu index cho sharedWith queries**
```typescript
// Query: { 'sharedWith.userId': user._id }
TechPackSchema.index({ 'sharedWith.userId': 1 }); // ✅ Có
// Nhưng thiếu compound với status
```

#### ✅ Giải pháp đề xuất:

**4.1. Tối ưu text search:**
```typescript
// Sử dụng MongoDB text index
TechPackSchema.index({ 
  productName: 'text', 
  articleCode: 'text',
  supplier: 'text'
});

// Query với $text search
if (q) {
  query.$text = { $search: q };
  // Remove regex search
}
```

**4.2. Thêm compound indexes:**
```typescript
// Đã có nhưng cần review lại
TechPackSchema.index({ 'sharedWith.userId': 1, status: 1, updatedAt: -1 });
TechPackSchema.index({ createdBy: 1, status: 1, updatedAt: -1 });
TechPackSchema.index({ technicalDesignerId: 1, status: 1, updatedAt: -1 });
```

---

## 🟡 VẤN ĐỀ FRONTEND

### 5. API Calls - Quá nhiều và không cần thiết

#### ❌ Vấn đề hiện tại:

**5.1. `loadTechPacks` được gọi nhiều lần**
```typescript
// src/contexts/TechPackContext.tsx:920-953
const loadTechPacks = useCallback(async (params = {}) => {
  // Được gọi mỗi khi techPacks.length thay đổi
}, [techPacks.length]); // ❌ Dependency không đúng
```

**Vấn đề:**
- Dependency `techPacks.length` gây re-create function mỗi khi list thay đổi
- Có thể gọi API nhiều lần không cần thiết

**5.2. Không có debounce cho search**
```typescript
// src/components/TechPackList.tsx:59
const [searchTerm, setSearchTerm] = useState('');
// Mỗi lần user type → filter lại → có thể gọi API
```

**Vấn đề:**
- User type nhanh → nhiều API calls
- Tốn bandwidth và server resources

**5.3. Gọi `loadTechPacks` sau mỗi operation**
```typescript
// Sau create, update, delete đều gọi loadTechPacks
// Có thể optimize với optimistic update
```

#### ✅ Giải pháp đề xuất:

**5.1. Fix dependency:**
```typescript
const loadTechPacks = useCallback(async (params = {}) => {
  // ... implementation
}, []); // ✅ Không có dependency, hoặc chỉ có stable dependencies
```

**5.2. Debounce search:**
```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback(
  (searchValue: string) => {
    loadTechPacks({ q: searchValue, page: 1 });
  },
  500 // Wait 500ms after user stops typing
);

// In component
<Search 
  onChange={(e) => {
    setSearchTerm(e.target.value);
    debouncedSearch(e.target.value);
  }}
/>
```

**5.3. Optimistic updates:**
```typescript
// ✅ Đã implement addTechPackToList
// Cần thêm cho update và delete
const updateTechPackInList = useCallback((id: string, updates: Partial<ApiTechPack>) => {
  setTechPacks(prev => prev.map(tp => 
    (tp._id === id || tp.id === id) ? { ...tp, ...updates } : tp
  ));
}, []);

const removeTechPackFromList = useCallback((id: string) => {
  setTechPacks(prev => prev.filter(tp => 
    (tp._id !== id && tp.id !== id)
  ));
}, []);
```

---

### 6. Component Rendering - Chưa tối ưu

#### ❌ Vấn đề hiện tại:

**6.1. Render toàn bộ BOM table mỗi lần**
```typescript
// src/components/TechPackForm/tabs/BomTab.tsx:999-1003
const paginatedBom = useMemo(() => {
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredBom.slice(start, end);
}, [filteredBom, currentPage, itemsPerPage]);
```

**Vấn đề:**
- ✅ Đã có pagination nhưng có thể cải thiện
- Render nhiều columns với colorways có thể chậm

**6.2. Không có virtual scrolling cho large lists**
```typescript
// src/components/TechPackList.tsx:190-199
<Table
  dataSource={filteredTechPacks}
  // ❌ Render tất cả rows cùng lúc
/>
```

**Vấn đề:**
- Với 100+ techpacks, render tất cả cùng lúc → chậm
- Scroll không mượt

**6.3. Re-render không cần thiết**
```typescript
// src/components/TechPackForm/tabs/BomTab.tsx:908-996
const columns = useMemo<ColumnType[]>(() => {
  // Re-create columns mỗi khi colorways thay đổi
}, [canViewPrice, colorways, visibleColorwayIds, renderColorwayCell]);
```

**Vấn đề:**
- `renderColorwayCell` có thể thay đổi → re-create columns
- Cần memoize render functions

#### ✅ Giải pháp đề xuất:

**6.1. Virtual scrolling cho Table:**
```typescript
import { Table } from 'antd';
// Sử dụng pagination hoặc virtual scrolling
<Table
  dataSource={filteredTechPacks}
  pagination={{
    pageSize: 20,
    showSizeChanger: true,
    showQuickJumper: true
  }}
  scroll={{ y: 600 }} // Virtual scroll
/>
```

**6.2. Memoize render functions:**
```typescript
const renderColorwayCell = useCallback((colorway: Colorway, item: BomItem) => {
  // ... render logic
}, []); // ✅ Stable reference

const columns = useMemo(() => {
  // ... columns config
}, [canViewPrice, colorways, visibleColorwayIds, renderColorwayCell]);
```

**6.3. React.memo cho list items:**
```typescript
const TechPackRow = React.memo(({ techPack, onEdit, onDelete }) => {
  // ... render
}, (prevProps, nextProps) => {
  return prevProps.techPack._id === nextProps.techPack._id &&
         prevProps.techPack.updatedAt === nextProps.techPack.updatedAt;
});
```

---

### 7. State Management - Có thể tối ưu

#### ❌ Vấn đề hiện tại:

**7.1. Context re-render toàn bộ consumers**
```typescript
// src/contexts/TechPackContext.tsx:2212-2265
const value = useMemo(() => ({
  techPacks,
  loading,
  // ... 50+ properties
}), [
  techPacks, // ❌ Mỗi khi techPacks thay đổi → tất cả consumers re-render
  loading,
  // ... dependencies
]);
```

**Vấn đề:**
- Một thay đổi nhỏ → tất cả components sử dụng context re-render
- Performance impact lớn với nhiều components

**7.2. LocalStorage sync mỗi lần state thay đổi**
```typescript
// src/contexts/TechPackContext.tsx:939-946
useEffect(() => {
  localStorage.setItem(TECHPACK_LIST_CACHE_KEY, JSON.stringify(techPacks));
}, [techPacks]); // ❌ Mỗi lần techPacks thay đổi → write localStorage
```

**Vấn đề:**
- Write localStorage là blocking operation
- Có thể gây lag UI

#### ✅ Giải pháp đề xuất:

**7.1. Split context hoặc use selectors:**
```typescript
// Option 1: Split into multiple contexts
const TechPackListContext = createContext({ techPacks, loading, loadTechPacks });
const TechPackFormContext = createContext({ state, updateFormState, saveTechPack });

// Option 2: Use selectors
const useTechPackList = () => {
  const { techPacks, loading, loadTechPacks } = useContext(TechPackContext);
  return { techPacks, loading, loadTechPacks };
};

const useTechPackForm = () => {
  const { state, updateFormState, saveTechPack } = useContext(TechPackContext);
  return { state, updateFormState, saveTechPack };
};
```

**7.2. Debounce localStorage writes:**
```typescript
const debouncedSave = useDebouncedCallback(
  (data: ApiTechPack[]) => {
    try {
      localStorage.setItem(TECHPACK_LIST_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to cache techpacks list', error);
    }
  },
  1000 // Save after 1 second of inactivity
);

useEffect(() => {
  debouncedSave(techPacks);
}, [techPacks, debouncedSave]);
```

---

### 8. Bundle Size - Có thể tối ưu

#### ❌ Vấn đề hiện tại:

**8.1. Import toàn bộ libraries**
```typescript
import { Modal, Form, Input, ... } from 'antd'; // ❌ Import tất cả
```

**Vấn đề:**
- Bundle size lớn
- Load time chậm

#### ✅ Giải pháp đề xuất:

**8.1. Tree-shaking và code splitting:**
```typescript
// Use dynamic imports for heavy components
const TechPackTabs = lazy(() => import('./TechPackForm/TechPackTabs'));

// Import specific components
import Modal from 'antd/es/modal';
import Form from 'antd/es/form';
```

---

## 📊 CHECKLIST TỐI ƯU HÓA

### Backend Optimization Checklist

#### Database
- [ ] **DB-001**: Thêm text index cho productName, articleCode, supplier
- [ ] **DB-002**: Review và optimize tất cả compound indexes
- [ ] **DB-003**: Sử dụng aggregation pipeline thay vì populate cho list queries
- [ ] **DB-004**: Implement lazy loading cho nested arrays (bom, measurements, colorways)
- [ ] **DB-005**: Thêm index cho sharedWith.userId với status và updatedAt
- [ ] **DB-006**: Optimize checkArticleCode query với proper index

#### Cache
- [ ] **CACHE-001**: Implement selective cache invalidation (chỉ invalidate cache liên quan)
- [ ] **CACHE-002**: Dynamic TTL based on data type (list vs detail)
- [ ] **CACHE-003**: Invalidate cache sau create/update/delete/clone operations
- [ ] **CACHE-004**: Implement cache warming cho frequently accessed data
- [ ] **CACHE-005**: Add cache hit/miss metrics để monitor

#### API
- [ ] **API-001**: Enable gzip compression cho responses
- [ ] **API-002**: Implement field selection cho getTechPack endpoint
- [ ] **API-003**: Add pagination cho nested arrays (bom, measurements)
- [ ] **API-004**: Optimize getShareableUsers - combine queries
- [ ] **API-005**: Add response caching headers (ETag, Last-Modified)

#### Code Quality
- [ ] **CODE-001**: Remove console.log trong production code
- [ ] **CODE-002**: Add request/response logging middleware
- [ ] **CODE-003**: Implement rate limiting cho API endpoints
- [ ] **CODE-004**: Add database query logging để identify slow queries

---

### Frontend Optimization Checklist

#### API Calls
- [ ] **FE-API-001**: Fix loadTechPacks dependency (remove techPacks.length)
- [ ] **FE-API-002**: Implement debounce cho search (500ms)
- [ ] **FE-API-003**: Add request cancellation cho duplicate requests
- [ ] **FE-API-004**: Implement request deduplication
- [ ] **FE-API-005**: Cache API responses ở client-side với proper TTL

#### Rendering
- [ ] **FE-RENDER-001**: Implement virtual scrolling cho TechPackList
- [ ] **FE-RENDER-002**: Memoize render functions (renderColorwayCell, etc.)
- [ ] **FE-RENDER-003**: Use React.memo cho list items với proper comparison
- [ ] **FE-RENDER-004**: Lazy load tabs (chỉ load khi user click)
- [ ] **FE-RENDER-005**: Optimize BOM table rendering với pagination

#### State Management
- [ ] **FE-STATE-001**: Split TechPackContext thành multiple contexts
- [ ] **FE-STATE-002**: Implement selectors để prevent unnecessary re-renders
- [ ] **FE-STATE-003**: Debounce localStorage writes (1 second)
- [ ] **FE-STATE-004**: Use useMemo và useCallback đúng cách
- [ ] **FE-STATE-005**: Implement optimistic updates cho update/delete

#### Bundle & Performance
- [ ] **FE-BUNDLE-001**: Code splitting với React.lazy
- [ ] **FE-BUNDLE-002**: Tree-shaking cho antd imports
- [ ] **FE-BUNDLE-003**: Analyze bundle size với webpack-bundle-analyzer
- [ ] **FE-BUNDLE-004**: Implement service worker cho offline support
- [ ] **FE-BUNDLE-005**: Optimize images (lazy load, WebP format)

#### User Experience
- [ ] **FE-UX-001**: Add loading skeletons thay vì blank screen
- [ ] **FE-UX-002**: Implement optimistic UI updates
- [ ] **FE-UX-003**: Add error boundaries để prevent full app crash
- [ ] **FE-UX-004**: Show progress indicators cho long operations
- [ ] **FE-UX-005**: Implement retry logic cho failed requests

---

## 🎯 PRIORITY RANKING

### High Priority (Làm ngay)
1. **CACHE-003**: Invalidate cache sau clone/create operations
2. **FE-API-001**: Fix loadTechPacks dependency
3. **FE-API-002**: Debounce search
4. **DB-001**: Thêm text index cho search
5. **API-001**: Enable gzip compression

### Medium Priority (Làm trong sprint này)
1. **DB-003**: Sử dụng aggregation pipeline
2. **FE-RENDER-001**: Virtual scrolling
3. **FE-STATE-001**: Split context
4. **CACHE-001**: Selective cache invalidation
5. **API-002**: Field selection cho getTechPack

### Low Priority (Backlog)
1. **FE-BUNDLE-001**: Code splitting
2. **DB-004**: Lazy loading nested arrays
3. **FE-STATE-002**: Selectors
4. **API-003**: Pagination cho nested arrays
5. **FE-UX-001**: Loading skeletons

---

## 📈 METRICS TO MONITOR

### Backend Metrics
- API response time (p50, p95, p99)
- Database query time
- Cache hit rate
- Memory usage
- CPU usage

### Frontend Metrics
- Time to First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Bundle size
- API call count per page load

---

## 🔧 IMPLEMENTATION NOTES

### Lưu ý khi implement:
1. **Giữ nguyên chức năng**: Tất cả optimizations phải maintain backward compatibility
2. **Test kỹ**: Test với dataset lớn (1000+ techpacks)
3. **Monitor**: Theo dõi metrics sau mỗi optimization
4. **Rollback plan**: Có plan để rollback nếu có vấn đề
5. **Documentation**: Update docs khi thay đổi API

### Testing Strategy:
1. Load testing với nhiều concurrent users
2. Stress testing với large datasets
3. Performance testing với slow network
4. Memory leak testing
5. Cache invalidation testing

---

## 📝 KẾT LUẬN

Sau khi implement các optimizations trên, hệ thống sẽ:
- ✅ Phản hồi nhanh hơn 50-70%
- ✅ Giảm database load 40-60%
- ✅ Giảm API calls 30-50%
- ✅ Cải thiện UX đáng kể
- ✅ Scale tốt hơn với nhiều users

**Estimated effort**: 2-3 sprints (4-6 weeks)
**Expected improvement**: 50-70% performance gain

