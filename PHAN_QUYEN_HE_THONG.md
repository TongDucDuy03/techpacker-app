# BẢN MÔ TẢ PHÂN QUYỀN HỆ THỐNG TECHPACKER

## 1. TỔNG QUAN HỆ THỐNG PHÂN QUYỀN

Hệ thống TechPacker sử dụng **2 tầng phân quyền**:
- **Tầng 1: System Role (Vai trò hệ thống)** - Quyền cấp hệ thống, áp dụng cho toàn bộ ứng dụng
- **Tầng 2: TechPack Role (Vai trò TechPack)** - Quyền cấp TechPack, áp dụng cho từng TechPack cụ thể

---

## 2. SYSTEM ROLE (VAI TRÒ HỆ THỐNG)

### 2.1. Danh sách System Roles

| Role | Mô tả | Cấp độ |
|------|-------|--------|
| **Admin** | Quản trị viên hệ thống - Toàn quyền | 4 (Cao nhất) |
| **Designer** | Nhà thiết kế - Tạo và quản lý TechPack | 3 |
| **Merchandiser** | Người mua hàng - Xem và phê duyệt | 2 |
| **Viewer** | Người xem - Chỉ xem | 1 (Thấp nhất) |

### 2.2. Quyền hạn theo System Role

#### **Admin (Quản trị viên)**
- ✅ **Quản lý người dùng**: Tạo, sửa, xóa, quản lý vai trò, reset mật khẩu
- ✅ **Quản lý TechPack**: Tạo, xem, sửa, xóa, duplicate, bulk operations
- ✅ **Export PDF**: Xuất PDF cho mọi TechPack
- ✅ **Truy cập Admin Panel**: Xem thống kê, audit logs
- ✅ **Chia sẻ TechPack**: Có thể chia sẻ TechPack với bất kỳ vai trò nào (Owner, Admin, Editor, Viewer, Factory)
- ✅ **Xem giá BOM**: Luôn xem được Unit Price và Total Price
- ✅ **Xem tất cả tab**: Bao gồm các tab nhạy cảm (Costing, Revisions)
- ⚠️ **Lưu ý**: Admin không thể bị chia sẻ TechPack (hệ thống tự động từ chối)

#### **Designer (Nhà thiết kế)**
- ✅ **Tạo TechPack**: Tạo TechPack mới
- ✅ **Quản lý TechPack của mình**: Sửa, xóa, duplicate TechPack do mình tạo
- ✅ **Export PDF**: Xuất PDF cho TechPack có quyền truy cập
- ✅ **Xem giá BOM**: Xem Unit Price và Total Price trong TechPack của mình
- ✅ **Chia sẻ TechPack**: Có thể chia sẻ TechPack với các vai trò: Owner, Editor, Viewer
- ❌ **Không thể chia sẻ**: Không thể cấp quyền Admin hoặc Factory cho người khác
- ❌ **Không có quyền**: Quản lý người dùng, bulk operations, admin panel

#### **Merchandiser (Người mua hàng)**
- ✅ **Xem TechPack**: Xem tất cả TechPack trong hệ thống
- ✅ **Export PDF**: Xuất PDF cho TechPack có quyền truy cập
- ✅ **Phê duyệt Revision**: Phê duyệt/từ chối các revision
- ✅ **Chia sẻ TechPack**: Có thể chia sẻ TechPack với các vai trò: Editor, Viewer
- ❌ **Không thể tạo/sửa**: Không thể tạo, sửa, xóa TechPack
- ❌ **Không xem giá**: Không xem được Unit Price và Total Price trong BOM (trừ khi được chia sẻ với role > Viewer)

#### **Viewer (Người xem)**
- ✅ **Xem TechPack**: Xem TechPack được chia sẻ
- ✅ **Export PDF**: Xuất PDF cho TechPack có quyền truy cập
- ✅ **Chia sẻ TechPack**: Có thể chia sẻ TechPack với các vai trò: Viewer, Factory
- ❌ **Chỉ xem**: Không thể tạo, sửa, xóa TechPack
- ❌ **Không xem giá**: Không xem được Unit Price và Total Price trong BOM
- ❌ **Không xem tab nhạy cảm**: Không xem được các tab như Costing, Revisions (nếu role = Factory)

---

## 3. TECHPACK ROLE (VAI TRÒ TECHPACK)

### 3.1. Danh sách TechPack Roles

| Role | Icon | Mô tả | Quyền hạn |
|------|------|-------|-----------|
| **Owner** | 👑 Crown | Chủ sở hữu TechPack | Toàn quyền (xem, sửa, chia sẻ, xóa) |
| **Admin** | 🛡️ Shield | Quản trị TechPack | Xem, sửa, chia sẻ (không xóa) |
| **Editor** | ✏️ PenTool | Biên tập viên | Xem, sửa (không chia sẻ, không xóa) |
| **Viewer** | 👁️ Eye | Người xem | Chỉ xem (không sửa, không chia sẻ) |
| **Factory** | 🏭 Factory | Nhà máy | Xem hạn chế (không xem tab nhạy cảm) |

### 3.2. Quyền hạn theo TechPack Role

#### **Owner (Chủ sở hữu)**
- ✅ **Xem**: Xem toàn bộ nội dung TechPack
- ✅ **Sửa**: Sửa tất cả thông tin TechPack
- ✅ **Chia sẻ**: Chia sẻ TechPack với người khác, cấp quyền Admin/Editor/Viewer/Factory
- ✅ **Xóa**: Xóa (archive) TechPack
- ✅ **Xem giá**: Xem Unit Price và Total Price trong BOM
- ✅ **Xem tất cả tab**: Bao gồm các tab nhạy cảm
- ✅ **Quản lý quyền**: Cập nhật role của người được chia sẻ
- ✅ **Thu hồi quyền**: Xóa quyền truy cập của người được chia sẻ
- ⚠️ **Lưu ý**: Owner được tự động gán cho người tạo TechPack

#### **Admin (Quản trị TechPack)**
- ✅ **Xem**: Xem toàn bộ nội dung TechPack
- ✅ **Sửa**: Sửa tất cả thông tin TechPack
- ✅ **Chia sẻ**: Chia sẻ TechPack với người khác, cấp quyền Admin/Editor/Viewer/Factory
- ✅ **Xem giá**: Xem Unit Price và Total Price trong BOM
- ✅ **Xem tất cả tab**: Bao gồm các tab nhạy cảm
- ✅ **Quản lý quyền**: Cập nhật role của người được chia sẻ
- ✅ **Thu hồi quyền**: Xóa quyền truy cập của người được chia sẻ
- ❌ **Không xóa**: Không thể xóa TechPack (chỉ Owner mới xóa được)

#### **Editor (Biên tập viên)**
- ✅ **Xem**: Xem toàn bộ nội dung TechPack
- ✅ **Sửa**: Sửa tất cả thông tin TechPack
- ✅ **Xem giá**: Xem Unit Price và Total Price trong BOM
- ✅ **Xem tất cả tab**: Bao gồm các tab nhạy cảm
- ❌ **Không chia sẻ**: Không thể chia sẻ TechPack với người khác
- ❌ **Không xóa**: Không thể xóa TechPack
- ❌ **Không quản lý quyền**: Không thể cập nhật role của người khác

#### **Viewer (Người xem)**
- ✅ **Xem**: Xem toàn bộ nội dung TechPack
- ✅ **Export PDF**: Xuất PDF TechPack
- ❌ **Không sửa**: Không thể sửa bất kỳ thông tin nào
- ❌ **Không xem giá**: Không xem được Unit Price và Total Price trong BOM
- ❌ **Không chia sẻ**: Không thể chia sẻ TechPack
- ❌ **Không xóa**: Không thể xóa TechPack
- ⚠️ **Lưu ý**: Viewer vẫn xem được các tab nhạy cảm (trừ Factory)

#### **Factory (Nhà máy)**
- ✅ **Xem**: Xem nội dung TechPack (hạn chế)
- ✅ **Export PDF**: Xuất PDF TechPack
- ❌ **Không sửa**: Không thể sửa bất kỳ thông tin nào
- ❌ **Không xem giá**: Không xem được Unit Price và Total Price trong BOM
- ❌ **Không xem tab nhạy cảm**: Không xem được các tab như Costing, Revisions
- ❌ **Không chia sẻ**: Không thể chia sẻ TechPack
- ❌ **Không xóa**: Không thể xóa TechPack
- ⚠️ **Mục đích**: Dành cho nhà máy sản xuất, chỉ cần xem thông tin kỹ thuật, không cần xem thông tin giá cả và chi phí

---

## 4. QUY TẮC ÁP DỤNG QUYỀN (EFFECTIVE ROLE)

### 4.1. Nguyên tắc Effective Role

Hệ thống sử dụng **Effective Role** để xác định quyền thực tế của người dùng:
- **Effective Role** = Quyền thấp hơn giữa System Role và TechPack Role
- Ví dụ: User có System Role = Designer, được chia sẻ với TechPack Role = Admin
  - Effective Role = Admin (vì Designer có thể được cấp Admin)
- Ví dụ: User có System Role = Viewer, được chia sẻ với TechPack Role = Admin
  - Effective Role = Viewer (vì Viewer không thể được cấp Admin, hệ thống tự động downgrade)

### 4.2. Bảng ánh xạ System Role → TechPack Role được phép

| System Role | TechPack Roles được phép cấp |
|-------------|------------------------------|
| **Admin** | Owner, Admin, Editor, Viewer, Factory |
| **Designer** | Owner, Editor, Viewer |
| **Merchandiser** | Editor, Viewer |
| **Viewer** | Viewer, Factory |

### 4.3. Quy tắc chia sẻ

1. **Không thể chia sẻ với chính mình**: Hệ thống tự động từ chối
2. **Không thể chia sẻ với System Admin**: Hệ thống tự động từ chối (Admin đã có toàn quyền)
3. **Không thể cấp Owner qua chia sẻ**: Owner chỉ được gán tự động cho người tạo TechPack
4. **Chỉ Owner/Admin mới chia sẻ được**: Editor, Viewer, Factory không thể chia sẻ
5. **Designer không thể chia sẻ**: Mặc dù Designer có thể tạo TechPack, nhưng không thể chia sẻ (chỉ Owner/Admin mới chia sẻ được)

---

## 5. QUYỀN TRUY CẬP THEO CHỨC NĂNG

### 5.1. Quản lý TechPack

| Hành động | Admin | Designer | Merchandiser | Viewer |
|-----------|-------|----------|--------------|--------|
| **Tạo TechPack** | ✅ | ✅ | ❌ | ❌ |
| **Xem TechPack** | ✅ (Tất cả) | ✅ (Của mình + được chia sẻ) | ✅ (Tất cả) | ✅ (Được chia sẻ) |
| **Sửa TechPack** | ✅ (Tất cả) | ✅ (Của mình + được chia sẻ với role ≥ Editor) | ❌ | ❌ |
| **Xóa TechPack** | ✅ (Tất cả) | ✅ (Chỉ của mình) | ❌ | ❌ |
| **Duplicate TechPack** | ✅ | ✅ | ❌ | ❌ |
| **Bulk Operations** | ✅ | ❌ | ❌ | ❌ |
| **Export PDF** | ✅ | ✅ | ✅ | ✅ |

### 5.2. Quản lý BOM (Bill of Materials)

| Hành động | Owner/Admin | Editor | Viewer/Factory |
|-----------|-------------|--------|---------------|
| **Xem BOM** | ✅ | ✅ | ✅ |
| **Thêm BOM Item** | ✅ | ✅ | ❌ |
| **Sửa BOM Item** | ✅ | ✅ | ❌ |
| **Xóa BOM Item** | ✅ | ✅ | ❌ |
| **Xem Unit Price** | ✅ | ✅ | ❌ |
| **Xem Total Price** | ✅ | ✅ | ❌ |
| **Import CSV** | ✅ | ✅ | ❌ |
| **Export CSV** | ✅ (Có giá) | ✅ (Có giá) | ✅ (Không có giá) |

### 5.3. Quản lý Measurements

| Hành động | Owner/Admin | Editor | Viewer/Factory |
|-----------|-------------|--------|-----------------|
| **Xem Measurements** | ✅ | ✅ | ✅ |
| **Thêm Measurement** | ✅ | ✅ | ❌ |
| **Sửa Measurement** | ✅ | ✅ | ❌ |
| **Xóa Measurement** | ✅ | ✅ | ❌ |
| **Duplicate Measurement** | ✅ | ✅ | ❌ |
| **Bulk Operations** | ✅ | ✅ | ❌ |

### 5.4. Quản lý Sharing (Tab Share)

| Hành động | Owner/Admin | Editor | Viewer/Factory |
|-----------|------------|--------|----------------|
| **Xem danh sách người được chia sẻ** | ✅ | ❌ | ❌ |
| **Thêm người vào danh sách chia sẻ** | ✅ | ❌ | ❌ |
| **Cập nhật role của người được chia sẻ** | ✅ | ❌ | ❌ |
| **Xóa quyền truy cập** | ✅ | ❌ | ❌ |
| **Xem audit logs** | ✅ (Owner/Admin) | ❌ | ❌ |

### 5.5. Quản lý Revisions

| Hành động | Owner/Admin | Editor | Viewer | Factory |
|-----------|-------------|--------|--------|---------|
| **Xem Revisions** | ✅ | ✅ | ✅ | ❌ |
| **Tạo Revision** | ✅ | ✅ | ❌ | ❌ |
| **Phê duyệt Revision** | ✅ (Admin) | ❌ | ❌ | ❌ |
| **Phê duyệt Revision** | ✅ (Merchandiser) | ❌ | ❌ | ❌ |

### 5.6. Quản lý Costing

| Hành động | Owner/Admin | Editor | Viewer | Factory |
|-----------|-------------|--------|--------|---------|
| **Xem Costing** | ✅ | ✅ | ✅ | ❌ |
| **Sửa Costing** | ✅ | ✅ | ❌ | ❌ |

---

## 6. QUYỀN XEM GIÁ BOM (UNIT PRICE / TOTAL PRICE)

### 6.1. Quy tắc hiển thị giá

| System Role | TechPack Role | Xem được giá? |
|-------------|---------------|---------------|
| Admin | Bất kỳ | ✅ Luôn xem được |
| Designer | Owner | ✅ |
| Designer | Admin | ✅ |
| Designer | Editor | ✅ |
| Designer | Viewer | ❌ |
| Merchandiser | Editor | ✅ |
| Merchandiser | Viewer | ❌ |
| Viewer | Viewer | ❌ |
| Viewer | Factory | ❌ |

### 6.2. Ẩn/hiện giá trong UI

- **Form thêm/sửa BOM**: Chỉ hiển thị trường Unit Price và Total Price nếu `canViewPrice = true`
- **Bảng BOM**: Chỉ hiển thị cột Unit Price và Total Price nếu `canViewPrice = true`
- **Export CSV**: Chỉ export Unit Price và Total Price nếu `canViewPrice = true`
- **Export PDF**: Giá luôn được hiển thị trong PDF (không phụ thuộc quyền)

---

## 7. QUYỀN XEM TAB NHẠY CẢM

### 7.1. Danh sách tab nhạy cảm

- **Costing Tab**: Thông tin chi phí
- **Revisions Tab**: Lịch sử thay đổi và phê duyệt

### 7.2. Quy tắc truy cập

| TechPack Role | Xem được tab nhạy cảm? |
|--------------|------------------------|
| Owner | ✅ |
| Admin | ✅ |
| Editor | ✅ |
| Viewer | ✅ |
| Factory | ❌ |

---

## 8. AUDIT LOGS (NHẬT KÝ HOẠT ĐỘNG)

### 8.1. Quyền xem Audit Logs

- ✅ **Owner**: Xem audit logs của TechPack mình sở hữu
- ✅ **Admin (System)**: Xem tất cả audit logs
- ❌ **Editor/Viewer/Factory**: Không xem được audit logs

### 8.2. Các hành động được ghi log

- `share_granted`: Chia sẻ TechPack với người dùng
- `share_revoked`: Thu hồi quyền truy cập
- `role_changed`: Thay đổi role của người được chia sẻ

---

## 9. QUY TẮC ĐẶC BIỆT

### 9.1. Global Admin Override

- **System Admin** luôn có quyền truy cập tất cả TechPack, bất kể có được chia sẻ hay không
- **System Admin** luôn có quyền xem giá BOM
- **System Admin** luôn có quyền chia sẻ TechPack
- **System Admin** không thể bị chia sẻ TechPack (hệ thống tự động từ chối)

### 9.2. Owner Privileges

- **Owner** là người tạo TechPack, được gán tự động
- **Owner** có quyền xóa TechPack (archive)
- **Owner** không thể bị xóa khỏi danh sách chia sẻ
- **Owner** không thể bị thay đổi role (luôn là Owner)

### 9.3. Designer Sharing Restriction

- **Designer** có thể tạo TechPack và trở thành Owner
- **Designer** KHÔNG thể chia sẻ TechPack (chỉ Owner/Admin mới chia sẻ được)
- **Designer** chỉ có thể chia sẻ nếu được cấp quyền Admin trong TechPack cụ thể

---

## 10. TÓM TẮT QUYỀN HẠN

### 10.1. Matrix quyền System Role

| Hành động | Admin | Designer | Merchandiser | Viewer |
|-----------|-------|----------|--------------|--------|
| **Quản lý người dùng** | ✅ | ❌ | ❌ | ❌ |
| **Tạo TechPack** | ✅ | ✅ | ❌ | ❌ |
| **Sửa TechPack** | ✅ (Tất cả) | ✅ (Của mình) | ❌ | ❌ |
| **Xóa TechPack** | ✅ (Tất cả) | ✅ (Của mình) | ❌ | ❌ |
| **Chia sẻ TechPack** | ✅ | ❌* | ✅ | ✅ |
| **Xem giá BOM** | ✅ | ✅ | ✅** | ❌ |
| **Phê duyệt Revision** | ✅ | ❌ | ✅ | ❌ |
| **Bulk Operations** | ✅ | ❌ | ❌ | ❌ |

*Designer chỉ chia sẻ được nếu là Owner/Admin của TechPack
**Merchandiser chỉ xem được giá nếu được chia sẻ với role > Viewer

### 10.2. Matrix quyền TechPack Role

| Hành động | Owner | Admin | Editor | Viewer | Factory |
|-----------|-------|-------|--------|--------|---------|
| **Xem TechPack** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Sửa TechPack** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Xóa TechPack** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Chia sẻ TechPack** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Xem giá BOM** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Xem tab nhạy cảm** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Xem audit logs** | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 11. KHUYẾN NGHỊ SỬ DỤNG

### 11.1. Phân quyền cho nhóm làm việc

- **Nhóm thiết kế**: System Role = Designer → Tạo TechPack, trở thành Owner → Chia sẻ với Editor để cộng tác
- **Nhóm mua hàng**: System Role = Merchandiser → Xem TechPack, phê duyệt Revision
- **Nhà máy sản xuất**: TechPack Role = Factory → Chỉ xem thông tin kỹ thuật, không xem giá
- **Khách hàng/Đối tác**: TechPack Role = Viewer → Chỉ xem, không sửa

### 11.2. Best Practices

1. **Nguyên tắc tối thiểu quyền**: Chỉ cấp quyền tối thiểu cần thiết
2. **Kiểm tra định kỳ**: Review danh sách người được chia sẻ định kỳ
3. **Audit logs**: Sử dụng audit logs để theo dõi hoạt động
4. **Factory role**: Sử dụng Factory role cho nhà máy để bảo vệ thông tin giá cả

---

## 12. LƯU Ý KỸ THUẬT

### 12.1. Backward Compatibility

- Hệ thống vẫn hỗ trợ field `permission` (view/edit) để tương thích với code cũ
- Field `role` là field chính, `permission` được tính toán tự động từ `role`

### 12.2. Effective Role Calculation

- Hệ thống tự động tính toán Effective Role dựa trên System Role và TechPack Role
- Effective Role được sử dụng để kiểm tra quyền thực tế của người dùng

### 12.3. API Endpoints

- `GET /api/techpacks/:id/access-list`: Lấy danh sách người được chia sẻ (chỉ Owner/Admin)
- `POST /api/techpacks/:id/share`: Chia sẻ TechPack (chỉ Owner/Admin)
- `PUT /api/techpacks/:id/share/:userId`: Cập nhật role (chỉ Owner/Admin)
- `DELETE /api/techpacks/:id/share/:userId`: Thu hồi quyền (chỉ Owner/Admin)
- `GET /api/techpacks/:id/shareable-users`: Lấy danh sách người có thể chia sẻ (chỉ Owner/Admin)

---

**Tài liệu này được tạo dựa trên phân tích code thực tế của hệ thống TechPacker.**
**Ngày cập nhật: 2024**

