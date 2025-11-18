import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type LanguageCode = 'en' | 'vi';

type TranslationDict = Record<string, string>;

const translations: Record<LanguageCode, TranslationDict> = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.techpacks': 'Tech Packs',
    'nav.measurements': 'Measurements',
    'nav.materials': 'Materials',
    'nav.colorways': 'Colorways',
    'nav.analytics': 'Analytics',
    'nav.team': 'Team',
    'nav.settings': 'Settings',

    'chip.productionReady': 'Production Ready',

    'form.basicInfo': 'Basic Info',
    'form.materials': 'Materials',
    'form.measurements': 'Measurements',
    'form.colorways': 'Colorways',
    'form.construction': 'Construction',

    'form.productName': 'Product Name',
    'form.category': 'Category',
    'form.brand': 'Brand',
    'form.designer': 'Designer',
    'form.season': 'Season',
    'form.status': 'Status',
    'form.season.placeholder': 'e.g., Spring 2024',

    'form.saveMaterialsToLibrary': 'Save new materials to library',
    'form.saveMeasurementsToLibrary': 'Save current points as template',
    'form.saveColorwaysToLibrary': 'Save new colorways to library',
    'form.saveMaterialsToLibrary.footer': 'Save materials to library',
    'form.saveMeasurementsToLibrary.footer': 'Save measurements template',
    'form.saveColorwaysToLibrary.footer': 'Save colorways to library',

    'form.createTechPack': 'Create Tech Pack',
    'form.updateTechPack': 'Update Tech Pack',
    'form.createNewTechPackTitle': 'Create New Tech Pack',
    'form.editTechPackTitle': 'Edit Tech Pack',
    'form.cancel': 'Cancel',

    'materials.bom': 'Bill of Materials',
    'materials.addRow': 'Add Row',
    'materials.addFromLibrary': 'Add from library…',
    'materials.applyTemplate': 'Apply template…',
    'measurements.add': 'Add Measurement',
    'colorways.add': 'Add Colorway',
    'actions.add': 'Add',
    'actions.remove': 'Remove',
    'actions.removeColorway': 'Remove Colorway',
    'actions.apply': 'Apply',

    // Materials table headers
    'materials.header.stt': 'No.',
    'materials.header.specifications': 'Specifications',
    'materials.header.position': 'Position',
    'materials.header.quantity': 'Quantity',
    'materials.header.unit': 'Unit',
    'materials.header.notes': 'Technical notes',
    'materials.header.submaterials': 'Sub-materials',

    // Materials fields placeholders
    'materials.placeholder.specifications': 'Specifications',
    'materials.placeholder.name': 'Material Name',
    'materials.placeholder.composition': 'Composition',
    'materials.placeholder.supplier': 'Supplier',
    'materials.placeholder.color': 'Color',
    'materials.placeholder.consumption': 'Consumption',
    'materials.placeholder.position': 'Position',
    'materials.placeholder.qty': 'Qty',
    'materials.placeholder.unit': 'Unit',
    'materials.placeholder.notes': 'Technical notes',
    'materials.addSubMaterial': 'Add sub-material',

    // Measurements
    'measurements.header.point': 'Measurement Point',
    'measurements.header.tolerance': 'Tolerance (e.g., ±0.5cm)',
    'measurements.placeholder.size': 'Size',

    // Colorways
    'colorways.placeholder.name': 'Colorway Name',
    'colorways.placeholder.part': 'Part',
    'colorways.placeholder.color': 'Color',
    'colorways.placeholder.pantone': 'Pantone (optional)',

    // Construction
    'construction.placeholder.detail': 'Construction detail',

    // TechPackList
    'tpl.header.title': 'Tech Pack Management',
    'tpl.header.subtitle': 'Manage your fashion technical packages',
    'tpl.new': 'New Tech Pack',
    'tpl.search.placeholder': 'Search tech packs...',
    'tpl.filter.status.all': 'All Status',
    'tpl.filter.status.draft': 'Draft',
    'tpl.filter.status.review': 'Under Review',
    'tpl.filter.status.approved': 'Approved',
    'tpl.filter.status.production': 'Production',
    'tpl.filter.category.all': 'All Categories',
    'tpl.filter.more': 'More Filters',
    'tpl.card.view': 'View',
    'tpl.empty.title': 'No tech packs found',
    'tpl.empty.subtitle': 'Try adjusting your search or filter criteria',
    'tpl.empty.cta': 'Create Your First Tech Pack',

    // Dashboard
    'dash.stat.total': 'Total Tech Packs',
    'dash.stat.production': 'In Production',
    'dash.stat.review': 'Under Review',
    'dash.stat.approved': 'Approved',
    'dash.recent.techpacks': 'Recent Tech Packs',
    'dash.recent.activity': 'Recent Activity',
    'dash.recent.activity.empty': 'No recent activity yet.',
    'dash.alerts.title': 'Alerts & Notifications',
    'dash.alerts.pendingReview.suffix': 'has been pending review for 5 days',
    'dash.alerts.seasonDeadline.prefix': 'Season deadline approaching:',
    'dash.alerts.seasonDeadline.suffix': 'due in 2 weeks',

    // Materials Library
    'matlib.title': 'Materials Library',
    'matlib.hint': 'Set VITE_API_BASE_URL to enable Mongo-backed library.',
    'matlib.form.name': 'Name',
    'matlib.form.composition': 'Composition',
    'matlib.form.supplier': 'Supplier',
    'matlib.form.color': 'Color',
    'matlib.form.consumption': 'Consumption',
    'matlib.btn.add': 'Add',
    'matlib.btn.update': 'Update',
    'matlib.btn.edit': 'Edit',
    'matlib.btn.delete': 'Delete',
    'matlib.empty': 'No materials yet.',

    // Measurements Management
    'measmgmt.title': 'Measurements Management',
    'measmgmt.hint': 'Set VITE_API_BASE_URL to enable Mongo-backed templates.',
    'measmgmt.form.templateName': 'Template name',
    'measmgmt.form.point': 'Point',
    'measmgmt.form.tolerance': 'Tolerance',
    'measmgmt.btn.addPoint': 'Add point',
    'measmgmt.pointsCount': '{n} points',
    'measmgmt.btn.create': 'Create template',
    'measmgmt.btn.update': 'Update template',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'measmgmt.empty': 'No templates yet.',

    // Colorways Management
    'colormgmt.title': 'Colorways Management',
    'colormgmt.hint': 'Set VITE_API_BASE_URL to enable Mongo-backed colorways.',
    'colormgmt.form.name': 'Colorway name',
    'colormgmt.form.part': 'Part',
    'colormgmt.form.color': 'Color',
    'colormgmt.form.pantone': 'Pantone (optional)',
    'colormgmt.btn.addColor': 'Add color',
    'colormgmt.colorsCount': '{n} colors',
    'colormgmt.btn.create': 'Create colorway',
    'colormgmt.btn.update': 'Update colorway',
    'colormgmt.empty': 'No colorways yet.',

    // Sample measurement rounds
    'sample.requestedSource': 'Requested Source',
    'sample.originalSpec': 'Original Spec',
    'sample.fromPrevious': 'From Previous Round',
    'sample.round': 'Sample Round',
    'sample.date': 'Date',
    'sample.reviewer': 'Reviewer',
    'sample.requested': 'Requested',
    'sample.measured': 'Measured',
    'sample.diff': 'Diff',
    'sample.revised': 'Revised',
    'sample.comments': 'Comments',
  },
  vi: {
    'nav.dashboard': 'Bảng điều khiển',
    'nav.techpacks': 'Tech Packs',
    'nav.measurements': 'Kích thước',
    'nav.materials': 'Nguyên phụ liệu',
    'nav.colorways': 'Phối màu',
    'nav.analytics': 'Phân tích',
    'nav.team': 'Nhóm',
    'nav.settings': 'Cài đặt',

    'chip.productionReady': 'Sẵn sàng sản xuất',

    'form.basicInfo': 'Thông tin cơ bản',
    'form.materials': 'Nguyên phụ liệu',
    'form.measurements': 'Kích thước',
    'form.colorways': 'Phối màu',
    'form.construction': 'Cấu trúc',

    'form.productName': 'Tên sản phẩm',
    'form.category': 'Danh mục',
    'form.brand': 'Thương hiệu',
    'form.designer': 'Nhà thiết kế',
    'form.season': 'Mùa',
    'form.status': 'Trạng thái',
    'form.season.placeholder': 'ví dụ: Xuân 2024',

    'form.saveMaterialsToLibrary': 'Lưu nguyên phụ liệu mới vào thư viện',
    'form.saveMeasurementsToLibrary': 'Lưu điểm đo hiện tại thành mẫu',
    'form.saveColorwaysToLibrary': 'Lưu phối màu mới vào thư viện',
    'form.saveMaterialsToLibrary.footer': 'Lưu nguyên phụ liệu vào thư viện',
    'form.saveMeasurementsToLibrary.footer': 'Lưu mẫu kích thước',
    'form.saveColorwaysToLibrary.footer': 'Lưu phối màu vào thư viện',

    'form.createTechPack': 'Tạo Tech Pack',
    'form.updateTechPack': 'Cập nhật Tech Pack',
    'form.createNewTechPackTitle': 'Tạo mới Tech Pack',
    'form.editTechPackTitle': 'Chỉnh sửa Tech Pack',
    'form.cancel': 'Hủy',

    'materials.bom': 'Định mức nguyên phụ liệu',
    'materials.addRow': 'Thêm dòng',
    'materials.addFromLibrary': 'Thêm từ thư viện…',
    'materials.applyTemplate': 'Áp dụng mẫu…',
    'measurements.add': 'Thêm điểm đo',
    'colorways.add': 'Thêm phối màu',
    'actions.add': 'Thêm',
    'actions.remove': 'Xóa',
    'actions.removeColorway': 'Xóa phối màu',
    'actions.apply': 'Áp dụng',

    // Materials table headers
    'materials.header.stt': 'STT',
    'materials.header.specifications': 'Thông số kỹ thuật',
    'materials.header.position': 'Vị trí',
    'materials.header.quantity': 'Số lượng',
    'materials.header.unit': 'Đơn vị',
    'materials.header.notes': 'Ghi chú kỹ thuật',
    'materials.header.submaterials': 'Phụ liệu',

    // Materials fields placeholders
    'materials.placeholder.specifications': 'Thông số kỹ thuật',
    'materials.placeholder.name': 'Tên NPL',
    'materials.placeholder.composition': 'Thành phần vải',
    'materials.placeholder.supplier': 'Nhà cung cấp',
    'materials.placeholder.color': 'Màu',
    'materials.placeholder.consumption': 'Định mức tiêu hao',
    'materials.placeholder.position': 'Vị trí',
    'materials.placeholder.qty': 'SL',
    'materials.placeholder.unit': 'Đơn vị',
    'materials.placeholder.notes': 'Ghi chú kỹ thuật',
    'materials.addSubMaterial': 'Thêm phụ liệu',

    // Measurements
    'measurements.header.point': 'Điểm đo',
    'measurements.header.tolerance': 'Dung sai (ví dụ: ±0,5cm)',
    'measurements.placeholder.size': 'Giá trị',

    // Colorways
    'colorways.placeholder.name': 'Tên phối màu',
    'colorways.placeholder.part': 'Bộ phận',
    'colorways.placeholder.color': 'Màu',
    'colorways.placeholder.pantone': 'Pantone (tuỳ chọn)',

    // Construction
    'construction.placeholder.detail': 'Chi tiết kỹ thuật',

    // TechPackList
    'tpl.header.title': 'Quản lý Tech Pack',
    'tpl.header.subtitle': 'Quản lý bộ hồ sơ kỹ thuật thời trang',
    'tpl.new': 'Tạo Tech Pack',
    'tpl.search.placeholder': 'Tìm kiếm Tech Pack...',
    'tpl.filter.status.all': 'Tất cả trạng thái',
    'tpl.filter.status.draft': 'Nháp',
    'tpl.filter.status.review': 'Đang duyệt',
    'tpl.filter.status.approved': 'Đã duyệt',
    'tpl.filter.status.production': 'Sản xuất',
    'tpl.filter.category.all': 'Tất cả danh mục',
    'tpl.filter.more': 'Thêm bộ lọc',
    'tpl.card.view': 'Xem',
    'tpl.empty.title': 'Không tìm thấy Tech Pack nào',
    'tpl.empty.subtitle': 'Hãy thử điều chỉnh từ khóa hoặc bộ lọc',
    'tpl.empty.cta': 'Tạo Tech Pack đầu tiên',

    // Dashboard
    'dash.stat.total': 'Tổng số Tech Pack',
    'dash.stat.production': 'Đang sản xuất',
    'dash.stat.review': 'Đang duyệt',
    'dash.stat.approved': 'Đã duyệt',
    'dash.recent.techpacks': 'Tech Pack gần đây',
    'dash.recent.activity': 'Hoạt động gần đây',
    'dash.recent.activity.empty': 'Chưa có hoạt động nào.',
    'dash.alerts.title': 'Cảnh báo & Thông báo',
    'dash.alerts.pendingReview.suffix': 'đang chờ duyệt 5 ngày',
    'dash.alerts.seasonDeadline.prefix': 'Sắp đến hạn mùa:',
    'dash.alerts.seasonDeadline.suffix': 'còn 2 tuần',

    // Materials Library
    'matlib.title': 'Thư viện Nguyên Phụ Liệu',
    'matlib.hint': 'Thiết lập VITE_API_BASE_URL để bật thư viện dùng Mongo.',
    'matlib.form.name': 'Tên',
    'matlib.form.composition': 'Thành phần',
    'matlib.form.supplier': 'Nhà cung cấp',
    'matlib.form.color': 'Màu',
    'matlib.form.consumption': 'Định mức tiêu hao',
    'matlib.btn.add': 'Thêm',
    'matlib.btn.update': 'Cập nhật',
    'matlib.btn.edit': 'Sửa',
    'matlib.btn.delete': 'Xóa',
    'matlib.empty': 'Chưa có nguyên phụ liệu.',

    // Measurements Management
    'measmgmt.title': 'Quản lý Kích thước',
    'measmgmt.hint': 'Thiết lập VITE_API_BASE_URL để bật mẫu dùng Mongo.',
    'measmgmt.form.templateName': 'Tên mẫu',
    'measmgmt.form.point': 'Điểm đo',
    'measmgmt.form.tolerance': 'Dung sai',
    'measmgmt.btn.addPoint': 'Thêm điểm đo',
    'measmgmt.pointsCount': '{n} điểm đo',
    'measmgmt.btn.create': 'Tạo mẫu',
    'measmgmt.btn.update': 'Cập nhật mẫu',
    'common.edit': 'Sửa',
    'common.delete': 'Xóa',
    'measmgmt.empty': 'Chưa có mẫu.',

    // Colorways Management
    'colormgmt.title': 'Quản lý Phối màu',
    'colormgmt.hint': 'Thiết lập VITE_API_BASE_URL để bật phối màu dùng Mongo.',
    'colormgmt.form.name': 'Tên phối màu',
    'colormgmt.form.part': 'Bộ phận',
    'colormgmt.form.color': 'Màu',
    'colormgmt.form.pantone': 'Pantone (tuỳ chọn)',
    'colormgmt.btn.addColor': 'Thêm màu',
    'colormgmt.colorsCount': '{n} màu',
    'colormgmt.btn.create': 'Tạo phối màu',
    'colormgmt.btn.update': 'Cập nhật phối màu',
    'colormgmt.empty': 'Chưa có phối màu.',

    // Sample measurement rounds
    'sample.requestedSource': 'Nguồn Requested',
    'sample.originalSpec': 'Theo thông số gốc',
    'sample.fromPrevious': 'Theo vòng trước',
    'sample.round': 'Vòng mẫu',
    'sample.date': 'Ngày',
    'sample.reviewer': 'Người review',
    'sample.requested': 'Requested',
    'sample.measured': 'Measured',
    'sample.diff': 'Sai lệch',
    'sample.revised': 'Revised',
    'sample.comments': 'Ghi chú',
  }
};

interface I18nContextValue {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<LanguageCode>('en');

  useEffect(() => {
    const saved = localStorage.getItem('lang') as LanguageCode | null;
    if (saved === 'en' || saved === 'vi') {
      setLangState(saved);
    }
  }, []);

  const setLang = (next: LanguageCode) => {
    setLangState(next);
    try { localStorage.setItem('lang', next); } catch {}
  };

  const t = useMemo(() => {
    return (key: string) => translations[lang][key] ?? translations['en'][key] ?? key;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};


