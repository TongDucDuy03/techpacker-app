# Performance Optimization - Implementation Examples

## 🔧 Code Examples để Implement

### 1. Fix Cache Invalidation After Clone

**File**: `server/src/controllers/techpack.controller.ts`

```typescript
// After line 460 (after sendSuccess for clone)
import CacheInvalidationUtil from '../utils/cache-invalidation.util';

// In createTechPack method, after clone success:
sendSuccess(res, newTechPack, 'TechPack cloned successfully', 201);

// ✅ Add this:
await CacheInvalidationUtil.invalidateTechPackCache(newTechPack._id.toString());
// Invalidate list cache for current user
const listCachePattern = `techpack:list:*userId:${user._id.toString()}*`;
await cacheService.delPattern(listCachePattern);
```

---

### 2. Fix loadTechPacks Dependency

**File**: `src/contexts/TechPackContext.tsx`

```typescript
// Current (WRONG):
const loadTechPacks = useCallback(async (params = {}) => {
  // ...
}, [techPacks.length]); // ❌ Re-creates function every time list changes

// Fixed (CORRECT):
const loadTechPacks = useCallback(async (params = {}) => {
  setLoading(true);
  try {
    const cacheBypassParams = { ...params, _nocache: Date.now() };
    const response = await api.listTechPacks(cacheBypassParams);
    const techPacksData = Array.isArray(response.data) ? response.data : [];
    
    setTechPacks([...techPacksData]);
    setPagination({ total: response.total, page: response.page, totalPages: response.totalPages });
  } catch (error: any) {
    showError(error.message || 'Failed to load tech packs');
    if (techPacks.length === 0) {
      setTechPacks(loadCachedTechPacks());
      setPagination(loadCachedPagination());
    }
  } finally {
    setLoading(false);
  }
}, []); // ✅ No dependencies - stable function reference
```

---

### 3. Debounce Search Input

**File**: `src/components/TechPackList.tsx`

```typescript
import { useDebouncedCallback } from 'use-debounce';

const TechPackListComponent: React.FC<TechPackListProps> = ({
  // ... props
}) => {
  const { loadTechPacks } = useTechPack();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search API call
  const debouncedLoadTechPacks = useDebouncedCallback(
    (searchValue: string) => {
      loadTechPacks({ q: searchValue, page: 1 });
      setDebouncedSearchTerm(searchValue);
    },
    500 // Wait 500ms after user stops typing
  );

  // Update local search term immediately (for UI)
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    debouncedLoadTechPacks(value);
  };

  // Use debouncedSearchTerm for API, searchTerm for local filtering
  const filteredTechPacks = useMemo(() => {
    return safeTechPacks.filter(tp => {
      const name = (tp as any).productName || tp.name || '';
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           tp.articleCode.toLowerCase().includes(searchTerm.toLowerCase());
      // ... other filters
      return matchesSearch && /* other conditions */;
    });
  }, [safeTechPacks, searchTerm, /* other filters */]);

  return (
    <Search 
      placeholder="Search by name or code" 
      value={searchTerm}
      onChange={(e) => handleSearchChange(e.target.value)}
      onSearch={(value) => {
        setSearchTerm(value);
        loadTechPacks({ q: value, page: 1 });
      }}
    />
  );
};
```

**Install dependency:**
```bash
npm install use-debounce
```

---

### 4. Debounce LocalStorage Writes

**File**: `src/contexts/TechPackContext.tsx`

```typescript
import { useDebouncedCallback } from 'use-debounce';

// In TechPackProvider component:
const debouncedSaveTechPacks = useDebouncedCallback(
  (data: ApiTechPack[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(TECHPACK_LIST_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to cache techpacks list', error);
    }
  },
  1000 // Save after 1 second of inactivity
);

// Replace existing useEffect:
useEffect(() => {
  debouncedSaveTechPacks(techPacks);
}, [techPacks, debouncedSaveTechPacks]);
```

---

### 5. Add Text Index for Search

**File**: `server/src/models/techpack.model.ts`

```typescript
// After line 451, add:
// Text search index (replaces simple text index)
TechPackSchema.index({ 
  productName: 'text', 
  articleCode: 'text',
  supplier: 'text'
}, {
  weights: {
    productName: 10,  // Highest priority
    articleCode: 5,   // Medium priority
    supplier: 1       // Lower priority
  },
  name: 'text_search_index'
});
```

**Update query in controller:**
```typescript
// server/src/controllers/techpack.controller.ts:166-169
if (q) {
  // Use $text search instead of regex (much faster)
  query.$text = { $search: q };
  // Remove old regex search
  // filterQuery.$or = [{ productName: searchRegex }, ...];
}
```

---

### 6. Optimize getShareableUsers Query

**File**: `server/src/controllers/techpack.controller.ts`

```typescript
// Current (MULTIPLE QUERIES):
const usersByRole = await User.aggregate([...]);
let shareableUsers = await User.find({...});
if (opts.includeAdmins) {
  shareableUsers = await User.find({...});
}

// Optimized (SINGLE QUERY):
const roleConditions: any[] = [
  { role: UserRole.Designer }
];
if (opts.includeAdmins) {
  roleConditions.push({ role: UserRole.Admin });
}
if (opts.includeAll) {
  roleConditions.push({}); // Match all
}

const shareableUsers = await User.find({
  $or: roleConditions,
  _id: { $ne: new Types.ObjectId(currentUserId) }
})
.select('firstName lastName email role')
.lean()
.sort({ firstName: 1, lastName: 1 });
```

---

### 7. Selective Cache Invalidation

**File**: `server/src/utils/cache-invalidation.util.ts`

```typescript
/**
 * Invalidate only caches related to specific user and filters
 */
static async invalidateTechPackListCache(
  userId: string, 
  filters?: { status?: string; season?: string; brand?: string }
): Promise<void> {
  try {
    // Invalidate user-specific list caches
    const userPattern = `techpack:list:*userId:${userId}*`;
    await cacheService.delPattern(userPattern);
    
    // If specific filters provided, invalidate those exact queries
    if (filters) {
      const queryKeys = [
        JSON.stringify({ userId, ...filters }),
        JSON.stringify({ userId, page: 1, ...filters }),
        JSON.stringify({ userId, page: 1, limit: 20, ...filters }),
      ];
      
      await Promise.all(
        queryKeys.map(key => 
          cacheService.del(CacheKeys.techpackList(key))
        )
      );
    }
  } catch (error) {
    console.error('Selective cache invalidation error:', error);
  }
}
```

**Usage in controller:**
```typescript
// After create/update/delete/clone:
await CacheInvalidationUtil.invalidateTechPackListCache(
  user._id.toString(),
  { status: req.body.status } // Only if status filter was used
);
```

---

### 8. Memoize Render Functions

**File**: `src/components/TechPackForm/tabs/BomTab.tsx`

```typescript
// Current (re-creates on every render):
const renderColorwayCell = (colorway: Colorway, item: BomItem) => {
  // ... render logic
};

// Optimized (stable reference):
const renderColorwayCell = useCallback((colorway: Colorway, item: BomItem) => {
  // ... render logic
}, []); // ✅ Empty deps if logic doesn't depend on props/state

// Or with dependencies:
const renderColorwayCell = useCallback((colorway: Colorway, item: BomItem) => {
  // ... render logic that uses canViewPrice
}, [canViewPrice]); // ✅ Only re-create if canViewPrice changes
```

---

### 9. Virtual Scrolling for Table

**File**: `src/components/TechPackList.tsx`

```typescript
import { Table } from 'antd';

<Table
  columns={columns}
  dataSource={filteredTechPacks}
  rowKey="_id"
  pagination={{
    pageSize: 20,
    showSizeChanger: true,
    showQuickJumper: true,
    total: filteredTechPacks.length,
    showTotal: (total) => `Total ${total} items`
  }}
  scroll={{ 
    y: 600,  // Virtual scroll height
    x: 'max-content' // Horizontal scroll if needed
  }}
  loading={loading}
  onRow={(record) => ({
    onDoubleClick: () => onEditTechPack?.(record),
  })}
  rowClassName="techpack-row"
/>
```

---

### 10. Split Context to Prevent Re-renders

**File**: `src/contexts/TechPackContext.tsx`

```typescript
// Create separate contexts
const TechPackListContext = createContext<{
  techPacks: ApiTechPack[];
  loading: boolean;
  pagination: Omit<TechPackListResponse, 'data'>;
  loadTechPacks: (params?: any) => Promise<void>;
  addTechPackToList: (techPack: ApiTechPack) => void;
} | null>(null);

const TechPackFormContext = createContext<{
  state: TechPackFormState;
  updateFormState: (updates: Partial<ApiTechPack>) => void;
  saveTechPack: () => Promise<void>;
  // ... other form-related methods
} | null>(null);

// In provider, split value:
const listValue = useMemo(() => ({
  techPacks,
  loading,
  pagination,
  loadTechPacks,
  addTechPackToList
}), [techPacks, loading, pagination, loadTechPacks, addTechPackToList]);

const formValue = useMemo(() => ({
  state,
  updateFormState,
  saveTechPack,
  // ... other form methods
}), [state, updateFormState, saveTechPack]);

// Return both providers:
return (
  <TechPackListContext.Provider value={listValue}>
    <TechPackFormContext.Provider value={formValue}>
      {children}
    </TechPackFormContext.Provider>
  </TechPackListContext.Provider>
);

// Create hooks:
export const useTechPackList = () => {
  const context = useContext(TechPackListContext);
  if (!context) throw new Error('useTechPackList must be used within TechPackProvider');
  return context;
};

export const useTechPackForm = () => {
  const context = useContext(TechPackFormContext);
  if (!context) throw new Error('useTechPackForm must be used within TechPackProvider');
  return context;
};
```

---

### 11. Remove Console.log in Production

**File**: `src/lib/api.ts` và các files khác

```typescript
// Create logger utility:
// src/utils/logger.ts
const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) console.log(...args);
  },
  error: (...args: any[]) => {
    console.error(...args); // Always log errors
  },
  warn: (...args: any[]) => {
    if (isDevelopment) console.warn(...args);
  }
};

// Replace all console.log:
// Before:
console.log('📡 API: listTechPacks called with params:', params);

// After:
import { logger } from '../utils/logger';
logger.log('📡 API: listTechPacks called with params:', params);
```

---

### 12. Add Request Deduplication

**File**: `src/lib/api.ts`

```typescript
class ApiClient {
  private pendingRequests = new Map<string, Promise<any>>();

  async listTechPacks(params: { page?: number; limit?: number; q?: string; status?: string; designer?: string; } = {}): Promise<TechPackListResponse> {
    // Create unique key for request
    const requestKey = `listTechPacks:${JSON.stringify(params)}`;
    
    // Check if same request is pending
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey)!;
    }
    
    // Create new request
    const requestPromise = (async () => {
      try {
        logger.log('📡 API: listTechPacks called with params:', params);
        const response = await this.axiosInstance.get<ApiResponse<ApiTechPack[]>>('/techpacks', { params });
        // ... process response
        return result;
      } finally {
        // Remove from pending after completion
        this.pendingRequests.delete(requestKey);
      }
    })();
    
    // Store pending request
    this.pendingRequests.set(requestKey, requestPromise);
    return requestPromise;
  }
}
```

---

## 📦 Dependencies cần cài đặt

```bash
# Frontend
npm install use-debounce

# Backend (nếu chưa có)
npm install compression  # Đã có trong code
```

---

## ✅ Testing Checklist

Sau khi implement mỗi optimization:

- [ ] Test với dataset nhỏ (10 techpacks)
- [ ] Test với dataset lớn (1000+ techpacks)
- [ ] Test với slow network (throttle trong DevTools)
- [ ] Test cache invalidation
- [ ] Test optimistic updates
- [ ] Monitor performance metrics
- [ ] Check bundle size (nếu thay đổi frontend)
- [ ] Verify không có regression

---

## 🎯 Implementation Order

1. **Day 1**: Fix cache invalidation + Fix loadTechPacks dependency
2. **Day 2**: Debounce search + Debounce localStorage
3. **Day 3**: Add text index + Optimize getShareableUsers
4. **Week 2**: Virtual scrolling + Memoize render functions
5. **Week 3**: Split context + Request deduplication
6. **Week 4**: Advanced optimizations (lazy loading, code splitting)

