# 📊 Phân tích chức năng Revision hiện tại

## ✅ Đã hoàn thành (Backend)

### 1. Xem lịch sử thay đổi (Revision History) ✅
**Endpoint:** `GET /api/v1/techpacks/:id/revisions`

**Đã có:**
- ✅ Pagination với limit clamp (10-50)
- ✅ Hiển thị version, createdBy, createdAt, summary
- ✅ Filter theo changeType, createdBy
- ✅ Ẩn snapshot trong list view (tối ưu hiệu năng)
- ✅ Parallelize queries
- ✅ Quyền truy cập: Viewer/Editor/Owner/Admin đều xem được

**Cần bổ sung (Frontend):**
- UI hiển thị danh sách revision
- Lazy-load hoặc infinite scroll cho nhiều revision

---

### 2. Xem chi tiết một revision ✅
**Endpoint:** `GET /api/v1/revisions/:id`

**Đã có:**
- ✅ Trả về đầy đủ thông tin: version, createdBy, createdAt, description
- ✅ Có snapshot đầy đủ để xem chi tiết
- ✅ Populate createdBy, approvedBy
- ✅ Quyền truy cập đúng

**Cần bổ sung (Frontend):**
- UI pane bên phải hiển thị chi tiết
- Preview ảnh/tài liệu nếu có trong snapshot

---

### 3. So sánh hai revision ✅
**Endpoint:** `GET /api/v1/techpacks/:id/revisions/compare?from=revisionId1&to=revisionId2`

**Đã có:**
- ✅ Field-level diff với old/new values
- ✅ Limit diff size (max 100 fields) với flag `hasMore`
- ✅ Validate snapshots tồn tại
- ✅ Summary changes theo section

**Cần bổ sung (Frontend):**
- UI highlight giá trị cũ/mới
- Expand/collapse cho diff lớn
- Loading spinner khi so sánh

---

### 4. Revert (Hoàn tác) ✅
**Endpoint:** `POST /api/v1/revisions/revert/:techPackId/:revisionId`

**Đã có:**
- ✅ Non-destructive: tạo rollback revision mới
- ✅ Atomic transaction (TechPack + Revision cùng commit)
- ✅ Quyền truy cập: Owner/Editor/Admin mới revert được
- ✅ Chặn revert to rollback revision
- ✅ Validate snapshot tồn tại
- ✅ Version auto-increment
- ✅ Cache invalidation sau revert
- ✅ Ghi `revertedFrom` trong revision mới

**Cần bổ sung:**
- ⚠️ **Thiếu:** Audit log cho revert action
- ⚠️ **Thiếu:** Notification cho stakeholders
- ⚠️ **Thiếu:** Thêm description/reason khi revert (hiện chỉ có auto description)

**Cần bổ sung (Frontend):**
- Dialog xác nhận revert với thông tin rõ ràng
- Success toast notification
- Disable nút Revert cho Viewer/Technical Designer
- Tooltip giải thích khi disabled

---

## ❌ Còn thiếu (Backend)

### 5. Bình luận trên revision ❌
**Thiếu hoàn toàn:**
- ❌ Không có endpoint để thêm comment vào revision
- ❌ Model không có field `comments` (array)
- ❌ Không có endpoint `POST /api/v1/revisions/:id/comments`

**Cần implement:**
```typescript
// Thêm vào Revision model
comments: [{
  userId: ObjectId,
  userName: string,
  comment: string,
  createdAt: Date
}]

// Endpoint mới
POST /api/v1/revisions/:id/comments
Body: { comment: string }
```

---

### 6. Phê duyệt revision ❌
**Model có field nhưng không có endpoint:**
- ✅ Model có: `approvedBy`, `approvedByName`, `approvedAt`
- ❌ Không có endpoint để approve/reject revision
- ❌ Không có workflow tích hợp

**Cần implement:**
```typescript
// Endpoints mới
POST /api/v1/revisions/:id/approve
POST /api/v1/revisions/:id/reject
Body: { reason?: string }
```

---

### 7. Thông báo & Notification ❌
**Thiếu hoàn toàn:**
- ❌ Không có notification system
- ❌ Không gửi thông báo sau revert
- ❌ Không thông báo cho owner/shared users

**Cần implement:**
- Notification service (email/in-app)
- Gửi notification sau revert cho:
  - Owner
  - Shared users (editor/viewer)
  - Technical Designer

---

### 8. Audit Log ⚠️
**Một phần:**
- ✅ Có activity logger (`logActivity`)
- ❌ **Thiếu:** Gọi `logActivity` trong `revertToRevision`
- ❌ Không log revision creation trong `getTechPackRevisions`

**Cần sửa:**
- Thêm `logActivity` vào `revertToRevision` sau khi commit thành công

---

## 📋 Edge Cases đã xử lý

| Edge Case | Trạng thái | Xử lý |
|-----------|------------|-------|
| Revision thiếu snapshot | ✅ | Validate và trả lỗi 400 |
| Revert bởi user không đủ quyền | ✅ | Check `hasEditAccess()` và trả 403 |
| So sánh revision lớn | ✅ | Limit 100 fields + flag `hasMore` |
| Revert to rollback revision | ✅ | Chặn và trả lỗi 400 |
| Invalid ObjectId | ✅ | Validate tất cả ID trước khi query |
| Concurrent edits | ⚠️ | Transaction đảm bảo atomicity, nhưng không có conflict detection |

---

## 🎯 Tóm tắt: Đã có vs Còn thiếu

### ✅ Đã đủ (80%)
1. ✅ Xem lịch sử revision với pagination
2. ✅ Xem chi tiết revision
3. ✅ So sánh hai revision
4. ✅ Revert non-destructive với transaction
5. ✅ Quyền truy cập đúng (Viewer chỉ xem, Editor/Owner revert được)
6. ✅ Edge cases: missing snapshot, rollback target, permission

### ⚠️ Cần bổ sung (20%)
1. ❌ **Comments trên revision** - Thiếu hoàn toàn
2. ❌ **Approve/Reject revision** - Model có nhưng không có endpoint
3. ❌ **Notification system** - Thiếu hoàn toàn
4. ⚠️ **Audit log** - Có service nhưng chưa dùng trong revert
5. ⚠️ **Revert reason/description** - Chưa cho phép user nhập lý do

---

## 🚀 Khuyến nghị implement tiếp theo

### Priority 1 (Quan trọng)
1. **Thêm audit log cho revert**
   ```typescript
   // Trong revertToRevision, sau commitTransaction
   await logActivity({
     userId: user._id,
     userName: `${user.firstName} ${user.lastName}`,
     action: ActivityAction.TECHPACK_UPDATE,
     target: {
       type: 'TechPack',
       id: savedTechpack._id,
       name: savedTechpack.productName
     },
     details: {
       action: 'revert',
       revertedToVersion: targetRevision.version,
       newVersion: newVersion
     },
     req
   });
   ```

2. **Thêm description/reason khi revert**
   ```typescript
   // Thêm vào request body
   const { reason } = req.body;
   // Sử dụng trong description
   description: reason || `Reverted to revision ${targetRevision.version}...`
   ```

### Priority 2 (Nice to have)
3. **Comments trên revision**
   - Thêm field `comments` vào Revision model
   - Endpoint `POST /api/v1/revisions/:id/comments`

4. **Approve/Reject revision**
   - Endpoints `POST /api/v1/revisions/:id/approve` và `/reject`
   - Check quyền (chỉ Admin/Merchandiser)

5. **Notification system**
   - Tạo notification service
   - Gửi notification sau revert

---

## ✅ Acceptance Checklist

| Yêu cầu | Trạng thái | Ghi chú |
|---------|------------|---------|
| Hiển thị đầy đủ lịch sử với pagination | ✅ | Có pagination, limit 10-50 |
| Chi tiết revision rõ ràng | ✅ | Có version, createdBy, createdAt, summary, diff |
| So sánh revision dễ dùng | ✅ | Có field-level diff với old/new |
| Revert non-destructive | ✅ | Tạo rollback revision mới |
| Quyền đúng (Viewer chỉ xem, Editor revert) | ✅ | `hasViewAccess()` và `hasEditAccess()` |
| Chặn revert to rollback | ✅ | Validate `changeType !== 'rollback'` |
| Versioning đúng | ✅ | Auto-increment version |
| Undo trace (revertFrom) | ✅ | Ghi `revertedFrom` và `revertedFromId` |
| Snapshot completeness | ✅ | Validate snapshot tồn tại |
| Audit & notifications | ⚠️ | Có audit service nhưng chưa dùng trong revert |
| Comments | ❌ | Thiếu hoàn toàn |
| Approval workflow | ⚠️ | Model có nhưng không có endpoint |

---

## 📝 Kết luận

**Backend đã đủ ~80% yêu cầu cốt lõi:**
- ✅ Core features: View, Compare, Revert đều hoạt động tốt
- ✅ Security: Quyền truy cập đúng, validation đầy đủ
- ✅ Reliability: Transaction atomic, error handling tốt

**Cần bổ sung:**
- ⚠️ Audit log trong revert (dễ, 5 phút)
- ⚠️ Revert reason/description (dễ, 10 phút)
- ❌ Comments (trung bình, 30 phút)
- ❌ Approval endpoints (trung bình, 30 phút)
- ❌ Notification system (khó, 2-3 giờ)

**Frontend cần implement:**
- UI cho tất cả các endpoint hiện có
- Handle edge cases (missing snapshot, permission errors)
- Confirmation dialogs và notifications


