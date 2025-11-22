# Phân Tích & Tối Ưu Hiệu Năng - TechPack System

## 📋 Tổng Quan

Tài liệu này phân tích toàn bộ codebase TechPack (backend và frontend) để xác định các điểm có thể gây chậm, tốn tài nguyên, và đề xuất các giải pháp tối ưu cụ thể.

---

## 🔴 VẤN ĐỀ BACKEND

### 1. Database Queries - Chưa Tối Ưu

#### ❌ Vấn đề 1.1: Query `getTechPacks` - N+1 Problem với Populate

**Vị trí:** `server/src/controllers/techpack.controller.ts:186-196`

**Vấn đề:**
- Populate nhiều fields (`technicalDesignerId`, `createdBy`) có thể gây N+1 queries
- Query phức tạp với `$or` có thể chậm với dataset lớn
- Select nhiều fields không cần thiết cho list view

**Giải pháp:**
```typescript
// ✅ Tối ưu: Sử dụng select tối thiểu cho list view
const [techpacks, total] = await Promise.all([
  TechPack.find(query)
    .populate('technicalDesignerId', 'firstName lastName')
    .populate('createdBy', 'firstName lastName')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .select('articleCode productName brand season status category createdAt updatedAt technicalDesignerId createdBy supplier lifecycleStage gender currency version')
    .lean(),
  TechPack.countDocuments(query)
]);
```

**Cải thiện dự kiến:** Giảm 60-80% data transfer cho list queries

---

#### ❌ Vấn đề 1.2: Query `getTechPack` - Load Toàn Bộ Document

**Vị trí:** `server/src/controllers/techpack.controller.ts:268-270`

**Vấn đề:**
- Load toàn bộ document kể cả các nested arrays lớn (bom, measurements, colorways)
- Populate nhiều fields cùng lúc
- Không có lazy loading cho nested data

**Giải pháp:**
```typescript
// ✅ Tối ưu: Chỉ load fields cần thiết, có thể tách nested data thành endpoint riêng
techpack = await TechPack.findById(id)
  .populate('technicalDesignerId createdBy updatedBy sharedWith.userId', 'firstName lastName email')
  .select('+bom +measurements +colorways') // Chỉ load khi cần
  .lean();
```

**Cải thiện dự kiến:** Giảm 40-60% response size cho detail view

---

#### ❌ Vấn đề 1.3: Query `getShareableUsers` - Nhiều Queries Riêng Lẻ

**Vị trí:** `server/src/controllers/techpack.controller.ts:1225-1259`

**Vấn đề:**
- Thực hiện nhiều queries riêng lẻ thay vì một query tối ưu
- Có fallback query không cần thiết

**Giải pháp:**
```typescript
// ✅ Tối ưu: Gộp thành một query với điều kiện rõ ràng
const shareableUsers = await User.find({
  _id: { $nin: excludedUserIds },
  isActive: true,
  ...(includeAdmins ? {} : { role: { $ne: UserRole.Admin } })
})
  .select('firstName lastName email role')
  .limit(100)
  .lean();
```

**Cải thiện dự kiến:** Giảm từ 2-3 queries xuống 1 query

---

### 2. Cache Strategy - Chưa Tối Ưu

#### ❌ Vấn đề 2.1: Cache Invalidation Không Đầy Đủ

**Vị trí:** `server/src/controllers/techpack.controller.ts`

**Vấn đề:**
- Sau khi clone TechPack, không invalidate cache
- Cache list không được invalidate khi có thay đổi
- Cache key không nhất quán

**Giải pháp:**
```typescript
// ✅ Sau mỗi thao tác create/update/delete, invalidate cache
await CacheInvalidationUtil.invalidateTechPackCache(id);
await cacheService.delPattern('techpack:list:*'); // Invalidate all list caches
```

**Cải thiện dự kiến:** Đảm bảo data consistency, giảm stale data

---

#### ❌ Vấn đề 2.2: Cache TTL Không Phù Hợp

**Vị trí:** `server/src/controllers/techpack.controller.ts:202`

**Vấn đề:**
- Cache TTL ngắn (5 phút) cho list có thể gây nhiều cache misses
- Cache TTL dài (30 phút) cho detail có thể gây stale data

**Giải pháp:**
```typescript
// ✅ Điều chỉnh TTL dựa trên loại data
await cacheService.set(cacheKey, result, CacheTTL.SHORT); // 5 phút cho list
await cacheService.set(cacheKey, techpack, CacheTTL.MEDIUM); // 15 phút cho detail
```

---

### 3. Array Operations - Chưa Tối Ưu

#### ❌ Vấn đề 3.1: Merge Subdocument Arrays - Logic Phức Tạp

**Vị trí:** `server/src/controllers/techpack.controller.ts:25-88`

**Vấn đề:**
- Logic merge phức tạp với nhiều vòng lặp
- So sánh deep equality tốn tài nguyên
- Không có memoization

**Giải pháp:**
```typescript
// ✅ Tối ưu: Sử dụng Map để tăng tốc lookup
function mergeSubdocumentArray<T extends { _id?: Types.ObjectId; id?: string }>(
  oldArray: T[],
  newArray: T[]
): T[] {
  // Sử dụng Map thay vì array.find() để O(1) lookup
  const existingById = new Map<string, T>();
  // ... rest of logic
}
```

**Cải thiện dự kiến:** Giảm từ O(n²) xuống O(n)

---

#### ❌ Vấn đề 3.2: Array Comparison - Deep Equality Tốn Tài Nguyên

**Vị trí:** `server/src/controllers/techpack.controller.ts:676-683`

**Vấn đề:**
- Sử dụng `_.isEqual` cho mỗi item trong array
- Normalize array mỗi lần so sánh

**Giải pháp:**
```typescript
// ✅ Tối ưu: So sánh hash thay vì deep equality
const oldHash = JSON.stringify(oldNormalized);
const newHash = JSON.stringify(newNormalized);
if (oldHash === newHash) {
  // Arrays are equal, skip update
}
```

**Cải thiện dự kiến:** Giảm 50-70% thời gian so sánh

---

### 4. Database Indexes - Thiếu Một Số Indexes

#### ❌ Vấn đề 4.1: Text Search Không Tối Ưu

**Vị trí:** `server/src/controllers/techpack.controller.ts:167-168`

**Vấn đề:**
- Text search với `$regex` không tận dụng index hiệu quả
- Query chậm với dataset lớn

**Giải pháp:**
```typescript
// ✅ Sử dụng MongoDB text index
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

**Cải thiện dự kiến:** Giảm 80-90% thời gian search

---

#### ✅ Indexes Đã Có (Tốt):
- `{ technicalDesignerId: 1, createdAt: -1 }`
- `{ createdBy: 1, createdAt: -1 }`
- `{ 'sharedWith.userId': 1 }`
- `{ status: 1, updatedAt: -1 }`
- Compound indexes cho complex queries

---

## 🟡 VẤN ĐỀ FRONTEND

### 5. API Calls - Quá Nhiều Và Không Cần Thiết

#### ❌ Vấn đề 5.1: `loadTechPacks` Được Gọi Nhiều Lần

**Vị trí:** `src/contexts/TechPackContext.tsx:920-953`

**Vấn đề:**
- Dependency `techPacks.length` gây re-create function mỗi khi list thay đổi
- Có thể gọi API nhiều lần không cần thiết

**Giải pháp:**
```typescript
// ✅ Fix dependency
const loadTechPacks = useCallback(async (params = {}) => {
  // ... logic
}, []); // ✅ No dependencies - stable function reference
```

**Cải thiện dự kiến:** Giảm 50-70% số lần gọi API không cần thiết

---

#### ❌ Vấn đề 5.2: Không Có Debounce Cho Search

**Vị trí:** `src/components/TechPackList.tsx:59`

**Vấn đề:**
- Search input gọi API ngay lập tức mỗi khi user gõ
- Không có debounce

**Giải pháp:**
```typescript
// ✅ Sử dụng debounce
import { useDebounce } from '../hooks/useDebounce';

const [searchTerm, setSearchTerm] = useState('');
const debouncedSearchTerm = useDebounce(searchTerm, 500);

useEffect(() => {
  if (debouncedSearchTerm) {
    loadTechPacks({ q: debouncedSearchTerm });
  }
}, [debouncedSearchTerm]);
```

**Cải thiện dự kiến:** Giảm 80-90% số lần gọi API khi search

---

#### ❌ Vấn đề 5.3: Auto-save Quá Thường Xuyên

**Vị trí:** `src/hooks/useAutoSave.ts`

**Vấn đề:**
- Auto-save delay 2 giây có thể quá ngắn
- Không có batching cho multiple changes

**Giải pháp:**
```typescript
// ✅ Tăng delay và thêm batching
const delay = 5000; // 5 giây thay vì 2 giây
// Thêm batching logic để gộp nhiều changes
```

**Cải thiện dự kiến:** Giảm 60-70% số lần save không cần thiết

---

### 6. State Management - Chưa Tối Ưu

#### ❌ Vấn đề 6.1: TechPackContext - Quá Nhiều Re-renders

**Vị trí:** `src/contexts/TechPackContext.tsx:2212-2312`

**Vấn đề:**
- useMemo dependencies quá nhiều
- Mỗi thay đổi nhỏ gây re-render toàn bộ context

**Giải pháp:**
```typescript
// ✅ Tách context thành nhiều contexts nhỏ hơn
// TechPackListContext, TechPackFormContext, TechPackDetailContext
```

**Cải thiện dự kiến:** Giảm 40-60% số lần re-render

---

#### ❌ Vấn đề 6.2: LocalStorage - Ghi Quá Thường Xuyên

**Vị trí:** `src/contexts/TechPackContext.tsx:892-917`

**Vấn đề:**
- Ghi localStorage mỗi lần state thay đổi
- Không có debounce cho localStorage writes

**Giải pháp:**
```typescript
// ✅ Debounce localStorage writes
const debouncedSave = useDebouncedCallback(() => {
  localStorage.setItem(draftKeyRef.current, serialized);
}, 1000);
```

**Cải thiện dự kiến:** Giảm 70-80% số lần ghi localStorage

---

### 7. Component Rendering - Chưa Tối Ưu

#### ❌ Vấn đề 7.1: TechPackList - Filter Trên Client

**Vị trí:** `src/components/TechPackList.tsx:85-98`

**Vấn đề:**
- Filter trên client thay vì server
- Load toàn bộ data rồi mới filter

**Giải pháp:**
```typescript
// ✅ Filter trên server
const filteredTechPacks = useMemo(() => {
  // Chỉ filter khi cần, còn lại dùng server-side filtering
}, [safeTechPacks, searchTerm, statusFilter]);
```

**Cải thiện dự kiến:** Giảm 50-70% data transfer

---

#### ❌ Vấn đề 7.2: TechPackForm - Không Có Lazy Loading

**Vị trí:** `src/components/TechPackForm.tsx`

**Vấn đề:**
- Load tất cả tabs cùng lúc
- Không có code splitting

**Giải pháp:**
```typescript
// ✅ Lazy load tabs
const MaterialsTab = lazy(() => import('./TechPackForm/MaterialsTab'));
const MeasurementsTab = lazy(() => import('./TechPackForm/MeasurementsTab'));
```

**Cải thiện dự kiến:** Giảm 40-60% initial bundle size

---

### 8. Image Loading - Chưa Tối Ưu

#### ❌ Vấn đề 8.1: Không Có Lazy Loading Cho Images

**Vấn đề:**
- Load tất cả images cùng lúc
- Không có placeholder

**Giải pháp:**
```typescript
// ✅ Sử dụng lazy loading
<img 
  src={imageUrl} 
  loading="lazy" 
  placeholder="blur"
/>
```

**Cải thiện dự kiến:** Giảm 60-80% initial load time

---

## ✅ GIẢI PHÁP TỐI ƯU ĐỀ XUẤT

### Backend Optimizations

1. **Database Indexes** (Ưu tiên cao)
   - ✅ Đã có nhiều indexes tốt
   - ⚠️ Cần thêm text index cho search
   - ⚠️ Review compound indexes

2. **Query Optimization** (Ưu tiên cao)
   - ✅ Đã có select tối thiểu cho list view
   - ⚠️ Cần tối ưu populate
   - ⚠️ Cần lazy loading cho nested data

3. **Cache Strategy** (Ưu tiên trung bình)
   - ✅ Đã có cache service
   - ⚠️ Cần cải thiện cache invalidation
   - ⚠️ Cần điều chỉnh TTL

4. **Array Operations** (Ưu tiên thấp)
   - ⚠️ Cần tối ưu merge logic
   - ⚠️ Cần tối ưu comparison

### Frontend Optimizations

1. **API Calls** (Ưu tiên cao)
   - ⚠️ Cần debounce cho search
   - ⚠️ Cần fix loadTechPacks dependency
   - ⚠️ Cần tăng auto-save delay

2. **State Management** (Ưu tiên trung bình)
   - ⚠️ Cần tách context
   - ⚠️ Cần debounce localStorage writes

3. **Component Rendering** (Ưu tiên trung bình)
   - ⚠️ Cần lazy loading cho tabs
   - ⚠️ Cần server-side filtering

4. **Image Loading** (Ưu tiên thấp)
   - ⚠️ Cần lazy loading cho images

---

## 📊 Ước Tính Cải Thiện Tổng Thể

- **Backend Query Time:** Giảm 30-50%
- **Frontend API Calls:** Giảm 50-70%
- **Frontend Render Time:** Giảm 40-60%
- **Overall Response Time:** Giảm 40-60%
- **Data Transfer:** Giảm 50-70%

---

## 🔧 Checklist Tối Ưu

Xem file `docs/PERFORMANCE_CHECKLIST.md` để có checklist chi tiết.

---

## 📝 Lưu Ý

- Tất cả các tối ưu phải giữ nguyên chức năng hiện tại
- Không được gây ra lỗi hoặc ảnh hưởng đến các tính năng đang hoạt động
- Test kỹ sau mỗi thay đổi
- Monitor performance metrics sau khi deploy

