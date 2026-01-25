# HƯỚNG DẪN PHÂN QUYỀN HỆ THỐNG TECHPACKER

## 📋 MỤC LỤC

1. [Giới thiệu về hệ thống phân quyền](#1-giới-thiệu-về-hệ-thống-phân-quyền)
2. [Vai trò hệ thống (System Roles)](#2-vai-trò-hệ-thống-system-roles)
3. [Vai trò TechPack (TechPack Roles)](#3-vai-trò-techpack-techpack-roles)
   - [3.1. So sánh Viewer và Factory](#31-so-sánh-viewer-và-factory---sự-khác-biệt-quan-trọng)
4. [Bạn có thể làm gì với từng vai trò?](#4-bạn-có-thể-làm-gì-với-từng-vai-trò)
5. [Quyền xem giá và thông tin nhạy cảm](#5-quyền-xem-giá-và-thông-tin-nhạy-cảm)
6. [Cách chia sẻ TechPack](#6-cách-chia-sẻ-techpack)
7. [Các tình huống thường gặp](#7-các-tình-huống-thường-gặp)

---

## 1. GIỚI THIỆU VỀ HỆ THỐNG PHÂN QUYỀN

Hệ thống TechPacker sử dụng **2 loại vai trò** để quản lý quyền truy cập:

### 🔹 Vai trò hệ thống (System Role)
- Được cấp bởi quản trị viên khi tạo tài khoản
- Áp dụng cho **toàn bộ hệ thống**
- Xác định bạn có thể làm gì trong ứng dụng

### 🔹 Vai trò TechPack (TechPack Role)
- Được cấp khi TechPack được chia sẻ với bạn
- Áp dụng cho **từng TechPack cụ thể**
- Xác định bạn có thể làm gì với TechPack đó

**Ví dụ**: Bạn có thể là Designer (vai trò hệ thống) nhưng được chia sẻ một TechPack với vai trò Viewer (vai trò TechPack) - bạn chỉ có thể xem TechPack đó, không thể sửa.

---

## 2. VAI TRÒ HỆ THỐNG (SYSTEM ROLES)

Khi đăng ký tài khoản, bạn sẽ được cấp một trong các vai trò sau:

| Vai trò | Icon | Mô tả | Ai thường có vai trò này? |
|---------|------|-------|---------------------------|
| **Admin** | 🛡️ | Quản trị viên hệ thống - Có toàn quyền | Quản lý hệ thống, IT |
| **Designer** | ✏️ | Nhà thiết kế - Tạo và quản lý TechPack | Nhà thiết kế sản phẩm |
| **Merchandiser** | 📋 | Người mua hàng - Xem và phê duyệt | Người mua hàng, quản lý sản phẩm |
| **Viewer** | 👁️ | Người xem - Chỉ xem | Khách hàng, đối tác |

### Bảng quyền hạn theo vai trò hệ thống

| Bạn muốn làm gì? | Admin | Designer | Merchandiser | Viewer |
|------------------|-------|----------|--------------|--------|
| **Quản lý người dùng** (tạo, sửa, xóa tài khoản) | ✅ Có thể | ❌ Không | ❌ Không | ❌ Không |
| **Tạo TechPack mới** | ✅ Có thể | ✅ Có thể | ❌ Không | ❌ Không |
| **Xem TechPack** | ✅ Tất cả TechPack | ✅ TechPack của mình + được chia sẻ | ✅ Tất cả TechPack | ✅ Chỉ TechPack được chia sẻ |
| **Sửa TechPack** | ✅ Tất cả TechPack | ✅ TechPack của mình + được chia sẻ với quyền Editor trở lên | ❌ Không | ❌ Không |
| **Xóa TechPack** | ✅ Tất cả TechPack | ✅ Chỉ TechPack của mình | ❌ Không | ❌ Không |
| **Sao chép TechPack** | ✅ Có thể | ✅ Có thể | ❌ Không | ❌ Không |
| **Xuất PDF** | ✅ Có thể | ✅ Có thể | ✅ Có thể | ✅ Có thể |
| **Chia sẻ TechPack với người khác** | ✅ Có thể cấp mọi vai trò | ⚠️ Chỉ khi là Owner/Admin của TechPack | ✅ Có thể cấp Editor, Viewer | ✅ Có thể cấp Viewer, Factory |
| **Xem giá trong BOM** | ✅ Luôn xem được | ✅ Trong TechPack của mình | ⚠️ Chỉ khi được chia sẻ với quyền Editor trở lên | ❌ Không |
| **Phê duyệt Revision** | ✅ Có thể | ❌ Không | ✅ Có thể | ❌ Không |
| **Truy cập trang quản trị** | ✅ Có thể | ❌ Không | ❌ Không | ❌ Không |

---

## 3. VAI TRÒ TECHPACK (TECHPACK ROLES)

Khi TechPack được chia sẻ với bạn, bạn sẽ nhận một trong các vai trò sau:

| Vai trò | Icon | Mô tả | Quyền hạn |
|---------|------|-------|-----------|
| **Owner** | 👑 | Chủ sở hữu TechPack | Toàn quyền - Xem, sửa, chia sẻ, xóa |
| **Admin** | 🛡️ | Quản trị TechPack | Xem, sửa, chia sẻ (không xóa được) |
| **Editor** | ✏️ | Biên tập viên | Xem, sửa (không chia sẻ được) |
| **Viewer** | 👁️ | Người xem | Chỉ xem (không sửa được) |
| **Factory** | 🏭 | Nhà máy | Xem hạn chế (không xem giá, không xem tab nhạy cảm) |

### Bảng quyền hạn theo vai trò TechPack

| Bạn muốn làm gì? | Owner | Admin | Editor | Viewer | Factory |
|------------------|-------|-------|--------|--------|---------|
| **Xem TechPack** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Sửa thông tin TechPack** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Xóa TechPack** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Chia sẻ TechPack với người khác** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Thay đổi quyền của người được chia sẻ** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Xem giá trong BOM** (Unit Price, Total Price) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Xem tab Costing** (Chi phí) | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Xem tab Revisions** (Lịch sử thay đổi) | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Xem lịch sử hoạt động** (Audit Logs) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Xuất PDF** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 3.1. SO SÁNH VIEWER VÀ FACTORY - SỰ KHÁC BIỆT QUAN TRỌNG

Cả **Viewer** và **Factory** đều là vai trò chỉ xem (không thể sửa), nhưng có những khác biệt quan trọng:

### Bảng so sánh chi tiết

| Tính năng | Viewer 👁️ | Factory 🏭 |
|-----------|------------|-----------|
| **Xem thông tin TechPack** | ✅ Xem đầy đủ | ✅ Xem đầy đủ |
| **Xem giá trong BOM** (Unit Price, Total Price) | ❌ **Không xem được** | ❌ **Không xem được** |
| **Xem tab Costing** (Chi phí sản xuất) | ✅ **Xem được** | ❌ **Không xem được** |
| **Xem tab Revisions** (Lịch sử thay đổi) | ✅ **Xem được** | ❌ **Không xem được** |
| **Xuất PDF** | ✅ Có thể | ✅ Có thể |
| **Sửa thông tin** | ❌ Không thể | ❌ Không thể |
| **Chia sẻ TechPack** | ❌ Không thể | ❌ Không thể |

### Tóm tắt sự khác biệt

**Viewer (Người xem)**:
- ✅ Xem được **TẤT CẢ** các tab, bao gồm cả tab nhạy cảm (Costing, Revisions)
- ❌ Không xem được giá trong BOM
- 👥 **Phù hợp cho**: Khách hàng, đối tác, người cần xem đầy đủ thông tin nhưng không cần biết giá

**Factory (Nhà máy)**:
- ✅ Xem được thông tin kỹ thuật (BOM, Measurements, Specifications...)
- ❌ **KHÔNG xem được** tab Costing (chi phí)
- ❌ **KHÔNG xem được** tab Revisions (lịch sử thay đổi)
- ❌ Không xem được giá trong BOM
- 🏭 **Phù hợp cho**: Nhà máy sản xuất chỉ cần thông tin kỹ thuật để sản xuất, không cần biết giá cả và chi phí

### Khi nào nên dùng Viewer? Khi nào nên dùng Factory?

**Dùng Viewer khi**:
- Bạn muốn người nhận xem được **đầy đủ** thông tin TechPack (bao gồm cả Costing và Revisions)
- Người nhận là khách hàng, đối tác cần xem toàn bộ quá trình phát triển sản phẩm
- Bạn muốn minh bạch về chi phí và lịch sử thay đổi (nhưng không muốn họ biết giá cụ thể trong BOM)

**Dùng Factory khi**:
- Bạn muốn nhà máy chỉ xem thông tin kỹ thuật để sản xuất
- Bạn muốn **bảo mật** thông tin về chi phí và lịch sử thay đổi
- Bạn không muốn nhà máy biết về quá trình phát triển sản phẩm (Revisions)
- Bạn muốn nhà máy chỉ tập trung vào thông tin sản xuất, không quan tâm đến giá cả

### Ví dụ thực tế

**Ví dụ 1**: Bạn chia sẻ TechPack với khách hàng
- → Dùng **Viewer**: Khách hàng có thể xem đầy đủ thông tin, bao gồm cả Costing và Revisions để hiểu quá trình phát triển sản phẩm

**Ví dụ 2**: Bạn chia sẻ TechPack với nhà máy sản xuất
- → Dùng **Factory**: Nhà máy chỉ cần thông tin kỹ thuật (BOM, Measurements) để sản xuất, không cần biết về chi phí và lịch sử thay đổi

---

## 4. BẠN CÓ THỂ LÀM GÌ VỚI TỪNG VAI TRÒ?

### 4.1. Quản lý TechPack

| Hành động | Owner | Admin | Editor | Viewer | Factory |
|-----------|-------|-------|--------|--------|---------|
| Xem TechPack | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sửa thông tin TechPack | ✅ | ✅ | ✅ | ❌ | ❌ |
| Xóa TechPack | ✅ | ❌ | ❌ | ❌ | ❌ |
| Sao chép TechPack | ✅ | ✅ | ✅ | ❌ | ❌ |
| Xuất PDF | ✅ | ✅ | ✅ | ✅ | ✅ |

### 4.2. Quản lý BOM (Bill of Materials - Danh mục nguyên vật liệu)

| Hành động | Owner/Admin | Editor | Viewer/Factory |
|-----------|-------------|--------|----------------|
| Xem danh sách BOM | ✅ | ✅ | ✅ |
| Thêm vật liệu mới vào BOM | ✅ | ✅ | ❌ |
| Sửa thông tin vật liệu | ✅ | ✅ | ❌ |
| Xóa vật liệu khỏi BOM | ✅ | ✅ | ❌ |
| Xem giá đơn vị (Unit Price) | ✅ | ✅ | ❌ |
| Xem tổng giá (Total Price) | ✅ | ✅ | ❌ |
| Nhập BOM từ file CSV | ✅ | ✅ | ❌ |
| Xuất BOM ra file CSV | ✅ (Có giá) | ✅ (Có giá) | ✅ (Không có giá) |

### 4.3. Quản lý Measurements (Số đo)

| Hành động | Owner/Admin | Editor | Viewer/Factory |
|-----------|-------------|--------|----------------|
| Xem số đo | ✅ | ✅ | ✅ |
| Thêm số đo mới | ✅ | ✅ | ❌ |
| Sửa số đo | ✅ | ✅ | ❌ |
| Xóa số đo | ✅ | ✅ | ❌ |
| Sao chép số đo | ✅ | ✅ | ❌ |

### 4.4. Chia sẻ TechPack (Tab Share)

| Hành động | Owner/Admin | Editor | Viewer/Factory |
|-----------|------------|--------|----------------|
| Xem danh sách người được chia sẻ | ✅ | ❌ | ❌ |
| Thêm người vào danh sách chia sẻ | ✅ | ❌ | ❌ |
| Thay đổi quyền của người được chia sẻ | ✅ | ❌ | ❌ |
| Xóa quyền truy cập của người khác | ✅ | ❌ | ❌ |
| Xem lịch sử chia sẻ (Audit Logs) | ✅ | ❌ | ❌ |

### 4.5. Quản lý Revisions (Phiên bản)

| Hành động | Owner/Admin | Editor | Viewer | Factory |
|-----------|-------------|--------|--------|---------|
| Xem lịch sử Revisions | ✅ | ✅ | ✅ | ❌ |
| Tạo Revision mới | ✅ | ✅ | ❌ | ❌ |
| Phê duyệt Revision | ✅* | ❌ | ❌ | ❌ |

*Chỉ Admin hệ thống hoặc Merchandiser mới có thể phê duyệt Revision

### 4.6. Quản lý Costing (Chi phí)

| Hành động | Owner/Admin | Editor | Viewer | Factory |
|-----------|-------------|--------|--------|---------|
| Xem thông tin chi phí | ✅ | ✅ | ✅ | ❌ |
| Sửa thông tin chi phí | ✅ | ✅ | ❌ | ❌ |

---

## 5. QUYỀN XEM GIÁ VÀ THÔNG TIN NHẠY CẢM

### 5.1. Ai có thể xem giá trong BOM?

Giá trong BOM bao gồm: **Unit Price** (Giá đơn vị) và **Total Price** (Tổng giá)

| Vai trò hệ thống | Vai trò TechPack | Có xem được giá? |
|------------------|------------------|------------------|
| Admin | Bất kỳ vai trò nào | ✅ **Luôn xem được** |
| Designer | Owner, Admin, Editor | ✅ Có |
| Designer | Viewer | ❌ Không |
| Merchandiser | Editor | ✅ Có |
| Merchandiser | Viewer | ❌ Không |
| Viewer | Viewer, Factory | ❌ Không |

**Quy tắc đơn giản**: 
- Admin hệ thống luôn xem được giá
- Nếu bạn có vai trò TechPack là **Editor trở lên**, bạn sẽ xem được giá
- Nếu bạn có vai trò TechPack là **Viewer hoặc Factory**, bạn không xem được giá

### 5.2. Ai có thể xem tab nhạy cảm?

Các tab nhạy cảm bao gồm:
- **Costing Tab**: Thông tin chi phí sản xuất
- **Revisions Tab**: Lịch sử thay đổi và phê duyệt

| Vai trò TechPack | Có xem được tab nhạy cảm? |
|------------------|---------------------------|
| Owner | ✅ Có |
| Admin | ✅ Có |
| Editor | ✅ Có |
| Viewer | ✅ Có |
| Factory | ❌ **Không** |

**Lưu ý**: Chỉ vai trò **Factory** không xem được các tab nhạy cảm. Tất cả các vai trò khác đều xem được.

---

## 6. CÁCH CHIA SẺ TECHPACK

### 6.1. Ai có thể chia sẻ TechPack?

- ✅ **Owner** của TechPack
- ✅ **Admin** của TechPack (được Owner cấp quyền)
- ✅ **Admin hệ thống** (có thể chia sẻ mọi TechPack)

### 6.2. Bạn có thể cấp vai trò nào khi chia sẻ?

Khi chia sẻ TechPack, bạn chỉ có thể cấp các vai trò mà người nhận có thể nhận được (dựa trên vai trò hệ thống của họ):

| Vai trò hệ thống của người nhận | Bạn có thể cấp vai trò TechPack nào? |
|----------------------------------|--------------------------------------|
| Admin | Owner, Admin, Editor, Viewer, Factory |
| Designer | Owner, Editor, Viewer |
| Merchandiser | Editor, Viewer |
| Viewer | Viewer, Factory |

**Ví dụ**: 
- Nếu bạn chia sẻ với một Designer, bạn có thể cấp cho họ vai trò Owner, Editor hoặc Viewer
- Nếu bạn chia sẻ với một Viewer, bạn chỉ có thể cấp cho họ vai trò Viewer hoặc Factory

### 6.3. Quy tắc đặc biệt khi chia sẻ

1. **Không thể chia sẻ với chính mình**: Hệ thống sẽ tự động từ chối
2. **Không thể chia sẻ với Admin hệ thống**: Admin đã có toàn quyền truy cập
3. **Không thể cấp vai trò Owner qua chia sẻ**: Owner chỉ được tự động gán cho người tạo TechPack
4. **Designer không thể chia sẻ**: Designer chỉ có thể chia sẻ nếu được cấp quyền Admin trong TechPack cụ thể

---

## 7. CÁC TÌNH HUỐNG THƯỜNG GẶP

### ❓ Tình huống 1: Tôi là Designer, tại sao tôi không thể chia sẻ TechPack?

**Trả lời**: Designer chỉ có thể chia sẻ TechPack khi họ là **Owner** hoặc **Admin** của TechPack đó. Nếu bạn là Designer và tạo TechPack mới, bạn sẽ tự động trở thành Owner và có thể chia sẻ.

### ❓ Tình huống 2: Tôi được chia sẻ TechPack với vai trò Admin, nhưng tại sao tôi không thấy giá?

**Trả lời**: Có thể vai trò hệ thống của bạn không cho phép xem giá. Nếu bạn là Viewer hệ thống, dù được chia sẻ với vai trò Admin, bạn vẫn không xem được giá. Hãy liên hệ Admin hệ thống để được nâng cấp vai trò.

### ❓ Tình huống 3: Tôi là Owner, tại sao tôi không thể xóa một người khỏi danh sách chia sẻ?

**Trả lời**: Có thể người đó cũng là Owner của TechPack. Owner không thể bị xóa khỏi danh sách chia sẻ và không thể bị thay đổi vai trò.

### ❓ Tình huống 4: Tôi là Merchandiser, tại sao tôi không thể phê duyệt Revision?

**Trả lời**: Merchandiser có thể phê duyệt Revision, nhưng bạn cần có quyền truy cập TechPack đó. Nếu bạn không thấy nút phê duyệt, có thể bạn chưa được chia sẻ TechPack hoặc bạn đang ở vai trò Factory (không xem được tab Revisions).

### ❓ Tình huống 5: Tôi là Factory, tại sao tôi không thấy tab Costing?

**Trả lời**: Vai trò Factory được thiết kế để chỉ xem thông tin kỹ thuật, không xem thông tin giá cả và chi phí. Đây là tính năng bảo mật để bảo vệ thông tin nhạy cảm. Nếu bạn cần xem tab Costing, hãy yêu cầu Owner hoặc Admin của TechPack thay đổi vai trò của bạn thành Viewer hoặc Editor.

### ❓ Tình huống 6: Tôi muốn cho nhà máy xem TechPack nhưng không muốn họ xem giá, tôi nên làm gì?

**Trả lời**: Bạn nên chia sẻ TechPack với vai trò **Factory**. Vai trò Factory sẽ cho phép nhà máy xem thông tin kỹ thuật nhưng không xem được giá và các tab nhạy cảm như Costing và Revisions.

### ❓ Tình huống 7: Tôi là Admin hệ thống, tại sao tôi không thể chia sẻ TechPack với một Admin khác?

**Trả lời**: Admin hệ thống đã có toàn quyền truy cập tất cả TechPack, nên không cần được chia sẻ. Hệ thống sẽ tự động từ chối việc chia sẻ với Admin.

---

## 8. TÓM TẮT NHANH

### Bạn là Admin hệ thống?
- ✅ Bạn có thể làm mọi thứ trong hệ thống
- ✅ Bạn có thể xem tất cả TechPack
- ✅ Bạn luôn xem được giá
- ✅ Bạn có thể quản lý người dùng

### Bạn là Designer?
- ✅ Bạn có thể tạo TechPack mới
- ✅ Bạn có thể sửa TechPack của mình
- ✅ Bạn có thể chia sẻ TechPack nếu bạn là Owner/Admin của TechPack đó
- ⚠️ Bạn chỉ có thể chia sẻ với vai trò Owner, Editor, Viewer (không thể chia sẻ với Admin hoặc Factory)

### Bạn là Merchandiser?
- ✅ Bạn có thể xem tất cả TechPack
- ✅ Bạn có thể phê duyệt Revision
- ✅ Bạn có thể chia sẻ TechPack với vai trò Editor, Viewer
- ❌ Bạn không thể tạo hoặc sửa TechPack

### Bạn là Viewer?
- ✅ Bạn có thể xem TechPack được chia sẻ
- ✅ Bạn có thể xuất PDF
- ✅ Bạn có thể chia sẻ TechPack với vai trò Viewer, Factory
- ❌ Bạn không thể tạo, sửa, xóa TechPack
- ❌ Bạn không xem được giá

---

## 9. CẦN HỖ TRỢ?

Nếu bạn có thắc mắc về phân quyền hoặc gặp vấn đề khi sử dụng hệ thống, vui lòng liên hệ:
- **Admin hệ thống** để được hỗ trợ về quyền truy cập
- **Owner hoặc Admin của TechPack** để được chia sẻ hoặc thay đổi quyền

---

**Tài liệu này được cập nhật: 2024**
