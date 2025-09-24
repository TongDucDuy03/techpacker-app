techpacker-app

Setup

1. Install dependencies

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