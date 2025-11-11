# Giải thích về Revision Workflow (Status, Approve, Reject)

## 🎯 Tại sao cần có Status, Approve, Reject trong Revision?

### 1. **Workflow Approval Process (Quy trình phê duyệt)**

Trong quy trình sản xuất thời trang, mỗi thay đổi trong TechPack cần được xem xét và phê duyệt bởi các bên liên quan:

- **Designer** (Nhà thiết kế): Tạo và chỉnh sửa TechPack
- **Merchandiser** (Người mua hàng): Xem xét và phê duyệt/từ chối thay đổi
- **Admin**: Có quyền phê duyệt/từ chối tất cả

### 2. **Revision Status có 3 trạng thái:**

#### **Pending (Đang chờ)**
- Revision mới được tạo, chưa được xem xét
- Designer đã thực hiện thay đổi và đang chờ Merchandiser/Admin phê duyệt

#### **Approved (Đã phê duyệt)**
- Merchandiser/Admin đã xem xét và chấp nhận thay đổi
- Revision này được coi là hợp lệ và có thể được sử dụng
- Lịch sử phê duyệt được lưu lại (ai phê duyệt, khi nào, lý do)

#### **Rejected (Đã từ chối)**
- Merchandiser/Admin đã từ chối thay đổi
- Phải có lý do từ chối (bắt buộc)
- Designer có thể xem lý do và chỉnh sửa lại

### 3. **Lợi ích của Workflow này:**

✅ **Kiểm soát chất lượng**: Đảm bảo mọi thay đổi đều được xem xét kỹ lưỡng
✅ **Trách nhiệm rõ ràng**: Biết ai đã phê duyệt/từ chối và tại sao
✅ **Lịch sử đầy đủ**: Theo dõi được toàn bộ quá trình phê duyệt
✅ **Tuân thủ quy trình**: Đảm bảo quy trình làm việc được tuân thủ
✅ **Phân quyền**: Chỉ người có quyền mới có thể phê duyệt/từ chối

### 4. **Ví dụ thực tế:**

```
1. Designer chỉnh sửa BOM (thêm material mới)
   → Revision được tạo với status = "pending"

2. Merchandiser xem revision và phát hiện material không đúng spec
   → Merchandiser reject với lý do: "Material không đúng màu Pantone"
   → Revision status = "rejected"

3. Designer xem lý do, chỉnh sửa lại material
   → Revision mới được tạo với status = "pending"

4. Merchandiser xem lại và đồng ý
   → Merchandiser approve với lý do: "Material đã đúng spec"
   → Revision status = "approved"
```

### 5. **Code Implementation:**

- **Backend**: `server/src/controllers/revision.controller.ts`
  - `approveRevision()`: Chỉ Admin/Merchandiser mới có quyền
  - `rejectRevision()`: Bắt buộc phải có lý do

- **Frontend**: `src/features/revisions/components/ApproveRejectActions.tsx`
  - Hiển thị nút Approve/Reject chỉ cho Admin/Merchandiser
  - Nút bị disabled nếu revision đã được approve/reject

## 📝 Kết luận

Status, Approve, Reject là **cốt lõi của quy trình phê duyệt** trong hệ thống TechPack, giúp:
- Đảm bảo chất lượng và tính nhất quán
- Tạo lịch sử rõ ràng về mọi thay đổi
- Phân quyền và trách nhiệm rõ ràng
- Tuân thủ quy trình làm việc chuẩn

