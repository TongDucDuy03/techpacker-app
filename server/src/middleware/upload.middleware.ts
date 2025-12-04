import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { Request } from 'express';

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer sẽ lưu file tạm vào bộ nhớ, sau đó chúng ta nén/resize và ghi ra đĩa với sharp
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|svg/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Error: File upload only supports the following filetypes - ' + allowedTypes));
};

// Initialize upload (giới hạn file gốc 10MB, sẽ nén xuống thấp hơn)
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for original upload
  fileFilter,
});

/**
 * Middleware sau upload.single(...) để nén/resize ảnh và lưu xuống thư mục uploads.
 * - Giảm kích thước & chất lượng ảnh để tối ưu dung lượng (tốt cho export PDF sau này).
 * - Thay thế `req.file` bằng thông tin file đã được ghi ra đĩa.
 */
export async function processUploadedImage(
  req: Request,
  _res: any,
  next: (err?: any) => void
) {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return next();
    }

    // Đặt kích thước & chất lượng tối đa (tuỳ chỉnh qua ENV nếu cần)
    const maxWidth = Number(process.env.UPLOAD_IMAGE_MAX_WIDTH || 1600);
    const maxHeight = Number(process.env.UPLOAD_IMAGE_MAX_HEIGHT || 1600);
    const quality = Number(process.env.UPLOAD_IMAGE_QUALITY || 70); // 0-100

    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const baseName = `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const targetFilename = `${baseName}${ext === '.png' || ext === '.svg' ? '.png' : '.jpg'}`;
    const targetPath = path.join(uploadDir, targetFilename);

    // Dùng sharp để resize & nén; với SVG chỉ lưu nguyên vì đã vector
    let pipeline = sharp(file.buffer);

    // Nếu không phải SVG thì resize & nén
    if (!file.mimetype.includes('svg')) {
      pipeline = pipeline.resize({
        width: maxWidth,
        height: maxHeight,
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      });
      if (ext === '.png') {
        pipeline = pipeline.png({ quality });
      } else {
        pipeline = pipeline.jpeg({ quality });
      }
    }

    await pipeline.toFile(targetPath);

    // Ghi đè thông tin file để các controller/routing dùng như cũ
    (req as any).file = {
      ...file,
      path: targetPath,
      filename: targetFilename,
      size: fs.statSync(targetPath).size,
    } as any;

    next();
  } catch (error) {
    console.error('Image processing failed:', (error as Error).message);
    next(error);
  }
}

export default upload;

