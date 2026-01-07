# Yêu Cầu Tính Năng Đa Ngôn Ngữ (i18n) - TechPacker Pro

## 1. Tổng Quan

Ứng dụng TechPacker Pro cần hỗ trợ đa ngôn ngữ để người dùng có thể chuyển đổi giữa các ngôn ngữ khác nhau. Hiện tại đã có cơ sở hạ tầng i18n cơ bản nhưng chưa được triển khai đầy đủ trên toàn bộ ứng dụng.

## 2. Mục Tiêu

- Cho phép người dùng chọn ngôn ngữ từ dropdown/selector trong header
- Tự động chuyển đổi toàn bộ nội dung UI sang ngôn ngữ đã chọn
- Lưu lựa chọn ngôn ngữ vào localStorage để giữ nguyên khi reload trang
- Hỗ trợ ít nhất 2 ngôn ngữ: Tiếng Anh (English) và Tiếng Việt
- Dễ dàng mở rộng thêm ngôn ngữ khác trong tương lai

## 3. Phạm Vi Triển Khai

### 3.1. Các Component Cần Dịch

#### 3.1.1. Navigation & Header
- [x] Logo/Tên ứng dụng: "TechPacker Pro"
- [x] Menu items: "Tech Packs", "Create New", "Admin Panel"
- [x] User menu: "Profile", "Logout"
- [x] Language switcher: "Language", "English", "Tiếng Việt"
- [ ] Breadcrumbs (nếu có)
- [ ] Page titles

#### 3.1.2. Tech Pack List Page
- [ ] Page title: "Tech Packs"
- [ ] Search placeholder: "Search tech packs..."
- [ ] Filter labels: "Status", "Category", "Season", "Brand"
- [ ] Table headers: "Article Name", "Article Code", "Status", "Season", "Created Date", "Last Updated", "Actions"
- [ ] Action buttons: "View", "Edit", "Delete"
- [ ] Status labels: "Draft", "In Review", "Approved", "Rejected", "Archived"
- [ ] Empty state: "No tech packs found", "Try adjusting your search..."
- [ ] Statistics cards: "Total Packs", "Draft", "In Review", "Approved"
- [ ] Pagination: "Page", "of", "Showing", "results"

#### 3.1.3. Tech Pack Form (Create/Edit)
- [ ] Tab labels: "Article Info", "Bill of Materials", "Measurements", "Colorways", "Construction", "Sample Measurements"
- [ ] Form labels và placeholders:
  - Article Info: "Article Name", "Article Code", "Supplier", "Season", "Technical Designer", etc.
  - BOM: "Part", "Material Name", "Supplier Code", "Quantity", "Unit", "Placement", etc.
  - Measurements: "POM Code", "POM Name", "Tolerance", "Size", etc.
  - Colorways: "Colorway Name", "Code", "Pantone Code", "Part", etc.
  - Construction: "How to Measure", "Step", "Instructions", etc.
- [ ] Buttons: "Save", "Cancel", "Add Row", "Delete", "Import", "Export", "Apply Template"
- [ ] Validation messages: "Required field", "Invalid format", etc.
- [ ] Success/Error messages: "Saved successfully", "Failed to save", etc.

#### 3.1.4. Tech Pack Detail/View Page
- [ ] Section headers: "Basic Information", "Bill of Materials", "Measurements", etc.
- [ ] Field labels: "Product Name", "Article Code", "Status", "Created Date", etc.
- [ ] Action buttons: "Edit", "Export PDF", "Delete", "Back to List"
- [ ] Status badges và labels

#### 3.1.5. Sample Measurement Rounds
- [ ] Round labels: "Sample Round", "1st Proto", "2nd Proto", etc.
- [ ] Field labels: "Date", "Reviewer", "Requested Source", "Overall Comments"
- [ ] Column headers: "Requested", "Measured", "Diff", "Revised", "Comments"
- [ ] Buttons: "Add Sample Round", "Save", "Delete"

#### 3.1.6. Modals & Dialogs
- [ ] Confirmation dialogs: "Are you sure?", "This action cannot be undone"
- [ ] Delete confirmation: "Delete Tech Pack?", "Delete Material?", etc.
- [ ] Success messages: "Tech Pack created successfully", "Changes saved"
- [ ] Error messages: "Failed to load", "Network error", etc.
- [ ] Modal titles và button labels

#### 3.1.7. Admin Page
- [ ] Page title: "Admin Panel"
- [ ] Tab labels: "Users", "Settings", "Permissions", etc.
- [ ] Table headers: "Name", "Email", "Role", "Status", "Actions"
- [ ] Role labels: "Admin", "Designer", "Viewer", "Merchandiser", "Factory"
- [ ] Action buttons: "Add User", "Edit", "Delete", "Reset Password"

#### 3.1.8. Profile Page
- [ ] Section headers: "Personal Information", "Account Settings", "Change Password"
- [ ] Field labels: "First Name", "Last Name", "Email", "Role", "Phone"
- [ ] Buttons: "Update Profile", "Change Password", "Save"

#### 3.1.9. Login/Register Page
- [ ] Form labels: "Email", "Password", "Remember me"
- [ ] Buttons: "Login", "Register", "Forgot Password?"
- [ ] Error messages: "Invalid credentials", "Email is required", etc.

#### 3.1.10. Common UI Elements
- [ ] Buttons: "Save", "Cancel", "Delete", "Edit", "View", "Add", "Remove", "Apply", "Close"
- [ ] Placeholders: "Search...", "Select...", "Enter...", "Choose..."
- [ ] Tooltips và help text
- [ ] Loading states: "Loading...", "Saving...", "Processing..."
- [ ] Empty states: "No data", "No results found"
- [ ] Date/time formats: "Created on", "Last updated", "Due date"

### 3.2. Các File Cần Cập Nhật

#### 3.2.1. Translation Files
- `src/lib/i18n.tsx` - File chính chứa translations
  - Cần mở rộng translations object với tất cả các keys cần thiết
  - Tổ chức translations theo namespace (nav, form, common, app, etc.)

#### 3.2.2. Components Cần Cập Nhật
- `src/App.tsx` - Header, navigation
- `src/components/TechPackList.tsx` - List page
- `src/components/TechPackForm/TechPackTabs.tsx` - Main form
- `src/components/TechPackForm/tabs/ArticleInfoTab.tsx` - Article Info tab
- `src/components/TechPackForm/tabs/BomTab.tsx` - BOM tab
- `src/components/TechPackForm/tabs/MeasurementTab.tsx` - Measurements tab
- `src/components/TechPackForm/tabs/ColorwayTab.tsx` - Colorways tab
- `src/components/TechPackForm/tabs/ConstructionTab.tsx` - Construction tab
- `src/components/TechPackForm/tabs/SampleMeasurementsTable.tsx` - Sample rounds
- `src/pages/LoginPage.tsx` - Login page
- `src/pages/ProfilePage.tsx` - Profile page
- `src/pages/Admin/AdminPage.tsx` - Admin page
- Tất cả các component con khác

#### 3.2.3. Utilities & Helpers
- `src/utils/validation.ts` - Validation messages
- `src/utils/validationSchemas.ts` - Schema validation messages
- Error handlers và toast messages

## 4. Yêu Cầu Kỹ Thuật

### 4.1. Cấu Trúc Translation Keys

Sử dụng namespace để tổ chức translations:

```
common.*          - Các từ/cụm từ dùng chung
nav.*             - Navigation items
form.*            - Form labels, placeholders
app.*             - App-specific text
techpack.*        - TechPack related text
bom.*             - Bill of Materials
measurement.*     - Measurements
colorway.*        - Colorways
construction.*    - Construction
sample.*          - Sample rounds
admin.*           - Admin panel
profile.*         - Profile page
auth.*            - Authentication
error.*           - Error messages
success.*         - Success messages
validation.*      - Validation messages
```

### 4.2. Implementation Pattern

Mỗi component cần:
1. Import `useI18n` hook
2. Destructure `t` function: `const { t } = useI18n();`
3. Thay thế tất cả hardcoded strings bằng `t('key.path')`
4. Sử dụng keys có ý nghĩa và nhất quán

Ví dụ:
```tsx
// Trước
<button>Save</button>
<h1>Tech Packs</h1>
<input placeholder="Search..." />

// Sau
<button>{t('common.save')}</button>
<h1>{t('nav.techpacks')}</h1>
<input placeholder={t('common.search')} />
```

### 4.3. Xử Lý Dynamic Content

- Số lượng: `t('common.itemsCount', { count: 5 })` → "5 items" / "5 mục"
- Ngày tháng: Format theo locale
- Số tiền: Format theo locale và currency

### 4.4. Pluralization

Cần hỗ trợ số ít/số nhiều:
- "1 item" / "2 items"
- "1 mục" / "2 mục"

## 5. Danh Sách Translation Keys Cần Thiết

### 5.1. Common Keys (đã có một phần)
```
common.save
common.cancel
common.delete
common.edit
common.view
common.create
common.update
common.back
common.next
common.previous
common.search
common.filter
common.clear
common.apply
common.close
common.confirm
common.yes
common.no
common.loading
common.error
common.success
common.warning
common.info
common.language
common.language.english
common.language.vietnamese
```

### 5.2. Navigation Keys (cần bổ sung)
```
nav.dashboard
nav.techpacks
nav.measurements
nav.materials
nav.colorways
nav.analytics
nav.team
nav.settings
nav.admin
nav.profile
nav.logout
```

### 5.3. Tech Pack List Keys (cần bổ sung)
```
techpack.list.title
techpack.list.search.placeholder
techpack.list.filter.status
techpack.list.filter.category
techpack.list.filter.season
techpack.list.filter.brand
techpack.list.table.articleName
techpack.list.table.articleCode
techpack.list.table.status
techpack.list.table.season
techpack.list.table.createdDate
techpack.list.table.lastUpdated
techpack.list.table.actions
techpack.list.action.view
techpack.list.action.edit
techpack.list.action.delete
techpack.list.status.draft
techpack.list.status.inReview
techpack.list.status.approved
techpack.list.status.rejected
techpack.list.status.archived
techpack.list.empty.title
techpack.list.empty.subtitle
techpack.list.stats.total
techpack.list.stats.draft
techpack.list.stats.inReview
techpack.list.stats.approved
```

### 5.4. Form Keys (cần bổ sung rất nhiều)
```
form.tab.articleInfo
form.tab.bom
form.tab.measurements
form.tab.colorways
form.tab.construction
form.tab.sampleMeasurements

form.articleInfo.articleName
form.articleInfo.articleCode
form.articleInfo.supplier
form.articleInfo.season
form.articleInfo.technicalDesigner
form.articleInfo.status
form.articleInfo.category
form.articleInfo.gender
form.articleInfo.brand
form.articleInfo.fabricDescription
form.articleInfo.productDescription
... (và nhiều keys khác)

form.bom.part
form.bom.materialName
form.bom.supplierCode
form.bom.quantity
form.bom.unit
form.bom.placement
form.bom.addRow
form.bom.deleteRow
... (và nhiều keys khác)

form.measurement.pomCode
form.measurement.pomName
form.measurement.tolerance
form.measurement.size
... (và nhiều keys khác)
```

### 5.5. Validation Keys (cần bổ sung)
```
validation.required
validation.invalidFormat
validation.minLength
validation.maxLength
validation.invalidEmail
validation.passwordsNotMatch
validation.articleCodeExists
... (và nhiều keys khác)
```

### 5.6. Error/Success Messages (cần bổ sung)
```
error.network
error.unauthorized
error.forbidden
error.notFound
error.serverError
error.loadFailed
error.saveFailed
error.deleteFailed

success.saved
success.created
success.updated
success.deleted
success.uploaded
```

## 6. Checklist Triển Khai

### Phase 1: Setup & Infrastructure ✅
- [x] I18nProvider đã được tích hợp vào main.tsx
- [x] LanguageSwitcher component đã được thêm vào header
- [x] Basic translation structure đã có
- [x] localStorage persistence đã hoạt động

### Phase 2: Common & Navigation
- [ ] Hoàn thiện common translations
- [ ] Hoàn thiện navigation translations
- [ ] Update tất cả navigation components

### Phase 3: Tech Pack List Page
- [ ] Dịch toàn bộ TechPackList component
- [ ] Dịch table headers
- [ ] Dịch filters và search
- [ ] Dịch status labels
- [ ] Dịch empty states
- [ ] Dịch statistics cards

### Phase 4: Tech Pack Form
- [ ] Dịch Article Info tab
- [ ] Dịch BOM tab (ưu tiên cao)
- [ ] Dịch Measurements tab
- [ ] Dịch Colorways tab
- [ ] Dịch Construction tab
- [ ] Dịch Sample Measurements tab
- [ ] Dịch tất cả form labels và placeholders
- [ ] Dịch validation messages
- [ ] Dịch buttons và actions

### Phase 5: Other Pages
- [ ] Dịch Login/Register page
- [ ] Dịch Profile page
- [ ] Dịch Admin page
- [ ] Dịch Tech Pack Detail/View page

### Phase 6: Messages & Notifications
- [ ] Dịch tất cả success messages
- [ ] Dịch tất cả error messages
- [ ] Dịch confirmation dialogs
- [ ] Dịch toast notifications

### Phase 7: Testing & Refinement
- [ ] Test chuyển đổi ngôn ngữ trên tất cả pages
- [ ] Kiểm tra không có text nào bị sót
- [ ] Kiểm tra format ngày tháng, số theo locale
- [ ] Kiểm tra pluralization
- [ ] Review và refine translations

## 7. Lưu Ý Kỹ Thuật

1. **Consistency**: Sử dụng cùng một key cho cùng một ý nghĩa
2. **Namespace**: Tổ chức keys theo namespace để dễ quản lý
3. **Fallback**: Luôn có fallback về English nếu key không tồn tại
4. **Performance**: Translations được cache trong memory, không cần reload
5. **Extensibility**: Dễ dàng thêm ngôn ngữ mới bằng cách thêm object vào translations

## 8. Ví Dụ Implementation

### Component Example:
```tsx
import { useI18n } from '../lib/i18n';

const MyComponent = () => {
  const { t } = useI18n();
  
  return (
    <div>
      <h1>{t('techpack.list.title')}</h1>
      <input placeholder={t('techpack.list.search.placeholder')} />
      <button>{t('common.save')}</button>
    </div>
  );
};
```

### Translation File Structure:
```tsx
const translations = {
  en: {
    'techpack.list.title': 'Tech Packs',
    'techpack.list.search.placeholder': 'Search tech packs...',
    'common.save': 'Save',
    // ... nhiều keys khác
  },
  vi: {
    'techpack.list.title': 'Tech Packs',
    'techpack.list.search.placeholder': 'Tìm kiếm tech packs...',
    'common.save': 'Lưu',
    // ... nhiều keys khác
  }
};
```

## 9. Kết Quả Mong Đợi

Sau khi hoàn thành, người dùng sẽ có thể:
1. Click vào Language Switcher trong header
2. Chọn ngôn ngữ (English hoặc Tiếng Việt)
3. Toàn bộ ứng dụng ngay lập tức chuyển sang ngôn ngữ đã chọn
4. Lựa chọn được lưu và tự động áp dụng khi reload trang
5. Không có text nào còn hardcoded, tất cả đều được dịch

## 10. Ưu Tiên Triển Khai

1. **High Priority**: 
   - Tech Pack List page (màn hình chính)
   - Tech Pack Form (BOM tab, Article Info tab)
   - Common buttons và messages

2. **Medium Priority**:
   - Measurements tab
   - Colorways tab
   - Construction tab
   - Sample Measurements

3. **Low Priority**:
   - Admin page
   - Profile page
   - Advanced features

---

**Tài liệu này sẽ được cập nhật khi có thay đổi hoặc bổ sung yêu cầu mới.**

