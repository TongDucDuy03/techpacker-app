/**
 * PDF Translations
 * Provides translations for PDF export based on language
 */

export type PDFLanguage = 'en' | 'vi';

export interface PDFTranslations {
  // Common labels
  productName: string;
  articleCode: string;
  version: string;
  status: string;
  brand: string;
  season: string;
  collection: string;
  supplier: string;
  designer: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Section headers
  articleSummary: string;
  billOfMaterials: string;
  measurements: string;
  colorways: string;
  howToMeasure: string;
  sampleMeasurements: string;
  revisionHistory: string;
  
  // Status values
  draft: string;
  process: string;
  approved: string;
  rejected: string;
  archived: string;
  pending: string;
  
  // Table headers
  materialName: string;
  part: string;
  position: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  totalPrice: string;
  comments: string;
  color: string;
  size: string;
  
  // Measurement labels
  pomCode: string;
  pomName: string;
  measurementType: string;
  category: string;
  tolerance: string;
  notes: string;
  critical: string;
  
  // Colorway labels
  colorwayName: string;
  pantoneCode: string;
  hexColor: string;
  rgbColor: string;
  productionStatus: string;
  
  // Other
  noImage: string;
  empty: string;
  page: string;
  of: string;
  
  // Additional labels
  productCode: string;
  createdOn: string;
  lastModified: string;
  description: string;
  materialDescription: string;
  productType: string;
  productSubCategory: string;
  productProgress: string;
  careInstructions: string;
  careSymbols: string;
  fiberContent: string;
  fiberContentAndInstructions: string;
  instructions: string;
  modifiedBy: string;
  date: string;
  productInfo: string;
  confidential: string;
  productFit: string;
  technicalDesigner: string;
  measurementDate: string;
  reviewer: string;
  requestedSource: string;
  overallComments: string;
  code: string;
  placement: string;
  qty: string;
  uom: string;
  colorCode: string;
}

const translations: Record<PDFLanguage, PDFTranslations> = {
  en: {
    productName: 'Product Name',
    articleCode: 'Article Code',
    version: 'Version',
    status: 'Status',
    brand: 'Brand',
    season: 'Season',
    collection: 'Collection',
    supplier: 'Supplier',
    designer: 'Designer',
    createdBy: 'Created By',
    updatedBy: 'Updated By',
    createdAt: 'Created At',
    updatedAt: 'Updated At',
    articleSummary: 'Article Summary',
    billOfMaterials: 'Bill of Materials',
    measurements: 'Measurements',
    colorways: 'Colorways',
    howToMeasure: 'How to Measure',
    sampleMeasurements: 'Sample Measurements',
    revisionHistory: 'Revision History',
    draft: 'Draft',
    process: 'Process',
    approved: 'Approved',
    rejected: 'Rejected',
    archived: 'Archived',
    pending: 'Pending',
    materialName: 'Material Name',
    part: 'Part',
    position: 'Position',
    quantity: 'Quantity',
    unit: 'Unit',
    unitPrice: 'Unit Price',
    totalPrice: 'Total Price',
    comments: 'Comments',
    color: 'Color',
    size: 'Size',
    pomCode: 'POM Code',
    pomName: 'POM Name',
    measurementType: 'Measurement Type',
    category: 'Category',
    tolerance: 'Tolerance',
    notes: 'Notes',
    critical: 'Critical',
    colorwayName: 'Colorway Name',
    pantoneCode: 'Pantone Code',
    hexColor: 'Hex Color',
    rgbColor: 'RGB Color',
    productionStatus: 'Production Status',
    noImage: 'No Image',
    empty: '—',
    page: 'Page',
    of: 'of',
    productCode: 'Product Code',
    createdOn: 'Created On',
    lastModified: 'Last Modified',
    description: 'Description',
    materialDescription: 'Material Description',
    productType: 'Product Type',
    productSubCategory: 'Product Sub-Category',
    productProgress: 'Product Progress',
    careInstructions: 'Care Instructions',
    careSymbols: 'Care Symbols',
    fiberContent: 'Fiber Content',
    fiberContentAndInstructions: 'Fiber Content & Instructions',
    instructions: 'Instructions',
    modifiedBy: 'Modified By',
    date: 'Date',
    productInfo: 'Product Info',
    confidential: 'Confidential',
    productFit: 'Product Fit',
    technicalDesigner: 'Technical Designer',
    measurementDate: 'Measurement Date',
    reviewer: 'Reviewer',
    requestedSource: 'Requested Source',
    overallComments: 'Overall Comments',
    code: 'Code',
    placement: 'Placement',
    qty: 'Qty',
    uom: 'UOM',
    colorCode: 'Color Code',
  },
  vi: {
    productName: 'Tên sản phẩm',
    articleCode: 'Mã sản phẩm',
    version: 'Phiên bản ban hành',
    status: 'Trạng thái',
    brand: 'Tên thương hiệu',
    season: 'Mùa',
    collection: 'Bộ sưu tập',
    supplier: 'Đơn vị cung cấp',
    designer: 'Nhà thiết kế',
    createdBy: 'Người tạo',
    updatedBy: 'Người cập nhật',
    createdAt: 'Ngày tạo',
    updatedAt: 'Ngày cập nhật',
    articleSummary: 'Tóm tắt sản phẩm',
    billOfMaterials: 'Nguyên Phụ Liệu',
    measurements: 'Bảng thông số đo - Nhận xét mẫu',
    colorways: 'Phối màu',
    howToMeasure: 'Cấu trúc chi tiết',
    sampleMeasurements: 'Đo mẫu',
    revisionHistory: 'Lịch sử chỉnh sửa',
    draft: 'Nháp',
    process: 'Đang tiến hành',
    approved: 'Được phê duyệt',
    rejected: 'Từ chối',
    archived: 'Đã lưu trữ',
    pending: 'Chờ duyệt',
    materialName: 'Vật tư tên đầy đủ',
    part: 'Vật tư dạng kí hiệu',
    position: 'Vị trí sử dụng',
    quantity: 'Số lượng',
    unit: 'Đơn vị đo',
    unitPrice: 'Giá thành',
    totalPrice: 'Tổng giá',
    comments: 'Ghi chú',
    color: 'Màu',
    size: 'Kích thước,cách sử dụng',
    pomCode: 'Mã POM',
    pomName: 'Tên POM',
    measurementType: 'Loại đo',
    category: 'Chủng loại sản phẩm',
    tolerance: 'Dung sai',
    notes: 'Ghi chú',
    critical: 'Quan trọng',
    colorwayName: 'Tên màu',
    pantoneCode: 'Mã Pantone',
    hexColor: 'Mã màu Hex',
    rgbColor: 'Mã màu RGB',
    productionStatus: 'Trạng thái sản xuất',
    noImage: 'Không có hình ảnh',
    empty: '—',
    page: 'Trang',
    of: 'của',
    productCode: 'Mã sản phẩm',
    createdOn: 'Ngày tạo',
    lastModified: 'Cập nhật lần cuối',
    description: 'Mô tả về sản phẩm',
    materialDescription: 'Mô tả về vải chính',
    productType: 'Chủng loại sản phẩm',
    productSubCategory: 'Danh mục phụ',
    productProgress: 'Tiến độ sản phẩm',
    careInstructions: 'Hướng dẫn bảo quản',
    careSymbols: 'Ký hiệu bảo quản',
    fiberContent: 'Thành phần sợi',
    fiberContentAndInstructions: 'Thành phần sợi & Hướng dẫn',
    instructions: 'Hướng dẫn',
    modifiedBy: 'Người chỉnh sửa',
    date: 'Ngày',
    productInfo: 'Thông tin sản phẩm',
    confidential: 'Bảo mật',
    productFit: 'Phom dáng sản phẩm',
    technicalDesigner: 'Nhà thiết kế kỹ thuật',
    measurementDate: 'Ngày đo',
    reviewer: 'Người đánh giá',
    requestedSource: 'Nguồn yêu cầu',
    overallComments: 'Nhận xét tổng thể',
    code: 'Mã',
    placement: 'Vị trí sử dụng',
    qty: 'SL',
    uom: 'ĐVT',
    colorCode: 'Mã màu',
  },
};

export function getPDFTranslations(language: PDFLanguage = 'en'): PDFTranslations {
  return translations[language] || translations.en;
}

export default getPDFTranslations;

