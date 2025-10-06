# Tech Pack Management System

Hệ thống quản lý Tech Pack chuyên nghiệp cho ngành thời trang, được xây dựng với React + TypeScript + TailwindCSS.

## ✨ Tính năng chính

### 📋 6 Tab quản lý hoàn chỉnh
1. **Article Info** - Thông tin sản phẩm cơ bản
2. **Bill of Materials** - Danh sách vật liệu và phụ kiện
3. **Measurement Chart** - Bảng số đo theo size
4. **How To Measure** - Hướng dẫn đo chi tiết
5. **Colorways** - Quản lý phối màu và Pantone
6. **Revision History** - Lịch sử thay đổi và version

### 🚀 Tính năng nâng cao
- ✅ Auto-save thông minh (2s sau khi thay đổi)
- ✅ Keyboard shortcuts (Ctrl+S, Ctrl+E, etc.)
- ✅ Responsive design (Desktop/Tablet/Mobile)
- ✅ Progress tracking và completion status
- ✅ PDF export với template chuyên nghiệp
- ✅ Local storage backup
- ✅ Real-time validation
- ✅ Material templates (Shirt, Pants)
- ✅ Multi-language support

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **State Management**: Context API + useReducer
- **Performance**: useMemo, useCallback optimizations
- **Storage**: LocalStorage với fallback

## 📦 Cài đặt

```bash
# Clone repository
git clone <repository-url>
cd tech-pack-management

npm install
# hoặc
yarn install

# Chạy development server
npm start
# hoặc
yarn start
```

## 🎯 Cách sử dụng

### Setup cơ bản

```tsx
import React from 'react';
import { TechPackProvider } from './contexts/TechPackContext';
import TechPackTabs from './components/TechPackForm/TechPackTabs';

function App() {
  return (
    <TechPackProvider>
      <TechPackTabs />
    </TechPackProvider>
  );
}

export default App;
```

### Sử dụng với custom configuration

```tsx
import ExampleTechPackApp from './components/TechPackForm/examples/ExampleApp';

function App() {
  return <ExampleTechPackApp />;
}
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` | Save tech pack |
| `Ctrl + E` | Export to PDF |
| `Ctrl + 1-6` | Switch to tab 1-6 |
| `Ctrl + ←/→` | Previous/Next tab |
| `Tab` | Navigate between fields |
| `Esc` | Close modals/forms |

## 🎨 Customization

### Thêm tab mới

1. Tạo component trong `src/components/TechPackForm/tabs/`
2. Cập nhật `TechPackTabs.tsx`
3. Thêm TypeScript interfaces trong `src/types/techpack.ts`
4. Cập nhật context và reducer logic

### Custom styling

```tsx
// Override default theme
const customTheme = {
  colors: {
    primary: '#your-color',
    secondary: '#your-color'
  }
};
```

## 🚀 Deployment

### Production Build

```bash
# Build for production
npm run build

# Analyze bundle
npm run analyze
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

### Common Issues

**Auto-save không hoạt động**
- Kiểm tra localStorage permissions
- Verify network connectivity

**PDF export thất bại**
- Disable popup blockers
- Check browser compatibility

**Mobile layout bị lỗi**
- Update viewport meta tag
- Check TailwindCSS responsive classes

---

**Built with ❤️ for the Fashion Industry**

```bash
npm install
```

2. Development server

```bash
npm run dev
```

Data Storage

- By default, the app stores Tech Packs and Activities in the browser's `localStorage`.
- Data persists across page reloads on the same browser/profile.

Optional: Supabase (hosted database)

1. Create a `.env` file at the project root with:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

2. In your code, import `supabase` from `src/lib/supabaseClient` and use it only if configured:

```ts
import { supabase, isSupabaseConfigured } from './src/lib/supabaseClient';

if (isSupabaseConfigured()) {
  // example: await supabase.from('techpacks').select('*')
}
```

Notes

- If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing, Supabase is disabled and the app continues using `localStorage`.

Optional: Local MongoDB + Express API

1. Cài MongoDB Community Server trên máy và bật dịch vụ (URI mặc định `mongodb://127.0.0.1:27017`).
2. Tạo file `.env` trong `server/`:

```
MONGO_URI=mongodb://127.0.0.1:27017
DB_NAME=techpacker_app
PORT=4000
```

3. Chạy API server:

```bash
cd server
npm install
npm run dev
```

4. Chạy frontend với biến môi trường trỏ đến API:

```
VITE_API_BASE_URL=http://localhost:4000
```

5. Khi `VITE_API_BASE_URL` được set, app sẽ dùng REST API (MongoDB). Nếu không, sẽ ưu tiên Supabase (nếu set) hoặc quay về `localStorage`.