# i18n Implementation Guide

## Tổng quan

Hệ thống i18n đã được implement với các tính năng:

1. ✅ **i18next + react-i18next** - Quản lý đa ngôn ngữ chuẩn
2. ✅ **Language Modal** - UI chọn ngôn ngữ giống design
3. ✅ **Auto-translate scripts** - Tự động dịch en.json -> vi.json
4. ✅ **Glossary support** - Giữ nguyên thuật ngữ domain
5. ✅ **Cache translations** - Tránh dịch lại key đã dịch
6. ✅ **Preserve placeholders** - Giữ nguyên {{name}}, {count}, \n, HTML tags

## Cấu trúc

```
src/
├── i18n/
│   ├── index.ts              # Setup i18next
│   ├── glossary.json         # Thuật ngữ domain
│   └── locales/
│       ├── en.json          # Bản dịch tiếng Anh
│       └── vi.json          # Bản dịch tiếng Việt (auto-generated)
├── components/
│   ├── LanguageButton.tsx   # Nút chọn ngôn ngữ ở header
│   └── LanguageModal.tsx    # Modal chọn ngôn ngữ
scripts/
├── i18n-extract.js          # Extract keys từ code
└── i18n-translate.js        # Translate en.json -> vi.json
```

## Cách sử dụng

### 1. Sử dụng trong Component

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('header.title')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
}
```

### 2. Sử dụng với Trans component (cho text có HTML)

```tsx
import { Trans } from 'react-i18next';

function MyComponent() {
  return (
    <Trans i18nKey="form.description">
      This is a <strong>bold</strong> text.
    </Trans>
  );
}
```

### 3. Sử dụng với interpolation

```tsx
const { t } = useTranslation();
const message = t('welcome.message', { name: 'John' });
// en.json: "welcome.message": "Hello, {{name}}!"
```

## Scripts

### Extract keys từ code

```bash
npm run i18n:extract
```

Script này sẽ:
- Scan tất cả file `.ts` và `.tsx` trong `src/`
- Tìm các pattern: `t('key')`, `t("key")`, `<Trans i18nKey="key" />`
- Generate/update `src/i18n/locales/en.json`

### Translate en.json -> vi.json

```bash
npm run i18n:translate
```

**Yêu cầu:** Cần cấu hình API key trong `.env`:

```env
# Ưu tiên DeepL
DEEPL_API_KEY=your_deepl_api_key

# Fallback OpenAI
OPENAI_API_KEY=your_openai_api_key

# Fallback Google Translate
GOOGLE_TRANSLATE_API_KEY=your_google_api_key
```

Script này sẽ:
1. Đọc `en.json` và `vi.json` hiện có
2. Tìm các key chưa được dịch
3. Dịch bằng DeepL (ưu tiên) -> OpenAI -> Google Translate
4. Cache translations vào `.i18n-cache.json`
5. Áp dụng glossary cho thuật ngữ domain
6. Giữ nguyên placeholders: `{{name}}`, `{count}`, `\n`, HTML tags

## Glossary (Thuật ngữ domain)

File `src/i18n/glossary.json` chứa các thuật ngữ cần giữ nguyên hoặc dịch theo quy tắc:

```json
{
  "terms": {
    "TechPack": "TechPack",
    "BOM": "BOM",
    "POM": "POM"
  },
  "translations": {
    "TechPack": "TechPack",
    "BOM": "BOM",
    "POM": "POM",
    "Tolerance": "Dung sai",
    "Colorway": "Phối màu"
  }
}
```

## Xử lý nội dung động từ Backend

### 1. User Content (KHÔNG auto-translate)

Text do user nhập (rich text, notes, comments) **KHÔNG** nên auto-translate. Giữ nguyên như user đã nhập.

```tsx
// ✅ Đúng - Giữ nguyên user content
<div>{techPack.notes}</div>

// ❌ Sai - Không translate user content
<div>{t(techPack.notes)}</div>
```

### 2. Enum/Label từ Backend (PHẢI map qua i18n)

Các enum/status/lifecycle từ backend cần map qua i18n key:

```tsx
// ✅ Đúng - Map enum qua i18n
const getStatusLabel = (status: string) => {
  return t(`status.${status}`); // status.draft, status.approved, etc.
};

// ❌ Sai - Hardcode label
<div>{status}</div>
```

**Ví dụ mapping:**

```tsx
// Backend trả về: role = "admin"
const roleLabel = t(`admin.users.filter.role.${role}`); 
// -> "Quản trị viên" (vi) hoặc "Admin" (en)
```

## Best Practices

1. **Tổ chức keys theo namespace:**
   ```
   common.*          # Common UI elements
   header.*          # Header navigation
   form.*            # Form labels
   admin.users.*     # Admin user management
   ```

2. **Sử dụng nested keys cho nhóm liên quan:**
   ```json
   {
     "admin": {
       "users": {
         "table": {
           "name": "Name",
           "email": "Email"
         }
       }
     }
   }
   ```

3. **Không hardcode text trong code:**
   ```tsx
   // ❌ Sai
   <button>Save</button>
   
   // ✅ Đúng
   <button>{t('common.save')}</button>
   ```

4. **Migrate dần dần:**
   - Ưu tiên migrate các component quan trọng trước (header, nav, buttons)
   - Sau đó migrate từng tab/page
   - Không cần migrate hết một lúc

## Đã migrate

- ✅ `src/App.tsx` - Header, navigation
- ✅ `src/pages/Admin/UserListPage.tsx` - User management table
- ✅ `src/components/LanguageButton.tsx` - Language switcher
- ✅ `src/components/LanguageModal.tsx` - Language selection modal

## Cần migrate tiếp

- [ ] `src/components/TechPackList.tsx`
- [ ] `src/components/TechPackForm/` - Các tab form
- [ ] `src/pages/LoginPage.tsx`
- [ ] Các component khác...

## Troubleshooting

### Language không đổi ngay

- Kiểm tra `src/i18n/index.ts` đã được import trong `main.tsx`
- Kiểm tra localStorage có key `i18nextLng`

### Translation bị thiếu

- Chạy `npm run i18n:extract` để scan keys mới
- Chạy `npm run i18n:translate` để dịch keys mới

### API translation fail

- Kiểm tra API key trong `.env`
- Kiểm tra network connection
- Script sẽ fallback qua các API khác tự động

## CI/CD Integration

Scripts có thể chạy trong CI pipeline:

```yaml
# .github/workflows/i18n.yml
- name: Extract i18n keys
  run: npm run i18n:extract

- name: Translate to Vietnamese
  run: npm run i18n:translate
  env:
    DEEPL_API_KEY: ${{ secrets.DEEPL_API_KEY }}
```

## Notes

- **User Content**: Text do user nhập (notes, comments, rich text) KHÔNG auto-translate
- **Backend Enums**: Phải map qua i18n key để dịch ổn định
- **Glossary**: Các thuật ngữ domain được giữ nguyên hoặc dịch theo glossary
- **Cache**: Translations được cache để tránh dịch lại, tiết kiệm API calls







