# Checklist Triển Khai Đa Ngôn Ngữ (i18n)

## Hướng Dẫn Sử Dụng

File này liệt kê tất cả các component và text cần được dịch. Đánh dấu ✅ khi hoàn thành.

## 📋 Checklist Theo Component

### ✅ Infrastructure (Đã hoàn thành)
- [x] I18nProvider setup trong main.tsx
- [x] LanguageSwitcher component trong header
- [x] Basic translation structure
- [x] localStorage persistence

### 🔤 Common Translations
- [x] common.save, common.cancel, common.delete
- [x] common.edit, common.view, common.create
- [x] common.language, common.language.english, common.language.vietnamese
- [ ] common.loading (cần kiểm tra lại)
- [ ] common.error, common.success, common.warning
- [ ] common.search, common.filter, common.clear
- [ ] common.confirm, common.yes, common.no
- [ ] common.close, common.apply, common.back

### 🧭 Navigation & Header
- [x] app.title (TechPacker Pro)
- [x] nav.techpacks
- [x] form.createTechPack
- [ ] app.adminPanel
- [ ] app.logout
- [ ] app.profile
- [ ] Breadcrumbs (nếu có)

### 📋 Tech Pack List Page (`src/components/TechPackList.tsx`)
- [ ] Page title và subtitle
- [ ] Search placeholder
- [ ] Filter labels (Status, Category, Season, Brand)
- [ ] Table column headers:
  - [ ] Article Name
  - [ ] Article Code
  - [ ] Status
  - [ ] Season
  - [ ] Created Date
  - [ ] Last Updated
  - [ ] Actions
- [ ] Action buttons (View, Edit, Delete)
- [ ] Status labels (Draft, In Review, Approved, Rejected, Archived)
- [ ] Statistics cards (Total Packs, Draft, In Review, Approved)
- [ ] Empty state messages
- [ ] Pagination labels
- [ ] Delete confirmation dialog

### 📝 Article Info Tab (`src/components/TechPackForm/tabs/ArticleInfoTab.tsx`)
- [ ] Tab label
- [ ] Form field labels:
  - [ ] Article Name
  - [ ] Article Code
  - [ ] Supplier
  - [ ] Season
  - [ ] Technical Designer
  - [ ] Status
  - [ ] Category
  - [ ] Gender
  - [ ] Brand
  - [ ] Fabric Description
  - [ ] Product Description
  - [ ] Design Sketch
  - [ ] Company Logo
- [ ] Placeholders
- [ ] Validation messages
- [ ] Buttons (Save, Cancel, Upload)

### 📦 BOM Tab (`src/components/TechPackForm/tabs/BomTab.tsx`)
- [ ] Tab label
- [ ] Table headers:
  - [ ] No. (STT)
  - [ ] Part
  - [ ] Material Name
  - [ ] Supplier Code
  - [ ] Placement
  - [ ] Size
  - [ ] Quantity
  - [ ] Unit
  - [ ] Supplier
  - [ ] Color
  - [ ] Notes
  - [ ] Sub-materials
- [ ] Form field labels và placeholders
- [ ] Buttons:
  - [ ] Add Row
  - [ ] Delete Row
  - [ ] Add from Library
  - [ ] Apply Template
  - [ ] Import
  - [ ] Export
- [ ] Validation messages
- [ ] Tooltips và help text
- [ ] Empty state

### 📏 Measurements Tab (`src/components/TechPackForm/tabs/MeasurementTab.tsx`)
- [ ] Tab label
- [ ] Table headers:
  - [ ] POM Code
  - [ ] POM Name
  - [ ] Tolerance
  - [ ] Unit
  - [ ] Sizes (XS, S, M, L, XL, etc.)
- [ ] Form field labels
- [ ] Buttons:
  - [ ] Add Measurement
  - [ ] Delete Measurement
  - [ ] Save Template
  - [ ] Apply Template
- [ ] Size range selector
- [ ] Base size selector
- [ ] Unit selector
- [ ] Validation messages

### 🎨 Colorways Tab (`src/components/TechPackForm/tabs/ColorwayTab.tsx`)
- [ ] Tab label
- [ ] Form field labels:
  - [ ] Colorway Name
  - [ ] Code
  - [ ] Pantone Code
  - [ ] Hex Color
  - [ ] RGB Color
  - [ ] Placement
  - [ ] Material Type
  - [ ] Supplier
- [ ] Buttons:
  - [ ] Add Colorway
  - [ ] Delete Colorway
  - [ ] Add Color Part
- [ ] Colorway parts table
- [ ] Validation messages

### 🏗️ Construction Tab (`src/components/TechPackForm/tabs/ConstructionTab.tsx`)
- [ ] Tab label
- [ ] Form field labels:
  - [ ] POM Code
  - [ ] POM Name
  - [ ] Description
  - [ ] Step Number
  - [ ] Instructions
  - [ ] Tips
  - [ ] Common Mistakes
  - [ ] Related Measurements
  - [ ] Note
- [ ] Buttons:
  - [ ] Add Measurement Point
  - [ ] Delete Measurement Point
- [ ] Image upload labels

### 📊 Sample Measurements Tab (`src/components/TechPackForm/tabs/SampleMeasurementsTable.tsx`)
- [ ] Tab label
- [ ] Round labels:
  - [ ] Sample Round
  - [ ] Round name (editable)
  - [ ] Date
  - [ ] Reviewer
  - [ ] Requested Source
  - [ ] Overall Comments
- [ ] Table headers:
  - [ ] POM Code
  - [ ] POM Name
  - [ ] Requested
  - [ ] Measured
  - [ ] Diff
  - [ ] Revised
  - [ ] Comments
- [ ] Buttons:
  - [ ] Add Sample Round
  - [ ] Save Round
  - [ ] Delete Round
- [ ] Requested Source options:
  - [ ] Original Spec
  - [ ] From Previous Round

### 🔍 Tech Pack Detail/View (`src/components/TechPackDetail.tsx`)
- [ ] Page title
- [ ] Section headers
- [ ] Field labels
- [ ] Action buttons (Edit, Export PDF, Delete, Back)
- [ ] Status badges

### 👤 Profile Page (`src/pages/ProfilePage.tsx`)
- [ ] Page title
- [ ] Section headers
- [ ] Form field labels
- [ ] Buttons
- [ ] Success/Error messages

### 🔐 Login Page (`src/pages/LoginPage.tsx`)
- [ ] Page title
- [ ] Form labels (Email, Password)
- [ ] Buttons (Login, Register)
- [ ] Links (Forgot Password?)
- [ ] Error messages
- [ ] Validation messages

### 👥 Admin Page (`src/pages/Admin/AdminPage.tsx`)
- [ ] Page title
- [ ] Tab labels
- [ ] Table headers
- [ ] Role labels
- [ ] Action buttons
- [ ] Modal titles và content

### 💬 Messages & Notifications
- [ ] Success messages:
  - [ ] "Tech Pack created successfully"
  - [ ] "Tech Pack updated successfully"
  - [ ] "Changes saved"
  - [ ] "File uploaded successfully"
- [ ] Error messages:
  - [ ] "Failed to load"
  - [ ] "Network error"
  - [ ] "Unauthorized"
  - [ ] "Not found"
- [ ] Confirmation dialogs:
  - [ ] "Are you sure?"
  - [ ] "This action cannot be undone"
  - [ ] "Delete Tech Pack?"
- [ ] Loading states:
  - [ ] "Loading..."
  - [ ] "Saving..."
  - [ ] "Processing..."

### ✅ Validation Messages (`src/utils/validationSchemas.ts`)
- [ ] Required field messages
- [ ] Invalid format messages
- [ ] Min/Max length messages
- [ ] Email validation
- [ ] Password validation
- [ ] Article code validation
- [ ] Supplier code validation (đã bỏ)

## 📊 Thống Kê Tiến Độ

- **Total Components**: ~20+
- **Completed**: ~5 (25%)
- **In Progress**: ~3 (15%)
- **Not Started**: ~12 (60%)

## 🎯 Mục Tiêu

Hoàn thành 100% translation cho tất cả các component và text trong ứng dụng để người dùng có thể sử dụng ứng dụng hoàn toàn bằng ngôn ngữ họ chọn.

## 📝 Ghi Chú

- Ưu tiên các component được sử dụng nhiều nhất (Tech Pack List, BOM Tab)
- Đảm bảo consistency trong cách đặt tên keys
- Test kỹ sau mỗi component được dịch
- Review translations với người bản ngữ nếu có thể

