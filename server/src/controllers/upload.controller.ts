import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Cấu hình lưu file vào thư mục uploads
const uploadDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage });

export const uploadImageHandler = [
  upload.single('file'),
  (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return; // <-- Thêm return ở đây để kết thúc hàm
    }
    // Trả về URL truy cập ảnh (giả sử frontend truy cập qua /uploads)
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
    return; // <-- Thêm return ở đây để kết thúc hàm
  }
];