import { FormValidationConfig } from '../hooks/useFormValidation';
import { techPackValidators } from './validation';

// Article Info validation schema
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
  productName: {
    required: true,
    minLength: 2,
    maxLength: 255,
    custom: techPackValidators.productName
  },
  version: {
    required: true,
    min: 1,
    max: 999,
    custom: (value: number) => {
      if (!Number.isInteger(value)) {
        return 'Version must be a whole number';
      }
      return null;
    }
  },
  gender: {
    required: true,
    custom: (value: string) => {
      const validGenders = ['Men', 'Women', 'Unisex', 'Kids'];
      if (!validGenders.includes(value)) {
        return 'Please select a valid gender option';
      }
      return null;
    }
  },
  productClass: {
    required: true,
    minLength: 1,
    custom: (value: string) => {
      if (!value || value.trim().length === 0) {
        return 'Please select a product class';
      }
      return null;
    }
  },
  fitType: {
    required: true,
    custom: (value: string) => {
      const validFitTypes = ['Regular', 'Slim', 'Loose', 'Relaxed', 'Oversized'];
      if (!validFitTypes.includes(value)) {
        return 'Please select a valid fit type';
      }
      return null;
    }
  },
  technicalDesignerId: {
    required: true,
    minLength: 1,
    custom: (value: string) => {
      if (!value || value.trim().length === 0) {
        return 'Please select a technical designer';
      }
      return null;
    }
  },
  season: {
    required: true,
    minLength: 1,
    custom: (value: string) => {
      if (!value || value.trim().length === 0) {
        return 'Please select a season';
      }
      return null;
    }
  },
  lifecycleStage: {
    required: true,
    custom: (value: string) => {
      const validStages = ['Concept', 'Design', 'Development', 'Pre-production', 'Production', 'Shipped'];
      if (!validStages.includes(value)) {
        return 'Please select a valid lifecycle stage';
      }
      return null;
    }
  },
  fabricDescription: {
    required: true,
    minLength: 10,
    maxLength: 1000,
    custom: (value: string) => {
      if (!value || value.trim().length < 10) {
        return 'Fabric description must be at least 10 characters long';
      }
      return null;
    }
  },
  productDescription: {
    required: true,
    minLength: 10,
    maxLength: 1000,
    custom: (value: string) => {
      if (!value || value.trim().length < 10) {
        return 'Product description must be at least 10 characters long';
      }
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
      if (!value || value.trim().length < 2) {
        return 'Supplier is required and must be at least 2 characters long';
      }
      return null;
    }
  },
  brand: {
    maxLength: 255,
    custom: (value: string) => {
      if (value && value.trim().length > 0 && value.trim().length < 2) {
        return 'Brand name must be at least 2 characters long';
      }
      return null;
    }
  },
  collection: {
    maxLength: 255,
    custom: (value: string) => {
      if (value && value.trim().length > 0 && value.trim().length < 2) {
        return 'Collection name must be at least 2 characters long';
      }
      return null;
    }
  },
  targetMarket: {
    maxLength: 255,
    custom: (value: string) => {
      if (value && value.trim().length > 0 && value.trim().length < 2) {
        return 'Target market must be at least 2 characters long';
      }
      return null;
    }
  },
  pricePoint: {
    custom: (value: string) => {
      if (value && value.trim().length > 0) {
        const validPricePoints = ['Value', 'Mid-range', 'Premium', 'Luxury'];
        if (!validPricePoints.includes(value)) {
          return 'Please select a valid price point';
        }
      }
      return null;
    }
  },
  notes: {
    maxLength: 500
  }
};

// BOM validation schema
export const bomItemValidationSchema: FormValidationConfig = {
  materialCode: {
    required: true,
    minLength: 2,
    maxLength: 50,
    custom: techPackValidators.materialCode
  },
  materialName: {
    required: true,
    minLength: 2,
    maxLength: 255,
    custom: (value: string) => {
      if (!value || value.trim().length < 2) {
        return 'Material name must be at least 2 characters long';
      }
      return null;
    }
  },
  supplier: {
    required: true,
    minLength: 2,
    maxLength: 255,
    custom: (value: string) => {
      if (!value || value.trim().length < 2) {
        return 'Supplier name must be at least 2 characters long';
      }
      return null;
    }
  },
  quantity: {
    required: true,
    min: 0.01,
    max: 10000,
    custom: techPackValidators.quantity
  },
  unit: {
    required: true,
    custom: (value: string) => {
      const validUnits = ['m', 'cm', 'mm', 'kg', 'g', 'pcs', 'yds', 'ft', 'in'];
      if (!validUnits.includes(value)) {
        return 'Please select a valid unit';
      }
      return null;
    }
  },
  color: {
    maxLength: 100,
    custom: (value: string) => {
      if (value && value.trim().length > 0 && value.trim().length < 2) {
        return 'Color name must be at least 2 characters long';
      }
      return null;
    }
  },
  colorCode: {
    custom: techPackValidators.colorCode
  },
  pantoneCode: {
    custom: techPackValidators.pantoneCode
  },
  notes: {
    maxLength: 500
  }
};

// Measurement validation schema
export const measurementValidationSchema: FormValidationConfig = {
  pointName: {
    required: true,
    minLength: 2,
    maxLength: 100,
    custom: (value: string) => {
      if (!value || value.trim().length < 2) {
        return 'Measurement point name must be at least 2 characters long';
      }
      return null;
    }
  },
  measurement: {
    required: true,
    min: 0,
    max: 1000,
    custom: techPackValidators.measurement
  },
  tolerance: {
    min: 0,
    max: 50,
    custom: techPackValidators.tolerance
  },
  unit: {
    required: true,
    custom: (value: string) => {
      const validUnits = ['cm', 'mm', 'in'];
      if (!validUnits.includes(value)) {
        return 'Please select a valid measurement unit';
      }
      return null;
    }
  },
  category: {
    required: true,
    custom: (value: string) => {
      const validCategories = ['Length', 'Width', 'Circumference', 'Diameter', 'Height', 'Depth'];
      if (!validCategories.includes(value)) {
        return 'Please select a valid measurement category';
      }
      return null;
    }
  },
  notes: {
    maxLength: 255
  }
};

// Colorway validation schema
export const colorwayValidationSchema: FormValidationConfig = {
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
  colorCode: {
    custom: techPackValidators.colorCode
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
  description: {
    maxLength: 255,
    custom: (value: string) => {
      if (value && value.trim().length > 0 && value.trim().length < 5) {
        return 'Color description must be at least 5 characters long';
      }
      return null;
    }
  },
  season: {
    custom: (value: string) => {
      if (value && value.trim().length > 0) {
        const validSeasons = ['Spring', 'Summer', 'Autumn', 'Winter', 'SS25', 'FW25', 'SS26', 'FW26'];
        if (!validSeasons.includes(value)) {
          return 'Please select a valid season';
        }
      }
      return null;
    }
  }
};
