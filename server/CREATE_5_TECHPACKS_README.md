# Hướng dẫn tạo 5 TechPack hoàn chỉnh

Script này sẽ tạo 5 TechPack hoàn chỉnh với đầy đủ dữ liệu để test:

1. **Classic Cotton Polo Shirt** - Áo polo nam
2. **Slim Fit Denim Jeans** - Quần jeans
3. **Premium Cotton T-Shirt** - Áo thun
4. **Winter Puffer Jacket** - Áo khoác mùa đông
5. **Floral Summer Dress** - Váy mùa hè

## Cách sử dụng

### 1. Đảm bảo server đang chạy
```bash
cd server
npm run dev
```

### 2. Chạy script
```bash
cd server
node create-5-techpacks.js
```

### 3. Với thông tin đăng nhập tùy chỉnh
```bash
TEST_EMAIL=your@email.com TEST_PASSWORD=yourpassword node create-5-techpacks.js
```

Hoặc với API URL khác:
```bash
API_URL=http://your-api-url/api/v1 node create-5-techpacks.js
```

## Dữ liệu mỗi TechPack bao gồm

Mỗi TechPack được tạo với đầy đủ:

- ✅ **Article Info**: Tên sản phẩm, mã sản phẩm, nhà cung cấp, mùa, mô tả vải, v.v.
- ✅ **BOM (Bill of Materials)**: 4-8 items với đầy đủ thông tin vật liệu
- ✅ **Measurements**: 3-5 điểm đo với đầy đủ kích thước (S, M, L, XL, XXL)
- ✅ **Colorways**: 2-3 màu sắc với thông tin Pantone, hex, RGB
- ✅ **How to Measure**: Hướng dẫn đo chi tiết với instructions, tips, common mistakes

## Kết quả

Sau khi chạy script, bạn sẽ thấy:

- Danh sách 5 TechPack đã được tạo
- ID của mỗi TechPack
- Link để xem TechPack trên frontend
- Tóm tắt kết quả (thành công/thất bại)

## Lưu ý

- Script sẽ tự động tạo mã sản phẩm duy nhất bằng cách thêm timestamp
- Mỗi TechPack sẽ có status mặc định là "Draft"
- Version sẽ bắt đầu từ "v1.0"
- Technical Designer ID sẽ được tự động lấy từ user đăng nhập

## Troubleshooting

Nếu gặp lỗi:

1. **Lỗi đăng nhập**: Kiểm tra email và password
2. **Lỗi kết nối**: Đảm bảo server đang chạy ở đúng port (mặc định: 4001)
3. **Lỗi validation**: Kiểm tra xem có TechPack nào với mã sản phẩm tương tự không

