# Đề xuất Phương án Ràng buộc Revision Workflow

## 📊 Hiện trạng

Hiện tại:
- ✅ Revision có status (pending/approved/rejected)
- ✅ Có nút Approve/Reject cho Admin/Merchandiser
- ❌ **KHÔNG có ràng buộc**: Vẫn export PDF, vẫn save bình thường dù có revision pending/rejected
- ❌ Workflow không có ý nghĩa thực tế

---

## 🎯 Phương án đề xuất

### **PHƯƠNG ÁN 1: Ràng buộc Export PDF** ⭐ (Đề xuất)

**Mô tả:**
- Chặn export PDF nếu có revision **pending** hoặc **rejected**
- Chỉ cho phép export khi tất cả revision đã được **approved**

**Implementation:**
```typescript
// Frontend: TechPackTabs.tsx
const handleExportPDF = () => {
  // Check revisions
  const hasPendingRevisions = revisions.some(r => r.status === 'pending');
  const hasRejectedRevisions = revisions.some(r => r.status === 'rejected');
  
  if (hasPendingRevisions) {
    showError('Không thể export PDF: Có revision đang chờ phê duyệt. Vui lòng đợi Merchandiser/Admin phê duyệt.');
    return;
  }
  
  if (hasRejectedRevisions) {
    showError('Không thể export PDF: Có revision bị từ chối. Vui lòng xem lý do và chỉnh sửa lại.');
    return;
  }
  
  exportToPDF();
};

// Backend: pdf.controller.ts
async exportTechPackPDF(req, res) {
  // Check revisions
  const revisions = await Revision.find({ techPackId: id, status: { $in: ['pending', 'rejected'] } });
  if (revisions.length > 0) {
    return res.status(403).json({
      success: false,
      message: 'Cannot export PDF: There are pending or rejected revisions'
    });
  }
  // ... continue export
}
```

**Ưu điểm:**
- ✅ Đảm bảo chỉ export TechPack đã được phê duyệt
- ✅ Ngăn export tài liệu chưa được xem xét
- ✅ Dễ implement, ít ảnh hưởng workflow hiện tại
- ✅ Phù hợp với quy trình sản xuất thực tế

**Nhược điểm:**
- ⚠️ Designer không thể export để xem preview trong khi chờ phê duyệt
- ⚠️ Cần có revision approved đầu tiên mới export được

**Độ khó:** ⭐⭐ (Dễ)

---

### **PHƯƠNG ÁN 2: Ràng buộc Save/Update** ⭐⭐ (Cân bằng)

**Mô tả:**
- Chặn save/update nếu có revision **pending** chưa được xử lý
- Cho phép save nếu revision đã được approve hoặc reject (để chỉnh sửa lại)

**Implementation:**
```typescript
// Frontend: TechPackTabs.tsx
const handleSave = async () => {
  // Check for pending revisions
  const pendingRevisions = revisions.filter(r => r.status === 'pending');
  if (pendingRevisions.length > 0) {
    showError(`Không thể lưu: Có ${pendingRevisions.length} revision đang chờ phê duyệt. Vui lòng đợi Merchandiser/Admin xử lý.`);
    // Optionally: Navigate to Revision tab
    setCurrentTab(5); // Revision tab
    return;
  }
  
  // Continue with save...
};

// Backend: techpack.controller.ts
async patchTechPack(req, res) {
  const pendingRevisions = await Revision.find({ 
    techPackId: id, 
    status: 'pending' 
  });
  
  if (pendingRevisions.length > 0) {
    return res.status(403).json({
      success: false,
      message: 'Cannot update: There are pending revisions awaiting approval'
    });
  }
  // ... continue update
}
```

**Ưu điểm:**
- ✅ Ngăn tạo revision mới khi có revision đang chờ
- ✅ Đảm bảo quy trình tuần tự: approve/reject → mới được chỉnh sửa tiếp
- ✅ Tránh conflict giữa các revision

**Nhược điểm:**
- ⚠️ Designer phải đợi approve/reject mới được chỉnh sửa tiếp
- ⚠️ Có thể gây chậm trễ workflow nếu Merchandiser không online

**Độ khó:** ⭐⭐⭐ (Trung bình)

---

### **PHƯƠNG ÁN 3: Ràng buộc Status TechPack** ⭐⭐⭐ (Nghiêm ngặt)

**Mô tả:**
- Chặn chuyển status TechPack sang "Approved" nếu có revision **pending** hoặc **rejected**
- Chỉ cho phép chuyển status khi tất cả revision đã được **approved**

**Implementation:**
```typescript
// Backend: workflow.controller.ts
async handleWorkflowAction(req, res) {
  const { action } = req.body;
  
  // If trying to approve TechPack
  if (action === 'approve') {
    const pendingRevisions = await Revision.find({ 
      techPackId: id, 
      status: { $in: ['pending', 'rejected'] } 
    });
    
    if (pendingRevisions.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'Cannot approve TechPack: There are pending or rejected revisions'
      });
    }
  }
  
  // Continue workflow...
}
```

**Ưu điểm:**
- ✅ Đảm bảo TechPack chỉ được approve khi mọi thay đổi đã được phê duyệt
- ✅ Phù hợp với quy trình sản xuất nghiêm ngặt
- ✅ Tạo workflow rõ ràng: Revision → TechPack

**Nhược điểm:**
- ⚠️ Rất nghiêm ngặt, có thể gây khó khăn trong một số trường hợp
- ⚠️ Cần quản lý revision cẩn thận

**Độ khó:** ⭐⭐⭐ (Trung bình)

---

### **PHƯƠNG ÁN 4: Kết hợp 1 + 2** ⭐⭐⭐⭐ (Toàn diện - Đề xuất cao)

**Mô tả:**
- Kết hợp cả ràng buộc Export PDF và Save/Update
- Export: Chặn nếu có pending/rejected revision
- Save: Chặn nếu có pending revision (cho phép save nếu đã reject để chỉnh sửa)

**Implementation:**
- Áp dụng cả Phương án 1 và Phương án 2

**Ưu điểm:**
- ✅ Toàn diện, đảm bảo workflow hoàn chỉnh
- ✅ Vừa kiểm soát export, vừa kiểm soát save
- ✅ Phù hợp với quy trình sản xuất thực tế

**Nhược điểm:**
- ⚠️ Nhiều ràng buộc, có thể gây khó khăn cho Designer
- ⚠️ Cần training người dùng

**Độ khó:** ⭐⭐⭐⭐ (Khá khó)

---

### **PHƯƠNG ÁN 5: Soft Warning (Cảnh báo mềm)** ⭐ (Linh hoạt)

**Mô tả:**
- KHÔNG chặn, chỉ hiển thị cảnh báo khi export/save nếu có revision pending/rejected
- Cho phép user quyết định có tiếp tục hay không

**Implementation:**
```typescript
const handleExportPDF = () => {
  const hasPendingRevisions = revisions.some(r => r.status === 'pending');
  const hasRejectedRevisions = revisions.some(r => r.status === 'rejected');
  
  if (hasPendingRevisions || hasRejectedRevisions) {
    const confirmed = window.confirm(
      'Cảnh báo: Có revision đang chờ phê duyệt hoặc bị từ chối.\n' +
      'Bạn có chắc muốn export PDF không?\n\n' +
      'Khuyến nghị: Đợi phê duyệt revision trước khi export.'
    );
    
    if (!confirmed) return;
  }
  
  exportToPDF();
};
```

**Ưu điểm:**
- ✅ Linh hoạt, không chặn hoàn toàn
- ✅ Vẫn nhắc nhở user về revision
- ✅ Dễ implement

**Nhược điểm:**
- ⚠️ User có thể bỏ qua cảnh báo
- ⚠️ Không đảm bảo quy trình nghiêm ngặt

**Độ khó:** ⭐ (Rất dễ)

---

### **PHƯƠNG ÁN 6: Role-based Export** ⭐⭐⭐ (Phân quyền)

**Mô tả:**
- Designer: Chặn export nếu có pending/rejected revision
- Merchandiser/Admin: Cho phép export bất kỳ lúc nào (để review)

**Implementation:**
```typescript
const handleExportPDF = () => {
  const userRole = user?.role;
  
  // Merchandiser/Admin: Always allow export
  if (userRole === 'merchandiser' || userRole === 'admin') {
    exportToPDF();
    return;
  }
  
  // Designer: Check revisions
  const hasPendingRevisions = revisions.some(r => r.status === 'pending');
  const hasRejectedRevisions = revisions.some(r => r.status === 'rejected');
  
  if (hasPendingRevisions || hasRejectedRevisions) {
    showError('Không thể export: Có revision chờ phê duyệt. Vui lòng liên hệ Merchandiser/Admin.');
    return;
  }
  
  exportToPDF();
};
```

**Ưu điểm:**
- ✅ Phân quyền rõ ràng
- ✅ Merchandiser/Admin vẫn có thể export để review
- ✅ Designer bị ràng buộc đúng quy trình

**Nhược điểm:**
- ⚠️ Cần implement logic phân quyền
- ⚠️ Phức tạp hơn một chút

**Độ khó:** ⭐⭐⭐ (Trung bình)

---

## 📋 So sánh các phương án

| Phương án | Độ khó | Hiệu quả | Linh hoạt | Khuyến nghị |
|-----------|--------|----------|-----------|-------------|
| 1. Ràng buộc Export | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ **Khuyến nghị** |
| 2. Ràng buộc Save | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ✅ Tốt |
| 3. Ràng buộc Status | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ | ⚠️ Nghiêm ngặt |
| 4. Kết hợp 1+2 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ✅✅ **Tốt nhất** |
| 5. Soft Warning | ⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⚠️ Quá linh hoạt |
| 6. Role-based | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ Cân bằng |

---

## 🎯 Khuyến nghị

### **Lựa chọn 1: Bắt đầu đơn giản** (Khuyến nghị cho MVP)
- **Chọn Phương án 1**: Ràng buộc Export PDF
- Lý do: Dễ implement, hiệu quả, ít ảnh hưởng workflow hiện tại

### **Lựa chọn 2: Toàn diện** (Cho production)
- **Chọn Phương án 4**: Kết hợp Export + Save
- Lý do: Đảm bảo workflow hoàn chỉnh, phù hợp quy trình sản xuất

### **Lựa chọn 3: Phân quyền** (Cho enterprise)
- **Chọn Phương án 6**: Role-based Export
- Lý do: Linh hoạt, phân quyền rõ ràng, phù hợp nhiều use case

---

## 📝 Implementation Checklist

Khi quyết định phương án, cần implement:

### Frontend:
- [ ] Check revisions trước khi export/save
- [ ] Hiển thị error message rõ ràng
- [ ] Navigate to Revision tab khi có lỗi (optional)
- [ ] Update UI để disable button khi có ràng buộc

### Backend:
- [ ] API endpoint check revisions
- [ ] Validation trong export PDF endpoint
- [ ] Validation trong save/update endpoint (nếu chọn phương án 2/4)
- [ ] Error response rõ ràng

### Testing:
- [ ] Test export với pending revision
- [ ] Test export với rejected revision
- [ ] Test export với approved revision (should work)
- [ ] Test save với pending revision (nếu có)
- [ ] Test với các role khác nhau

---

## 💡 Lưu ý

1. **Backward compatibility**: Cần xử lý TechPack cũ không có revision
2. **First revision**: Cần có cơ chế tạo revision đầu tiên khi save lần đầu
3. **User experience**: Error message phải rõ ràng, hướng dẫn user làm gì tiếp theo
4. **Performance**: Check revisions không được làm chậm export/save

---

## ❓ Câu hỏi cần quyết định

1. **Bạn muốn ràng buộc nghiêm ngặt hay linh hoạt?**
   - Nghiêm ngặt: Chặn hoàn toàn (Phương án 1, 2, 4)
   - Linh hoạt: Cảnh báo (Phương án 5, 6)

2. **Ràng buộc Export hay Save hay cả hai?**
   - Chỉ Export: Phương án 1
   - Chỉ Save: Phương án 2
   - Cả hai: Phương án 4

3. **Có cần phân quyền khác nhau cho các role không?**
   - Có: Phương án 6
   - Không: Phương án 1, 2, 4

