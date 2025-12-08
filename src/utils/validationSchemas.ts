import { FormValidationConfig } from '../hooks/useFormValidation';
import { techPackValidators } from './validation';
import { MEASUREMENT_UNITS } from '../types/techpack';

const MEASUREMENT_UNIT_VALUES = MEASUREMENT_UNITS.map(unit => unit.value);

// Clean, single-definition validation schemas for TechPack UI

export const articleInfoValidationSchema: FormValidationConfig = {
  articleCode: {
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: /^[A-Z0-9-]+$/,
    custom: (value: string) => {
      if (!value) return null;
      if (!/^[A-Z0-9-]+$/.test(value)) {
        return 'Article code must contain only uppercase letters, numbers, and hyphens';
      }
      return null;
    }
  },
  articleName: {
    required: true,
    minLength: 2,
    maxLength: 255,
    custom: techPackValidators.productName
  },
  sampleType: {
    required: false,
    maxLength: 120,
    custom: (value: string) => {
      if (value && value.trim().length > 120) return 'Sample type must not exceed 120 characters';
      return null;
    }
  },
  technicalDesignerId: {
    required: true,
    minLength: 1,
    custom: (value: string) => {
      if (!value || value.trim().length === 0) return 'Please select a technical designer';
      return null;
    }
  },
  lifecycleStage: {
    required: true,
    custom: (value: string) => {
      const validStages = ['Concept', 'Design', 'Development', 'Pre-production', 'Production', 'Shipped'];
      if (!validStages.includes(value)) return 'Please select a valid lifecycle stage';
      return null;
    }
  },
  designSketchUrl: {
    required: (formData?: any) => {
      const lifecycleStage = formData?.lifecycleStage;
      return ['Concept', 'Design'].includes(lifecycleStage);
    },
    custom: (value: string, formData?: any) => {
      const lifecycleStage = formData?.lifecycleStage;
      if (['Concept', 'Design'].includes(lifecycleStage) && (!value || value.trim().length === 0)) {
        return 'Design sketch is required for Concept and Design stages';
      }
      return null;
    }
  },
  supplier: {
    required: true,
    minLength: 2,
    maxLength: 255,
    custom: (value: string) => {
      if (!value || value.trim().length < 2) return 'Supplier is required and must be at least 2 characters long';
      return null;
    }
  },
  season: {
    required: true,
    minLength: 2,
    maxLength: 50,
    custom: (value: string) => {
      if (!value || value.trim().length === 0) return 'Season is required';
      if (value.trim().length < 2) return 'Season must be at least 2 characters long';
      const normalized = value.trim();
      if (!/^[A-Za-z0-9\s\-_/]+$/.test(normalized)) {
        return 'Season can only contain letters, numbers, spaces, "-", "_" or "/"';
      }
      return null;
    }
  },
  notes: { maxLength: 500 }
};

export const bomItemValidationSchema: FormValidationConfig = {
  part: { required: true, custom: (v: string) => (!v || v.trim().length === 0 ? 'Vui lòng chọn Part.' : null) },
  materialName: { 
    required: true, 
    minLength: 2, 
    maxLength: 255,
    custom: (value: string) => {
      if (!value || value.trim().length < 2) return 'Tên vật liệu phải ít nhất 2 ký tự.';
      return null;
    }
  },
  supplierCode: {
    required: true,
    minLength: 2,
    maxLength: 50,
    custom: (value: string) => {
      if (!value || value.trim().length < 2) return 'Mã vật liệu phải ít nhất 2 ký tự.';
      if (!/^[A-Z0-9-]{2,50}$/.test(String(value).toUpperCase())) return "Mã vật liệu chỉ gồm chữ hoa, số và dấu '-'.";
      return null;
    }
  },
  supplier: { 
    required: true, 
    minLength: 2, 
    maxLength: 255,
    custom: (value: string) => {
      if (!value || value.trim().length < 2) return 'Vui lòng nhập tên nhà cung cấp.';
      return null;
    }
  },
  quantity: {
    required: true,
    min: 0.01,
    max: 100000,
    custom: (value: number) => {
      if (value === null || value === undefined || Number.isNaN(Number(value)) || Number(value) <= 0) return 'Số lượng phải lớn hơn 0.';
      if (Number(value) > 100000) return 'Số lượng quá lớn (tối đa 100,000).';
      return null;
    }
  },
  uom: {
    required: true,
    custom: (value: string) => {
      const validUnits = ['m', 'cm', 'mm', 'pcs', 'kg', 'g', 'yards', 'inches'];
      if (!value || !validUnits.includes(value)) return 'Vui lòng chọn đơn vị đo hợp lệ.';
      return null;
    }
  },
  placement: { maxLength: 255 },
  size: { maxLength: 100 },
  colorCode: {
    custom: (value: string) => {
      if (value && String(value).trim().length > 0) {
        if (/^#([A-Fa-f0-9]{6})$/.test(String(value))) return null;
        if (/^PANTONE\s+\d+-\d+\s+\w+$/i.test(String(value))) return null;
        if (String(value).trim().length >= 2) return null;
        return 'Mã màu không hợp lệ (ví dụ #FF0000 hoặc PANTONE 19-4052 TCX).';
      }
      return null;
    }
  },
  imageUrl: {
    custom: (value: string) => {
      if (!value) return null;
      const trimmed = String(value).trim();
      if (!trimmed) return null;
      const isHttp = /^https?:\/\//i.test(trimmed);
      const isDataUrl = /^data:image\//i.test(trimmed);
      const isRelative = trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../');
      if (isHttp || isDataUrl || isRelative) return null;
      return 'URL ảnh không hợp lệ. Dùng đường dẫn http(s) hoặc tương đối.';
    }
  },
  materialComposition: { 
    maxLength: 500,
    custom: (value: string) => {
      if (value && value.trim().length > 0 && value.trim().length < 3) {
        return 'Thành phần vật liệu phải ít nhất 3 ký tự.';
      }
      return null;
    }
  },
  comments: { 
    maxLength: 500,
    custom: (value: string) => {
      if (value && value.length > 500) return 'Ghi chú không vượt quá 500 ký tự.';
      return null;
    }
  }
};

export const measurementValidationSchema: FormValidationConfig = {
  pomCode: {
    required: true,
    minLength: 2,
    maxLength: 20,
    custom: (value: string) => {
      if (!value || value.trim().length < 2) {
        return 'POM Code must be at least 2 characters long';
      }
      if (!/^[A-Z0-9_-]+$/.test(value.toUpperCase())) {
        return 'POM Code must contain only uppercase letters, numbers, hyphens, and underscores';
      }
      return null;
    }
  },
  pomName: {
    required: true,
    minLength: 2,
    maxLength: 100,
    custom: (value: string) => {
      if (!value || value.trim().length < 2) {
        return 'POM Name must be at least 2 characters long';
      }
      return null;
    }
  },
  minusTolerance: {
    required: false,
    min: 0,
    max: 50,
    custom: (value: number) => {
      if (value !== undefined && value !== null) {
        if (value < 0) return 'Minus tolerance cannot be negative';
        if (value > 50) return 'Minus tolerance is too large (max 50 units)';
      }
      return null;
    }
  },
  plusTolerance: {
    required: false,
    min: 0,
    max: 50,
    custom: (value: number) => {
      if (value !== undefined && value !== null) {
        if (value < 0) return 'Plus tolerance cannot be negative';
        if (value > 50) return 'Plus tolerance is too large (max 50 units)';
      }
      return null;
    }
  },
  measurement: { required: true, min: 0, max: 1000, custom: techPackValidators.measurement },
  unit: {
    required: true,
    custom: (value: string) => {
      if (!value) return 'Please select a measurement unit';
      return MEASUREMENT_UNIT_VALUES.includes(value as typeof MEASUREMENT_UNIT_VALUES[number])
        ? null
        : 'Please select a valid measurement unit';
    }
  },
  category: { required: true },
  notes: { maxLength: 255 }
};

export const colorwayFormValidationSchema: FormValidationConfig = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    custom: (value: string) => {
      if (!value || value.trim().length < 2) {
        return 'Colorway name must be at least 2 characters long';
      }
      return null;
    }
  },
  code: {
    required: true,
    minLength: 1,
    maxLength: 50,
    custom: (value: string) => {
      if (!value || value.trim().length === 0) {
        return 'Colorway code is required';
      }
      return null;
    }
  },
};

export const colorwayPartValidationSchema: FormValidationConfig = {
  partName: {
    required: true,
    minLength: 2,
    maxLength: 100,
    custom: (value: string) => {
      if (!value || value.trim().length < 2) {
        return 'Part name must be at least 2 characters long';
      }
      return null;
    }
  },
  colorName: {
    required: true,
    minLength: 2,
    maxLength: 100,
    custom: (value: string) => {
      if (!value || value.trim().length < 2) {
        return 'Color name must be at least 2 characters long';
      }
      return null;
    }
  },
  pantoneCode: {
    custom: techPackValidators.pantoneCode
  },
  hexCode: {
    custom: (value: string) => {
      if (value && value.trim().length > 0) {
        if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
          return 'Please enter a valid hex color code (e.g., #FF0000)';
        }
      }
      return null;
    }
  },
  colorType: {
    required: true,
    custom: (value: string) => {
      if (!value) {
        return 'Color type is required';
      }
      const validTypes = ['Solid', 'Print', 'Embroidery', 'Applique'];
      if (!validTypes.includes(value)) {
        return 'Please select a valid color type';
      }
      return null;
    }
  }
};

export const howToMeasureValidationSchema: FormValidationConfig = {
  pomCode: {
    required: false,
    minLength: 2,
    maxLength: 20,
    custom: (value: string, formData?: any) => {
      // POM Code is optional - only validate if provided
      if (value && value.trim().length > 0) {
        if (value.trim().length < 2) {
          return 'POM Code phải có ít nhất 2 ký tự.';
        }
        // Check if pomCode exists in measurements (if available)
        const measurements = formData?.measurements || [];
        if (measurements.length > 0) {
          const exists = measurements.some((m: any) => m.pomCode === value);
          if (!exists) {
            return 'POM Code không tồn tại trong measurements.';
          }
        }
      }
      return null;
    }
  },
  description: {
    required: true,
    minLength: 10,
    maxLength: 2000,
    custom: (value: string, formData?: any) => {
      if (!value || value.trim().length < 10) {
        return 'Thêm mô tả chi tiết (ít nhất 10 ký tự).';
      }
      // Check if steps array has at least 1 item
      const steps = formData?.steps || [];
      if (steps.length === 0 && (!value || value.trim().length < 10)) {
        return 'Thêm mô tả chi tiết (ít nhất 1 bước hoặc mô tả 10 ký tự).';
      }
      return null;
    }
  },
  steps: {
    custom: (value: string[], formData?: any) => {
      // At least one step or description must be provided
      const description = formData?.description || '';
      if ((!value || value.length === 0) && (!description || description.trim().length < 10)) {
        return 'Thêm ít nhất 1 bước hoặc mô tả chi tiết.';
      }
      // Validate each step
      if (value && value.length > 0) {
        for (let i = 0; i < value.length; i++) {
          if (!value[i] || value[i].trim().length === 0) {
            return `Bước ${i + 1} không được để trống.`;
          }
        }
      }
      return null;
    }
  },
  imageUrl: {
    custom: (value: string) => {
      if (value && value.trim().length > 0) {
        // Validate URL format or data URL
        const isUrl = /^https?:\/\//.test(value);
        const isDataUrl = /^data:image\/(jpeg|jpg|png|gif|svg\+xml);base64,/.test(value);
        if (!isUrl && !isDataUrl) {
          return 'URL ảnh không hợp lệ.';
        }
      }
      return null;
    }
  },
  language: {
    required: true,
    custom: (value: string) => {
      const validLanguages = ['en-US', 'vi-VN', 'zh-CN', 'es-ES'];
      if (!value || !validLanguages.includes(value)) {
        return 'Vui lòng chọn ngôn ngữ hợp lệ.';
      }
      return null;
    }
  },
  videoUrl: {
    custom: (value: string) => {
      if (value && value.trim().length > 0) {
        const isUrl = /^https?:\/\//.test(value);
        if (!isUrl) {
          return 'URL video không hợp lệ.';
        }
      }
      return null;
    }
  }
};
