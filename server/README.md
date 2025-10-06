# TechPacker PDF Generator API

Hệ thống tạo PDF chuyên nghiệp cho Tech Pack thời trang, sử dụng Node.js + Express + TypeScript + Puppeteer theo chuẩn WFX.

## 🚀 Tính năng chính

- ✅ **PDF Generation**: Tạo PDF từ dữ liệu TechPack với layout chuẩn WFX
- ✅ **Multi-page Layout**: Tự động chia trang theo nội dung (Header, BOM, Measurements, How to Measure)
- ✅ **Dynamic Watermark**: Watermark tùy chỉnh theo lifecycle stage
- ✅ **Dynamic Logo**: Logo tự động theo supplier/brand
- ✅ **PDF Preview**: Preview từng trang dưới dạng base64 image
- ✅ **Bulk Generation**: Tạo nhiều PDF cùng lúc
- ✅ **Rate Limiting**: Giới hạn request để bảo vệ server
- ✅ **Validation**: Kiểm tra dữ liệu đầu vào chi tiết
- ✅ **Professional Styling**: CSS responsive cho in ấn chuyên nghiệp

## 📦 Cài đặt

```bash
# Clone và cài đặt dependencies
cd server
npm install

# Cài đặt Puppeteer dependencies (Linux)
sudo apt-get install -y libgconf-2-4 libxss1 libxtst6 libxrandr2 libasound2 libpangocairo-1.0-0 libatk1.0-0 libcairo-gobject2 libgtk-3-0 libgdk-pixbuf2.0-0

# Build TypeScript
npm run build

# Chạy development server
npm run dev

# Chạy production server
npm start
```

## 🔧 Environment Variables

Tạo file `.env`:

```env
PORT=4001
NODE_ENV=development

# PDF Generation Settings
PDF_TIMEOUT=30000
PDF_CONCURRENT_LIMIT=5
PUPPETEER_HEADLESS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=10
BULK_RATE_LIMIT_MAX=3

# Logging
LOG_LEVEL=info
```

## 📋 API Endpoints

### 1. Generate PDF
```http
POST /api/techpacks/:id/pdf
```

**Request Body:**
```json
{
  "options": {
    "format": "A4",
    "orientation": "portrait",
    "includeImages": true,
    "imageQuality": 90,
    "margin": {
      "top": "30px",
      "bottom": "40px",
      "left": "20px",
      "right": "20px"
    }
  }
}
```

**Response:** PDF file download

### 2. PDF Preview
```http
GET /api/techpacks/:id/pdf/preview?page=1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "base64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "filename": "1276_preview_p1.png",
    "previewUrl": "data:image/png;base64,..."
  }
}
```

### 3. PDF Info
```http
GET /api/techpacks/:id/pdf/info
```

**Response:**
```json
{
  "success": true,
  "data": {
    "techpackId": "sample-techpack-1",
    "articleCode": "1276",
    "version": "V1",
    "isValid": true,
    "estimatedPages": 4,
    "canGeneratePDF": true,
    "supportedFormats": ["A4", "Letter", "Legal"]
  }
}
```

### 4. Bulk PDF Generation
```http
POST /api/techpacks/bulk/pdf
```

**Request Body:**
```json
{
  "techpackIds": ["techpack-1", "techpack-2"],
  "options": {
    "format": "A4",
    "orientation": "portrait"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "techpackId": "techpack-1",
        "success": true,
        "filename": "1276_V1.pdf",
        "size": 245760
      }
    ],
    "summary": {
      "total": 2,
      "successful": 1,
      "failed": 1
    }
  }
}
```

## 📊 Dữ liệu đầu vào

### TechPack Data Structure
```typescript
interface TechPackData {
  techpack: {
    name: string;
    articleCode: string;
    version: string;
    designer: string;
    supplier: string;
    season: string;
    fabricDescription: string;
    lifecycleStage: string;
    // ... other fields
  };
  materials: Array<{
    part: string;
    materialName: string;
    placement: string;
    quantity: number;
    uom: string;
    supplier: string;
    // ... other fields
  }>;
  measurements: Array<{
    pomCode: string;
    pomName: string;
    toleranceMinus: number;
    tolerancePlus: number;
    sizes: { [size: string]: number };
    // ... other fields
  }>;
  howToMeasure: Array<{
    pomCode: string;
    pomName: string;
    description: string;
    imageUrl: string;
    instructions: string[];
    // ... other fields
  }>;
  colorways: Array<{
    name: string;
    code: string;
    pantoneCode?: string;
    hexColor?: string;
    placement: string;
    materialType: string;
    // ... other fields
  }>;
}
```

## 🎨 PDF Layout Structure

### Page 1: Header & Article Info
- Company logo (dynamic theo supplier)
- Article information table
- Status indicators
- Fabric description

### Page 2-3: Bill of Materials
- Materials table với đầy đủ thông tin
- BOM summary với cost calculation
- Material categories breakdown
- Approval status indicators

### Page 4-5: Measurement Chart
- Size range table (XS-XXL)
- Tolerance indicators (-Tol/+Tol)
- Critical measurements highlighting
- Measurement guidelines

### Page 6+: How To Measure
- Step-by-step instructions với images
- Tips và common mistakes
- Related measurements linking
- Measuring tools reference

### Final Page: Colorways
- Color swatches với Pantone codes
- Material placement information
- Supplier details
- Approval status

## 🔒 Security & Rate Limiting

### Rate Limits
- **PDF Generation**: 10 requests/15 minutes per IP
- **Bulk Generation**: 3 requests/hour per IP
- **Preview**: 10 requests/15 minutes per IP

### Validation
- TechPack ID format validation
- PDF options validation
- File upload validation (images)
- Data structure validation

## 🧪 Testing

```bash
# Chạy unit tests
npm test

# Chạy tests với coverage
npm run test:coverage

# Chạy tests trong watch mode
npm run test:watch
```

### Test Coverage
- API endpoints testing
- PDF generation logic
- Validation middleware
- Logo và watermark generators
- Rate limiting functionality

##[object Object]ce & Monitoring

### Optimization Features
- Puppeteer instance reuse
- Image compression
- CSS minification
- Memory management
- Concurrent request limiting

### Monitoring Endpoints
```http
GET /api/techpacks/health
GET /api/techpacks/docs
```

## 🔧 Customization

### Custom Watermarks
```typescript
const watermark = WatermarkGenerator.generateWatermarkCSS({
  text: 'CONFIDENTIAL',
  opacity: 0.1,
  rotation: -45,
  fontSize: 60,
  color: '#dc2626',
  position: 'diagonal'
});
```

### Custom Logos
```typescript
const logoUrl = LogoGenerator.getLogoForSupplier('Your Company');
```

### Custom Styling
Chỉnh sửa `src/utils/pdf-styles.ts` để tùy chỉnh CSS.

##[object Object]Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 4001
CMD ["npm", "start"]
```

### Production Checklist
- [ ] Set NODE_ENV=production
- [ ] Configure proper rate limits
- [ ] Set up monitoring (PM2, New Relic)
- [ ] Configure reverse proxy (Nginx)
- [ ] Set up SSL certificates
- [ ] Configure log rotation
- [ ] Set up backup strategy

## 🐛 Troubleshooting

### Common Issues

**Puppeteer không khởi động được:**
```bash
# Install missing dependencies
sudo apt-get install -y chromium-browser
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

**Memory issues:**
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 dist/index.js
```

**PDF generation timeout:**
- Tăng PDF_TIMEOUT trong .env
- Giảm imageQuality trong options
- Disable includeImages nếu không cần

### Error Codes
- `TECHPACK_NOT_FOUND`: TechPack không tồn tại
- `VALIDATION_ERROR`: Dữ liệu đầu vào không hợp lệ
- `TEMPLATE_ERROR`: Lỗi render EJS template
- `PUPPETEER_ERROR`: Lỗi tạo PDF
- `RATE_LIMIT_EXCEEDED`: Vượt quá giới hạn request

## 📞 Support

- **Documentation**: `/api/techpacks/docs`
- **Health Check**: `/api/techpacks/health`
- **GitHub Issues**: [Create Issue](https://github.com/your-repo/issues)

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for the Fashion Industry**
