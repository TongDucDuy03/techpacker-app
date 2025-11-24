# Multi-Round Sample Measurement Table PDF Export

## ✅ Đã Hoàn Thành

### 1. **Template Mới - Multi-Round Table Layout**
- ✅ Cột trái sticky với measurement points (POM Code, POM Name)
- ✅ Tất cả vòng sample trên cùng một bảng
- ✅ Mỗi vòng là một cột lớn với sub-columns: Requested, Measured, Diff, Revised, Comments
- ✅ Mỗi size có 5 sub-columns riêng
- ✅ Layout landscape, chuyên nghiệp

### 2. **Logic Xử Lý Dữ Liệu**

#### ✅ Requested Source Logic
- **`original`**: Lấy từ measurement spec gốc
- **`previous`**: Lấy từ revised của vòng trước
- Tự động fallback nếu không tìm thấy

#### ✅ Diff Calculation
- Tự động tính toán: `measured - requested`
- Format số thập phân (1 chữ số)
- Chỉ tính khi có cả requested và measured

#### ✅ Diff Color Coding
- **Green (`diff-perfect`)**: Diff = 0 (Perfect match)
- **Red (`diff-over`)**: Diff > 0 (Over spec)
- **Orange (`diff-under`)**: Diff < 0 (Under spec)
- **Gray (`diff-neutral`)**: Không có diff hoặc không tính được

### 3. **Header & Metadata**
- ✅ Logo công ty (nếu có)
- ✅ Tên sản phẩm, mã sản phẩm, phiên bản
- ✅ Metadata cho từng vòng: tên vòng, ngày đo, reviewer
- ✅ Hiển thị trong header của bảng

### 4. **Overall Comments**
- ✅ Khu vực ghi chú tổng cho từng vòng sample
- ✅ Hiển thị sau bảng chính
- ✅ Styled với border và background

### 5. **Footer**
- ✅ Thông tin printed by, date, page numbers
- ✅ Confidential notice

## 📋 Cấu Trúc Template

### File: `server/src/templates/partials/sample-measurement-rounds-multi-table.ejs`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Section Title: Sample Measurement Rounds                   │
├─────────────────────────────────────────────────────────────┤
│ Metadata Section (Product, Article Code, Version, Rounds)  │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ POM Code │ POM Name │ Round 1 (5 cols/size) │ Round 2... │ │
│ │          │          │ Req│Meas│Diff│Rev│Note│ ...        │ │
│ ├──────────┼──────────┼────────────────────────────────────┤ │
│ │ CHEST    │ Chest    │ ... │ ... │ ... │ ... │ ... │ ... │ │
│ │ WAIST    │ Waist    │ ... │ ... │ ... │ ... │ ... │ ... │ │
│ │ ...      │ ...      │ ... │ ... │ ... │ ... │ ... │ ... │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Round 1 - Overall Comments: ...                            │
│ Round 2 - Overall Comments: ...                            │
├─────────────────────────────────────────────────────────────┤
│ Summary Section (Total Rounds, Entries, Points, Size Range) │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Logic Xử Lý

### 1. Collect Measurement Points
```typescript
// Ưu tiên từ original measurements (source of truth)
// Sau đó thêm các points từ rounds nếu có
```

### 2. Build Entry Map
```typescript
// Map entries theo pomCode và measurementId để lookup nhanh
```

### 3. Get Requested Value
```typescript
// 1. Nếu entry có requested → dùng
// 2. Nếu requestedSource = 'previous' → lấy từ previous round's revised
// 3. Ngược lại → lấy từ original measurement spec
```

### 4. Calculate Diff
```typescript
// measured - requested
// Format: 1 decimal place
// Chỉ tính khi có đủ cả 2 giá trị
```

### 5. Determine Diff Color
```typescript
// diff = 0 → green (perfect)
// diff > 0 → red (over)
// diff < 0 → orange (under)
// no diff → gray (neutral)
```

## 🎨 Styling

### Colors
- **Requested**: Blue (#1e40af) với background #eff6ff
- **Measured**: Green (#059669) với background #f0fdf4
- **Diff Perfect**: Green (#15803d) với background #dcfce7
- **Diff Over**: Red (#dc2626) với background #fee2e2
- **Diff Under**: Orange (#ea580c) với background #ffedd5
- **Diff Neutral**: Gray (#6b7280) với background #f9fafb
- **Revised**: Purple (#7c3aed) với background #f3e8ff
- **Comments**: Gray (#475569) với background #f8fafc

### Layout Features
- Sticky left column (POM Code, POM Name)
- Sticky header rows
- Row striping (even rows có background khác)
- Round column groups với border
- Size sub-columns trong mỗi round

## 📊 Data Structure

### Input (from TechPack)
```typescript
{
  measurements: [
    {
      pomCode: "CHEST",
      pomName: "Chest",
      sizes: { XS: 90, S: 94, M: 98, ... }
    }
  ],
  sampleMeasurementRounds: [
    {
      name: "1st Proto",
      date: "2025-01-15",
      reviewer: "John Doe",
      requestedSource: "original", // or "previous"
      overallComments: "Overall comments...",
      measurements: [
        {
          pomCode: "CHEST",
          pomName: "Chest",
          requested: { XS: "90", S: "94" },
          measured: { XS: "91", S: "95" },
          diff: { XS: "1.0", S: "1.0" },
          revised: { XS: "91", S: "95" },
          comments: { XS: "OK", S: "OK" }
        }
      ]
    }
  ]
}
```

### Output (to template)
```typescript
{
  rounds: [
    {
      name: "1st Proto",
      date: "Jan 15, 2025",
      reviewer: "John Doe",
      overallComments: "Overall comments...",
      requestedSource: "original",
      order: 1,
      entries: [
        {
          pomCode: "CHEST",
          pomName: "Chest",
          sizes: {
            XS: {
              requested: "90",
              measured: "91",
              diff: "1.0",
              diffClass: "diff-over",
              revised: "91",
              comments: "OK"
            }
          }
        }
      ]
    }
  ],
  sizes: ["XS", "S", "M", "L", "XL"],
  measurementPoints: [
    { pomCode: "CHEST", pomName: "Chest", measurementId: "..." }
  ]
}
```

## 🚀 Sử Dụng

### Export PDF từ Frontend
```typescript
// Tự động sử dụng template mới khi có sample rounds
exportToPDF() // Trong TechPackContext
```

### API Endpoint
```
GET /api/v1/techpacks/:id/pdf?landscape=true
```

### Response
- Content-Type: application/pdf
- File download với tên: `Techpack_{articleCode}.pdf`
- Tự động sử dụng multi-round table template khi có sample rounds

## ✅ Checklist Hoàn Thành

- [x] Template mới với layout multi-round table
- [x] Cột trái sticky
- [x] Tất cả vòng trên cùng một bảng
- [x] Sub-columns: Requested, Measured, Diff, Revised, Comments
- [x] Logic tính toán diff
- [x] Tô màu diff (green/red/orange)
- [x] Logic requestedSource (original/previous)
- [x] Overall comments cho mỗi vòng
- [x] Header với metadata
- [x] Footer với thông tin
- [x] Summary section
- [x] i18n strings
- [x] Landscape orientation
- [x] Print optimizations

## 📝 Lưu Ý

1. **Tất cả measurement points được hiển thị**: Ngay cả khi một vòng không có entry cho point đó, vẫn hiển thị với giá trị "—"
2. **Requested tự động**: Tự động lấy từ spec gốc hoặc vòng trước tùy theo requestedSource
3. **Diff tự động tính**: Nếu chưa có diff, tự động tính từ measured - requested
4. **Màu sắc diff**: Tự động tô màu dựa trên giá trị diff
5. **Layout responsive**: Bảng có thể scroll ngang, cột trái luôn sticky

## 🎯 Kết Quả

PDF export hiện đã **HOÀN CHỈNH** với:
- ✅ Layout multi-round table giống file mẫu
- ✅ Cột trái sticky
- ✅ Tất cả vòng trên cùng một bảng
- ✅ Sub-columns đầy đủ cho mỗi size
- ✅ Diff được tính toán và tô màu
- ✅ Overall comments cho mỗi vòng
- ✅ Header, footer, metadata đầy đủ
- ✅ Sẵn sàng cho in ấn và gửi supplier

