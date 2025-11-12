/**
 * Script tạo 5 TechPack hoàn chỉnh với dữ liệu sản phẩm thực tế
 * 
 * Sử dụng:
 *   cd server
 *   node create-5-techpacks.js
 * 
 * Hoặc với thông tin đăng nhập tùy chỉnh:
 *   TEST_EMAIL=your@email.com TEST_PASSWORD=yourpassword node create-5-techpacks.js
 */

const axios = require('axios');

// Cấu hình
// Auto-detect API URL: use 127.0.0.1 instead of localhost to avoid IPv6 issues
const getApiUrl = () => {
  if (process.env.API_URL) return process.env.API_URL;
  // Use 127.0.0.1 instead of localhost to force IPv4
  return 'http://127.0.0.1:4001/api/v1';
};

const BASE_URL = getApiUrl();
const TEST_USER = {
  email: process.env.TEST_EMAIL || 'admin@techpacker.com',
  password: process.env.TEST_PASSWORD || 'Admin123!'
};

let authToken = '';
let technicalDesignerId = '';

// Template function để tạo techpack data
function createTechPackData(template) {
  const timestamp = Date.now().toString().slice(-6);
  return {
    articleInfo: {
      ...template.articleInfo,
      articleCode: `${template.articleInfo.articleCode}-${timestamp}`,
      technicalDesignerId: technicalDesignerId
    },
    bom: template.bom,
    measurements: template.measurements,
    colorways: template.colorways,
    howToMeasures: template.howToMeasures,
    status: template.status || 'draft'
  };
}

// 1. Classic Cotton Polo Shirt
const poloShirtTemplate = {
  articleInfo: {
    productName: 'Classic Cotton Polo Shirt',
    articleCode: 'POLO',
    version: 1,
    supplier: 'Vietnam Textile Manufacturing Co., Ltd.',
    season: 'SS25',
    fabricDescription: '100% Premium Cotton, 180 GSM, Single Jersey Knit, Pre-shrunk, Soft Touch Finish',
    productDescription: 'Classic fit polo shirt with ribbed collar and cuffs. Three-button placket with reinforced stitching. Side vents for comfort. Perfect for casual and business casual wear.',
    designSketchUrl: '',
    productClass: 'Polo Shirts',
    gender: 'Men',
    technicalDesignerId: '',
    lifecycleStage: 'Development',
    brand: 'Fashion Forward',
    collection: 'Spring Essentials 2025',
    targetMarket: 'Global - North America, Europe, Asia Pacific',
    pricePoint: 'Mid-range',
    retailPrice: 45.99,
    currency: 'USD',
    notes: 'Production ready. All materials approved. Target delivery: Q2 2025. Minimum order quantity: 500 units per colorway.'
  },
  bom: [
    {
      part: 'Main Fabric',
      materialName: 'Premium Cotton Single Jersey',
      placement: 'Front Body, Back Body, Sleeves',
      size: 'All Sizes',
      quantity: 1.2,
      uom: 'm',
      supplier: 'Vietnam Textile Manufacturing Co., Ltd.',
      supplierCode: 'VTM-COT-180-SJ',
      colorCode: 'As per colorway',
      materialComposition: '100% Cotton',
      weight: '180 GSM',
      width: '150 cm',
      shrinkage: 'Max 3%',
      careInstructions: 'Machine wash cold, tumble dry low, do not bleach',
      comments: 'Pre-approved fabric. Color matching required for each colorway.'
    },
    {
      part: 'Ribbed Collar',
      materialName: 'Cotton Rib Knit',
      placement: 'Collar',
      size: 'All Sizes',
      quantity: 0.15,
      uom: 'm',
      supplier: 'Vietnam Textile Manufacturing Co., Ltd.',
      supplierCode: 'VTM-COT-RIB-200',
      materialComposition: '100% Cotton',
      weight: '200 GSM',
      width: '10 cm',
      comments: 'Must match main fabric color. Pre-shrunk required.'
    },
    {
      part: 'Button',
      materialName: 'Plastic 4-Hole Button',
      placement: 'Placket',
      size: '18mm',
      quantity: 3,
      uom: 'pcs',
      supplier: 'Button World Manufacturing',
      supplierCode: 'BWM-PLA-18-4H',
      colorCode: 'As per colorway',
      comments: 'Color to match fabric. Must pass pull test (min 50N).'
    },
    {
      part: 'Thread',
      materialName: 'Polyester Core-Spun Thread',
      placement: 'All Seams',
      size: '40/2',
      quantity: 150,
      uom: 'm',
      supplier: 'Global Thread Solutions',
      supplierCode: 'GTS-PES-40-2-WH',
      colorCode: 'White #FFFFFF',
      comments: 'Color to match fabric. High strength for durability.'
    }
  ],
  measurements: [
    {
      pomCode: 'CHEST',
      pomName: 'Chest Width',
      toleranceMinus: 1.5,
      tolerancePlus: 1.5,
      sizes: { S: 98, M: 104, L: 110, XL: 116, XXL: 122 },
      notes: 'Measure 2.5cm below armhole, across chest. Garment laid flat.',
      isActive: true
    },
    {
      pomCode: 'LENGTH',
      pomName: 'Body Length',
      toleranceMinus: 1.0,
      tolerancePlus: 1.5,
      sizes: { S: 70, M: 72, L: 74, XL: 76, XXL: 78 },
      notes: 'Measure from highest point of shoulder to bottom hem.',
      isActive: true
    },
    {
      pomCode: 'SLEEVE',
      pomName: 'Sleeve Length',
      toleranceMinus: 1.0,
      tolerancePlus: 1.0,
      sizes: { S: 22, M: 23, L: 24, XL: 25, XXL: 26 },
      notes: 'Measure from shoulder seam to cuff edge.',
      isActive: true
    }
  ],
  colorways: [
    {
      name: 'Navy Blue',
      code: 'NAVY-001',
      placement: 'All Over',
      materialType: 'Fabric',
      season: 'SS25',
      isDefault: true,
      approvalStatus: 'Approved',
      productionStatus: 'Bulk Fabric',
      pantoneCode: 'PANTONE 19-3832 TCX',
      hexColor: '#1B365D',
      rgbColor: { r: 27, g: 54, b: 93 },
      supplier: 'Vietnam Textile Manufacturing Co., Ltd.',
      notes: 'Approved color. Bulk fabric ordered.',
      collectionName: 'Spring Essentials 2025',
      parts: [
        {
          partName: 'Main Body',
          colorName: 'Navy Blue',
          pantoneCode: 'PANTONE 19-3832 TCX',
          hexCode: '#1B365D',
          colorType: 'Solid'
        }
      ]
    },
    {
      name: 'Classic White',
      code: 'WHITE-001',
      placement: 'All Over',
      materialType: 'Fabric',
      season: 'SS25',
      isDefault: false,
      approvalStatus: 'Approved',
      productionStatus: 'Bulk Fabric',
      pantoneCode: 'PANTONE 11-0601 TCX',
      hexColor: '#FFFFFF',
      rgbColor: { r: 255, g: 255, b: 255 },
      supplier: 'Vietnam Textile Manufacturing Co., Ltd.',
      notes: 'Approved color. Bulk fabric ready.',
      collectionName: 'Spring Essentials 2025',
      parts: [
        {
          partName: 'Main Body',
          colorName: 'Classic White',
          pantoneCode: 'PANTONE 11-0601 TCX',
          hexCode: '#FFFFFF',
          colorType: 'Solid'
        }
      ]
    }
  ],
  howToMeasures: [
    {
      pomCode: 'CHEST',
      pomName: 'Chest Width',
      description: 'Measure the chest width of the garment',
      stepNumber: 1,
      instructions: [
        'Lay the garment flat on a smooth surface',
        'Smooth out any wrinkles or folds',
        'Locate the point 2.5cm below the armhole on both sides',
        'Place the measuring tape horizontally across the chest at this point',
        'Measure from side seam to side seam',
        'Record the measurement in centimeters'
      ],
      tips: [
        'Ensure the garment is completely flat before measuring',
        'Do not stretch the fabric while measuring'
      ],
      commonMistakes: [
        'Measuring too high or too low on the chest',
        'Not laying the garment completely flat'
      ],
      relatedMeasurements: ['WAIST', 'SHOULDER']
    }
  ],
  status: 'draft'
};

// 2. Slim Fit Denim Jeans
const denimJeansTemplate = {
  articleInfo: {
    productName: 'Slim Fit Denim Jeans',
    articleCode: 'JEANS',
    version: 1,
    supplier: 'Denim Works Vietnam',
    season: 'AW25',
    fabricDescription: '98% Cotton, 2% Elastane, 12oz Denim, Stretch, Pre-washed, Stone Washed Finish',
    productDescription: 'Slim fit denim jeans with 5-pocket styling. Mid-rise waist. Tapered leg. Pre-washed for comfort. Perfect for casual everyday wear.',
    designSketchUrl: '',
    productClass: 'Jeans',
    gender: 'Men',
    technicalDesignerId: '',
    lifecycleStage: 'Pre-production',
    brand: 'Urban Denim',
    collection: 'Autumn Winter 2025',
    targetMarket: 'Global - North America, Europe',
    pricePoint: 'Mid-range',
    retailPrice: 79.99,
    currency: 'USD',
    notes: 'Pre-production sample approved. Bulk production scheduled for Q3 2025. Minimum order: 1000 units per colorway.'
  },
  bom: [
    {
      part: 'Main Denim Fabric',
      materialName: 'Stretch Denim 12oz',
      placement: 'Front Legs, Back Legs, Waistband',
      size: 'All Sizes',
      quantity: 1.8,
      uom: 'm',
      supplier: 'Denim Works Vietnam',
      supplierCode: 'DWV-DEN-12-ST',
      colorCode: 'As per colorway',
      materialComposition: '98% Cotton, 2% Elastane',
      weight: '12oz',
      width: '150 cm',
      shrinkage: 'Max 5%',
      careInstructions: 'Machine wash cold, hang dry, do not bleach',
      comments: 'Pre-washed denim. Color consistency critical.'
    },
    {
      part: 'Zipper',
      materialName: 'YKK Metal Zipper',
      placement: 'Fly',
      size: '7 inch',
      quantity: 1,
      uom: 'pcs',
      supplier: 'YKK Vietnam',
      supplierCode: 'YKK-MET-7-BR',
      colorCode: 'Brass',
      comments: 'Heavy duty zipper. Must pass durability test.'
    },
    {
      part: 'Rivets',
      materialName: 'Copper Rivets',
      placement: 'Pockets',
      size: 'Standard',
      quantity: 6,
      uom: 'pcs',
      supplier: 'Hardware Solutions Co.',
      supplierCode: 'HSC-CU-RIV-STD',
      comments: 'Copper finish. Must match design specification.'
    },
    {
      part: 'Thread',
      materialName: 'Polyester Thread',
      placement: 'All Seams',
      size: '40/3',
      quantity: 200,
      uom: 'm',
      supplier: 'Global Thread Solutions',
      supplierCode: 'GTS-PES-40-3-BL',
      colorCode: 'Blue #003366',
      comments: 'Color to match denim. High strength required.'
    }
  ],
  measurements: [
    {
      pomCode: 'WAIST',
      pomName: 'Waist Circumference',
      toleranceMinus: 2.0,
      tolerancePlus: 2.0,
      sizes: { S: 76, M: 80, L: 84, XL: 88, XXL: 92 },
      notes: 'Measure around waistband when laid flat, multiply by 2.',
      isActive: true
    },
    {
      pomCode: 'INSEAM',
      pomName: 'Inseam Length',
      toleranceMinus: 1.5,
      tolerancePlus: 1.5,
      sizes: { S: 76, M: 78, L: 80, XL: 82, XXL: 84 },
      notes: 'Measure from crotch seam to hem along inside leg.',
      isActive: true
    },
    {
      pomCode: 'OUTSEAM',
      pomName: 'Outseam Length',
      toleranceMinus: 1.5,
      tolerancePlus: 1.5,
      sizes: { S: 102, M: 104, L: 106, XL: 108, XXL: 110 },
      notes: 'Measure from waistband to hem along outside leg.',
      isActive: true
    },
    {
      pomCode: 'THIGH',
      pomName: 'Thigh Width',
      toleranceMinus: 1.5,
      tolerancePlus: 1.5,
      sizes: { S: 56, M: 58, L: 60, XL: 62, XXL: 64 },
      notes: 'Measure across thigh at widest point, garment laid flat.',
      isActive: true
    }
  ],
  colorways: [
    {
      name: 'Classic Blue',
      code: 'BLUE-001',
      placement: 'All Over',
      materialType: 'Fabric',
      season: 'AW25',
      isDefault: true,
      approvalStatus: 'Approved',
      productionStatus: 'Bulk Fabric',
      pantoneCode: 'PANTONE 19-4034 TCX',
      hexColor: '#2C3E50',
      rgbColor: { r: 44, g: 62, b: 80 },
      supplier: 'Denim Works Vietnam',
      notes: 'Classic indigo blue. Pre-washed finish.',
      collectionName: 'Autumn Winter 2025',
      parts: [
        {
          partName: 'Main Body',
          colorName: 'Classic Blue',
          pantoneCode: 'PANTONE 19-4034 TCX',
          hexCode: '#2C3E50',
          colorType: 'Solid'
        }
      ]
    },
    {
      name: 'Black',
      code: 'BLACK-001',
      placement: 'All Over',
      materialType: 'Fabric',
      season: 'AW25',
      isDefault: false,
      approvalStatus: 'Approved',
      productionStatus: 'Bulk Fabric',
      pantoneCode: 'PANTONE 19-0303 TCX',
      hexColor: '#000000',
      rgbColor: { r: 0, g: 0, b: 0 },
      supplier: 'Denim Works Vietnam',
      notes: 'Deep black denim. Pre-washed.',
      collectionName: 'Autumn Winter 2025',
      parts: [
        {
          partName: 'Main Body',
          colorName: 'Black',
          pantoneCode: 'PANTONE 19-0303 TCX',
          hexCode: '#000000',
          colorType: 'Solid'
        }
      ]
    }
  ],
  howToMeasures: [
    {
      pomCode: 'WAIST',
      pomName: 'Waist Circumference',
      description: 'Measure the waist circumference of the jeans',
      stepNumber: 1,
      instructions: [
        'Lay the jeans flat on a smooth surface',
        'Locate the waistband',
        'Measure across the waistband from side to side',
        'Multiply the measurement by 2 to get the full circumference',
        'Record the measurement in centimeters'
      ],
      tips: [
        'Ensure the waistband is fully extended',
        'Measure at the top edge of the waistband'
      ],
      commonMistakes: [
        'Measuring at an angle',
        'Not multiplying by 2 for circumference'
      ],
      relatedMeasurements: ['THIGH', 'OUTSEAM']
    }
  ],
  status: 'draft'
};

// 3. Premium Cotton T-Shirt
const tShirtTemplate = {
  articleInfo: {
    productName: 'Premium Cotton T-Shirt',
    articleCode: 'TSHIRT',
    version: 1,
    supplier: 'Textile Excellence Co.',
    season: 'SS25',
    fabricDescription: '100% Organic Cotton, 160 GSM, Single Jersey, Ring Spun, Pre-shrunk, Soft Touch',
    productDescription: 'Classic crew neck t-shirt with short sleeves. Relaxed fit. Side seams. Double-needle hem. Perfect for everyday casual wear.',
    designSketchUrl: '',
    productClass: 'T-Shirts',
    gender: 'Unisex',
    technicalDesignerId: '',
    lifecycleStage: 'Development',
    brand: 'Eco Fashion',
    collection: 'Sustainable Spring 2025',
    targetMarket: 'Global - Eco-conscious markets',
    pricePoint: 'Mid-range',
    retailPrice: 29.99,
    currency: 'USD',
    notes: 'Made from 100% organic cotton. Sustainable production. GOTS certified. Minimum order: 500 units per colorway.'
  },
  bom: [
    {
      part: 'Main Fabric',
      materialName: 'Organic Cotton Single Jersey',
      placement: 'Front Body, Back Body, Sleeves',
      size: 'All Sizes',
      quantity: 1.0,
      uom: 'm',
      supplier: 'Textile Excellence Co.',
      supplierCode: 'TEC-ORG-COT-160',
      colorCode: 'As per colorway',
      materialComposition: '100% Organic Cotton',
      weight: '160 GSM',
      width: '150 cm',
      shrinkage: 'Max 3%',
      careInstructions: 'Machine wash cold, tumble dry low, do not bleach',
      comments: 'GOTS certified organic cotton. Pre-shrunk.'
    },
    {
      part: 'Neck Rib',
      materialName: 'Cotton Rib Knit',
      placement: 'Neckline',
      size: 'All Sizes',
      quantity: 0.12,
      uom: 'm',
      supplier: 'Textile Excellence Co.',
      supplierCode: 'TEC-COT-RIB-180',
      materialComposition: '100% Organic Cotton',
      weight: '180 GSM',
      width: '5 cm',
      comments: 'Must match main fabric color.'
    },
    {
      part: 'Thread',
      materialName: 'Cotton Thread',
      placement: 'All Seams',
      size: '40/2',
      quantity: 120,
      uom: 'm',
      supplier: 'Eco Thread Solutions',
      supplierCode: 'ETS-COT-40-2',
      colorCode: 'As per colorway',
      comments: '100% cotton thread. Color to match fabric.'
    }
  ],
  measurements: [
    {
      pomCode: 'CHEST',
      pomName: 'Chest Width',
      toleranceMinus: 1.5,
      tolerancePlus: 1.5,
      sizes: { XS: 92, S: 96, M: 100, L: 104, XL: 108, XXL: 112 },
      notes: 'Measure 2cm below armhole, across chest. Garment laid flat.',
      isActive: true
    },
    {
      pomCode: 'LENGTH',
      pomName: 'Body Length',
      toleranceMinus: 1.0,
      tolerancePlus: 1.5,
      sizes: { XS: 66, S: 68, M: 70, L: 72, XL: 74, XXL: 76 },
      notes: 'Measure from highest point of shoulder to bottom hem.',
      isActive: true
    },
    {
      pomCode: 'SLEEVE',
      pomName: 'Sleeve Length',
      toleranceMinus: 1.0,
      tolerancePlus: 1.0,
      sizes: { XS: 18, S: 19, M: 20, L: 21, XL: 22, XXL: 23 },
      notes: 'Measure from shoulder seam to sleeve hem.',
      isActive: true
    },
    {
      pomCode: 'SHOULDER',
      pomName: 'Shoulder Width',
      toleranceMinus: 1.0,
      tolerancePlus: 1.0,
      sizes: { XS: 40, S: 42, M: 44, L: 46, XL: 48, XXL: 50 },
      notes: 'Measure from shoulder seam to shoulder seam.',
      isActive: true
    }
  ],
  colorways: [
    {
      name: 'Natural White',
      code: 'NAT-WHT-001',
      placement: 'All Over',
      materialType: 'Fabric',
      season: 'SS25',
      isDefault: true,
      approvalStatus: 'Approved',
      productionStatus: 'Bulk Fabric',
      pantoneCode: 'PANTONE 11-0601 TCX',
      hexColor: '#F5F5DC',
      rgbColor: { r: 245, g: 245, b: 220 },
      supplier: 'Textile Excellence Co.',
      notes: 'Natural unbleached white. GOTS certified.',
      collectionName: 'Sustainable Spring 2025',
      parts: [
        {
          partName: 'Main Body',
          colorName: 'Natural White',
          pantoneCode: 'PANTONE 11-0601 TCX',
          hexCode: '#F5F5DC',
          colorType: 'Solid'
        }
      ]
    },
    {
      name: 'Forest Green',
      code: 'GRN-001',
      placement: 'All Over',
      materialType: 'Fabric',
      season: 'SS25',
      isDefault: false,
      approvalStatus: 'Approved',
      productionStatus: 'Bulk Fabric',
      pantoneCode: 'PANTONE 18-5335 TCX',
      hexColor: '#2D5016',
      rgbColor: { r: 45, g: 80, b: 22 },
      supplier: 'Textile Excellence Co.',
      notes: 'Deep forest green. Eco-friendly dye.',
      collectionName: 'Sustainable Spring 2025',
      parts: [
        {
          partName: 'Main Body',
          colorName: 'Forest Green',
          pantoneCode: 'PANTONE 18-5335 TCX',
          hexCode: '#2D5016',
          colorType: 'Solid'
        }
      ]
    },
    {
      name: 'Ocean Blue',
      code: 'BLUE-002',
      placement: 'All Over',
      materialType: 'Fabric',
      season: 'SS25',
      isDefault: false,
      approvalStatus: 'Pending',
      productionStatus: 'Lab Dip',
      pantoneCode: 'PANTONE 17-4730 TCX',
      hexColor: '#006994',
      rgbColor: { r: 0, g: 105, b: 148 },
      supplier: 'Textile Excellence Co.',
      notes: 'Lab dip submitted. Awaiting approval.',
      collectionName: 'Sustainable Spring 2025',
      parts: [
        {
          partName: 'Main Body',
          colorName: 'Ocean Blue',
          pantoneCode: 'PANTONE 17-4730 TCX',
          hexCode: '#006994',
          colorType: 'Solid'
        }
      ]
    }
  ],
  howToMeasures: [
    {
      pomCode: 'CHEST',
      pomName: 'Chest Width',
      description: 'Measure the chest width of the t-shirt',
      stepNumber: 1,
      instructions: [
        'Lay the t-shirt flat on a smooth surface',
        'Smooth out any wrinkles',
        'Locate the point 2cm below the armhole',
        'Place measuring tape horizontally across the chest',
        'Measure from side seam to side seam',
        'Record the measurement in centimeters'
      ],
      tips: [
        'Keep the garment completely flat',
        'Do not stretch the fabric'
      ],
      commonMistakes: [
        'Measuring at wrong point',
        'Stretching fabric while measuring'
      ],
      relatedMeasurements: ['SHOULDER', 'LENGTH']
    }
  ],
  status: 'draft'
};

// 4. Winter Puffer Jacket
const winterJacketTemplate = {
  articleInfo: {
    productName: 'Winter Puffer Jacket',
    articleCode: 'JACKET',
    version: 1,
    supplier: 'Outdoor Gear Manufacturing',
    season: 'AW25',
    fabricDescription: '100% Nylon Ripstop Outer Shell, 100% Polyester Insulation, Waterproof Coating, DWR Finish',
    productDescription: 'Warm winter puffer jacket with quilted construction. Full zip closure. Stand-up collar with hood. Zippered pockets. Perfect for cold weather activities.',
    designSketchUrl: '',
    productClass: 'Jackets',
    gender: 'Unisex',
    technicalDesignerId: '',
    lifecycleStage: 'Pre-production',
    brand: 'Outdoor Pro',
    collection: 'Winter Collection 2025',
    targetMarket: 'Global - Cold climate regions',
    pricePoint: 'Premium',
    retailPrice: 149.99,
    currency: 'USD',
    notes: 'Pre-production sample approved. Insulation tested for -10°C. Waterproof rating: 5000mm. Minimum order: 300 units per colorway.'
  },
  bom: [
    {
      part: 'Outer Shell',
      materialName: 'Nylon Ripstop Waterproof',
      placement: 'Front, Back, Sleeves, Hood',
      size: 'All Sizes',
      quantity: 2.5,
      uom: 'm',
      supplier: 'Outdoor Gear Manufacturing',
      supplierCode: 'OGM-NYL-RIP-5000',
      colorCode: 'As per colorway',
      materialComposition: '100% Nylon',
      weight: '120 GSM',
      width: '150 cm',
      waterproofRating: '5000mm',
      breathability: '3000g/m²/24h',
      comments: 'Waterproof and breathable. DWR finish applied.'
    },
    {
      part: 'Insulation',
      materialName: 'Polyester Fill',
      placement: 'Front, Back, Sleeves',
      size: 'All Sizes',
      quantity: 150,
      uom: 'g',
      supplier: 'Insulation Solutions Inc.',
      supplierCode: 'ISI-PES-FILL-150',
      comments: '150g fill weight. Temperature rating: -10°C.'
    },
    {
      part: 'Lining',
      materialName: 'Polyester Taffeta',
      placement: 'Front, Back, Sleeves',
      size: 'All Sizes',
      quantity: 2.0,
      uom: 'm',
      supplier: 'Outdoor Gear Manufacturing',
      supplierCode: 'OGM-PES-TAF-001',
      comments: 'Smooth lining for comfort.'
    },
    {
      part: 'Zipper',
      materialName: 'YKK Waterproof Zipper',
      placement: 'Front',
      size: '8 inch',
      quantity: 1,
      uom: 'pcs',
      supplier: 'YKK Vietnam',
      supplierCode: 'YKK-WP-8-BL',
      colorCode: 'Black',
      comments: 'Waterproof zipper. Heavy duty.'
    },
    {
      part: 'Thread',
      materialName: 'Polyester Thread',
      placement: 'All Seams',
      size: '40/3',
      quantity: 300,
      uom: 'm',
      supplier: 'Global Thread Solutions',
      supplierCode: 'GTS-PES-40-3',
      colorCode: 'As per colorway',
      comments: 'High strength thread for outdoor use.'
    }
  ],
  measurements: [
    {
      pomCode: 'CHEST',
      pomName: 'Chest Width',
      toleranceMinus: 2.0,
      tolerancePlus: 2.0,
      sizes: { S: 108, M: 112, L: 116, XL: 120, XXL: 124 },
      notes: 'Measure across chest at fullest point. Garment laid flat.',
      isActive: true
    },
    {
      pomCode: 'LENGTH',
      pomName: 'Body Length',
      toleranceMinus: 1.5,
      tolerancePlus: 1.5,
      sizes: { S: 68, M: 70, L: 72, XL: 74, XXL: 76 },
      notes: 'Measure from shoulder seam to bottom hem.',
      isActive: true
    },
    {
      pomCode: 'SLEEVE',
      pomName: 'Sleeve Length',
      toleranceMinus: 1.5,
      tolerancePlus: 1.5,
      sizes: { S: 62, M: 64, L: 66, XL: 68, XXL: 70 },
      notes: 'Measure from shoulder seam to cuff edge.',
      isActive: true
    },
    {
      pomCode: 'HOOD',
      pomName: 'Hood Height',
      toleranceMinus: 1.0,
      tolerancePlus: 1.0,
      sizes: { S: 32, M: 33, L: 34, XL: 35, XXL: 36 },
      notes: 'Measure from collar base to top of hood.',
      isActive: true
    }
  ],
  colorways: [
    {
      name: 'Black',
      code: 'BLK-001',
      placement: 'All Over',
      materialType: 'Fabric',
      season: 'AW25',
      isDefault: true,
      approvalStatus: 'Approved',
      productionStatus: 'Bulk Fabric',
      pantoneCode: 'PANTONE 19-0303 TCX',
      hexColor: '#000000',
      rgbColor: { r: 0, g: 0, b: 0 },
      supplier: 'Outdoor Gear Manufacturing',
      notes: 'Classic black. High demand color.',
      collectionName: 'Winter Collection 2025',
      parts: [
        {
          partName: 'Outer Shell',
          colorName: 'Black',
          pantoneCode: 'PANTONE 19-0303 TCX',
          hexCode: '#000000',
          colorType: 'Solid'
        }
      ]
    },
    {
      name: 'Navy Blue',
      code: 'NAVY-002',
      placement: 'All Over',
      materialType: 'Fabric',
      season: 'AW25',
      isDefault: false,
      approvalStatus: 'Approved',
      productionStatus: 'Bulk Fabric',
      pantoneCode: 'PANTONE 19-3832 TCX',
      hexColor: '#1B365D',
      rgbColor: { r: 27, g: 54, b: 93 },
      supplier: 'Outdoor Gear Manufacturing',
      notes: 'Navy blue. Popular color for winter.',
      collectionName: 'Winter Collection 2025',
      parts: [
        {
          partName: 'Outer Shell',
          colorName: 'Navy Blue',
          pantoneCode: 'PANTONE 19-3832 TCX',
          hexCode: '#1B365D',
          colorType: 'Solid'
        }
      ]
    }
  ],
  howToMeasures: [
    {
      pomCode: 'CHEST',
      pomName: 'Chest Width',
      description: 'Measure the chest width of the jacket',
      stepNumber: 1,
      instructions: [
        'Lay the jacket flat on a smooth surface',
        'Zip up the front zipper',
        'Smooth out any wrinkles',
        'Locate the fullest point of the chest',
        'Place measuring tape horizontally across the chest',
        'Measure from side seam to side seam',
        'Record the measurement in centimeters'
      ],
      tips: [
        'Ensure jacket is fully zipped',
        'Measure at the widest point of chest'
      ],
      commonMistakes: [
        'Measuring with jacket unzipped',
        'Not measuring at fullest point'
      ],
      relatedMeasurements: ['LENGTH', 'SLEEVE']
    }
  ],
  status: 'draft'
};

// 5. Floral Summer Dress
const summerDressTemplate = {
  articleInfo: {
    productName: 'Floral Summer Dress',
    articleCode: 'DRESS',
    version: 1,
    supplier: 'Fashion Textiles Ltd.',
    season: 'SS25',
    fabricDescription: '100% Viscose, 120 GSM, Lightweight, Flowing, Breathable, Floral Print',
    productDescription: 'Beautiful floral print summer dress with A-line silhouette. V-neckline. Short sleeves. Elasticated waist. Perfect for warm weather occasions.',
    designSketchUrl: '',
    productClass: 'Dresses',
    gender: 'Women',
    technicalDesignerId: '',
    lifecycleStage: 'Development',
    brand: 'Garden Collection',
    collection: 'Summer Blooms 2025',
    targetMarket: 'Global - Warm climate regions',
    pricePoint: 'Mid-range',
    retailPrice: 59.99,
    currency: 'USD',
    notes: 'Development stage. Floral print design approved. Fabric testing in progress. Minimum order: 400 units per colorway.'
  },
  bom: [
    {
      part: 'Main Fabric',
      materialName: 'Viscose Floral Print',
      placement: 'Front, Back, Sleeves',
      size: 'All Sizes',
      quantity: 2.2,
      uom: 'm',
      supplier: 'Fashion Textiles Ltd.',
      supplierCode: 'FTL-VIS-FLOR-120',
      colorCode: 'As per colorway',
      materialComposition: '100% Viscose',
      weight: '120 GSM',
      width: '140 cm',
      shrinkage: 'Max 5%',
      careInstructions: 'Hand wash cold or gentle cycle, hang dry, do not bleach',
      comments: 'Lightweight and flowing. Print must match design exactly.'
    },
    {
      part: 'Elastic',
      materialName: 'Cotton Elastic',
      placement: 'Waist',
      size: '2cm width',
      quantity: 0.5,
      uom: 'm',
      supplier: 'Elastic Solutions Co.',
      supplierCode: 'ESC-COT-EL-2CM',
      comments: 'Soft elastic for comfortable waistband.'
    },
    {
      part: 'Thread',
      materialName: 'Polyester Thread',
      placement: 'All Seams',
      size: '40/2',
      quantity: 180,
      uom: 'm',
      supplier: 'Global Thread Solutions',
      supplierCode: 'GTS-PES-40-2',
      colorCode: 'As per colorway',
      comments: 'Color to match fabric print.'
    },
    {
      part: 'Bias Tape',
      materialName: 'Cotton Bias Tape',
      placement: 'Armholes, Neckline',
      size: '1cm width',
      quantity: 1.5,
      uom: 'm',
      supplier: 'Fashion Textiles Ltd.',
      supplierCode: 'FTL-COT-BIAS-1CM',
      comments: 'For finishing armholes and neckline.'
    }
  ],
  measurements: [
    {
      pomCode: 'BUST',
      pomName: 'Bust Width',
      toleranceMinus: 2.0,
      tolerancePlus: 2.0,
      sizes: { XS: 84, S: 88, M: 92, L: 96, XL: 100, XXL: 104 },
      notes: 'Measure across bust at fullest point. Garment laid flat.',
      isActive: true
    },
    {
      pomCode: 'WAIST',
      pomName: 'Waist Width',
      toleranceMinus: 2.0,
      tolerancePlus: 2.0,
      sizes: { XS: 68, S: 72, M: 76, L: 80, XL: 84, XXL: 88 },
      notes: 'Measure at waist level. Garment laid flat.',
      isActive: true
    },
    {
      pomCode: 'LENGTH',
      pomName: 'Dress Length',
      toleranceMinus: 2.0,
      tolerancePlus: 2.0,
      sizes: { XS: 95, S: 97, M: 99, L: 101, XL: 103, XXL: 105 },
      notes: 'Measure from shoulder seam to hem.',
      isActive: true
    },
    {
      pomCode: 'SLEEVE',
      pomName: 'Sleeve Length',
      toleranceMinus: 1.0,
      tolerancePlus: 1.0,
      sizes: { XS: 15, S: 16, M: 17, L: 18, XL: 19, XXL: 20 },
      notes: 'Measure from shoulder seam to sleeve hem.',
      isActive: true
    },
    {
      pomCode: 'SHOULDER',
      pomName: 'Shoulder Width',
      toleranceMinus: 1.0,
      tolerancePlus: 1.0,
      sizes: { XS: 36, S: 38, M: 40, L: 42, XL: 44, XXL: 46 },
      notes: 'Measure from shoulder seam to shoulder seam.',
      isActive: true
    }
  ],
  colorways: [
    {
      name: 'Rose Garden',
      code: 'ROSE-001',
      placement: 'All Over',
      materialType: 'Fabric',
      season: 'SS25',
      isDefault: true,
      approvalStatus: 'Approved',
      productionStatus: 'Bulk Fabric',
      pantoneCode: 'PANTONE 18-1755 TCX',
      hexColor: '#E91E63',
      rgbColor: { r: 233, g: 30, b: 99 },
      supplier: 'Fashion Textiles Ltd.',
      notes: 'Beautiful rose floral print. Print approved.',
      collectionName: 'Summer Blooms 2025',
      parts: [
        {
          partName: 'Main Body',
          colorName: 'Rose Garden',
          pantoneCode: 'PANTONE 18-1755 TCX',
          hexCode: '#E91E63',
          colorType: 'Print'
        }
      ]
    },
    {
      name: 'Lavender Fields',
      code: 'LAV-001',
      placement: 'All Over',
      materialType: 'Fabric',
      season: 'SS25',
      isDefault: false,
      approvalStatus: 'Approved',
      productionStatus: 'Bulk Fabric',
      pantoneCode: 'PANTONE 15-3418 TCX',
      hexColor: '#B19CD9',
      rgbColor: { r: 177, g: 156, b: 217 },
      supplier: 'Fashion Textiles Ltd.',
      notes: 'Lavender floral print. Print approved.',
      collectionName: 'Summer Blooms 2025',
      parts: [
        {
          partName: 'Main Body',
          colorName: 'Lavender Fields',
          pantoneCode: 'PANTONE 15-3418 TCX',
          hexCode: '#B19CD9',
          colorType: 'Print'
        }
      ]
    },
    {
      name: 'Sunflower Yellow',
      code: 'SUN-001',
      placement: 'All Over',
      materialType: 'Fabric',
      season: 'SS25',
      isDefault: false,
      approvalStatus: 'Pending',
      productionStatus: 'Lab Dip',
      pantoneCode: 'PANTONE 13-0755 TCX',
      hexColor: '#F4D03F',
      rgbColor: { r: 244, g: 208, b: 63 },
      supplier: 'Fashion Textiles Ltd.',
      notes: 'Sunflower print. Lab dip submitted. Awaiting approval.',
      collectionName: 'Summer Blooms 2025',
      parts: [
        {
          partName: 'Main Body',
          colorName: 'Sunflower Yellow',
          pantoneCode: 'PANTONE 13-0755 TCX',
          hexCode: '#F4D03F',
          colorType: 'Print'
        }
      ]
    }
  ],
  howToMeasures: [
    {
      pomCode: 'BUST',
      pomName: 'Bust Width',
      description: 'Measure the bust width of the dress',
      stepNumber: 1,
      instructions: [
        'Lay the dress flat on a smooth surface',
        'Smooth out any wrinkles',
        'Locate the fullest point of the bust',
        'Place measuring tape horizontally across the bust',
        'Measure from side seam to side seam',
        'Record the measurement in centimeters'
      ],
      tips: [
        'Measure at the widest point of the bust',
        'Ensure dress is completely flat'
      ],
      commonMistakes: [
        'Measuring too high or too low',
        'Not measuring at fullest point'
      ],
      relatedMeasurements: ['WAIST', 'SHOULDER']
    },
    {
      pomCode: 'LENGTH',
      pomName: 'Dress Length',
      description: 'Measure the total length of the dress',
      stepNumber: 2,
      instructions: [
        'Lay the dress flat',
        'Locate the highest point of the shoulder seam',
        'Place measuring tape at this point',
        'Measure vertically down to the hem',
        'Follow the center line of the dress',
        'Record the measurement in centimeters'
      ],
      tips: [
        'Measure along the center front or back',
        'Keep the tape straight and vertical'
      ],
      commonMistakes: [
        'Measuring along the side seam',
        'Not keeping tape vertical'
      ],
      relatedMeasurements: ['BUST', 'WAIST']
    }
  ],
  status: 'draft'
};

// Array of all templates
const techPackTemplates = [
  poloShirtTemplate,
  denimJeansTemplate,
  tShirtTemplate,
  winterJacketTemplate,
  summerDressTemplate
];

// Helper functions
async function login() {
  try {
    console.log('\n🔐 Đang đăng nhập...');
    console.log(`   Email: ${TEST_USER.email}`);
    
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (response.data.success && response.data.data) {
      authToken = response.data.data.tokens?.accessToken || 
                  response.data.data.accessToken || 
                  response.data.token || 
                  response.data.data.token;
      
      if (!authToken) {
        console.error('❌ Đăng nhập thất bại: Không có token trong response');
        return false;
      }
      
      console.log('✅ Đăng nhập thành công');
      
      // Lấy thông tin user để set technicalDesignerId
      try {
        const userData = response.data.data?.user || response.data.data;
        if (userData && (userData._id || userData.id)) {
          technicalDesignerId = userData._id || userData.id;
          console.log(`✅ User ID: ${technicalDesignerId}`);
        } else {
          const userResponse = await axios.get(`${BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
          
          if (userResponse.data.success && userResponse.data.data) {
            const user = userResponse.data.data.user || userResponse.data.data;
            technicalDesignerId = user._id || user.id;
            console.log(`✅ User ID: ${technicalDesignerId}`);
          }
        }
      } catch (userError) {
        console.log('⚠️  Không thể lấy thông tin user, sẽ sử dụng giá trị mặc định');
      }
      return true;
    } else {
      console.error('❌ Đăng nhập thất bại: Không có token');
      return false;
    }
  } catch (error) {
    console.error('❌ Đăng nhập thất bại');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Error:', error.message);
    }
    return false;
  }
}

async function createTechPack(techPackData, index) {
  try {
    const productName = techPackData.articleInfo.productName;
    const articleCode = techPackData.articleInfo.articleCode;
    
    console.log(`\n📝 [${index}/5] Đang tạo TechPack: ${productName}`);
    console.log(`   Mã sản phẩm: ${articleCode}`);
    console.log(`   BOM items: ${techPackData.bom.length}`);
    console.log(`   Measurements: ${techPackData.measurements.length}`);
    console.log(`   Colorways: ${techPackData.colorways.length}`);
    console.log(`   How to Measure: ${techPackData.howToMeasures.length}`);
    
    const response = await axios.post(
      `${BASE_URL}/techpacks`,
      techPackData,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success && response.data.data) {
      const createdId = response.data.data._id || response.data.data.id;
      console.log(`✅ TechPack đã được tạo thành công!`);
      console.log(`   ID: ${createdId}`);
      console.log(`   Version: ${response.data.data.version}`);
      console.log(`   Status: ${response.data.data.status}`);
      
      return { success: true, id: createdId, data: response.data.data };
    } else {
      console.error('❌ Tạo TechPack thất bại: Response không hợp lệ');
      console.error('Response:', JSON.stringify(response.data, null, 2));
      return { success: false, error: 'Invalid response' };
    }
  } catch (error) {
    console.error(`❌ Tạo TechPack thất bại: ${techPackData.articleInfo.productName}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Error:', error.message);
    }
    return { success: false, error: error.message };
  }
}

// Main function
async function run() {
  console.log('🚀 Bắt đầu tạo 5 TechPack hoàn chỉnh...');
  console.log(`📍 API URL: ${BASE_URL}`);
  console.log(`👤 User: ${TEST_USER.email}`);
  console.log('='.repeat(60));
  
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('\n❌ Không thể tiếp tục nếu không đăng nhập được.');
    console.error('💡 Hãy kiểm tra lại email và password.');
    process.exit(1);
  }
  
  const results = [];
  
  // Create all 5 techpacks
  for (let i = 0; i < techPackTemplates.length; i++) {
    const template = techPackTemplates[i];
    const techPackData = createTechPackData(template);
    const result = await createTechPack(techPackData, i + 1);
    results.push({
      index: i + 1,
      name: template.articleInfo.productName,
      ...result
    });
    
    // Small delay between requests
    if (i < techPackTemplates.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TÓM TẮT KẾT QUẢ:');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Thành công: ${successful.length}/5`);
  successful.forEach(r => {
    console.log(`   ${r.index}. ${r.name} - ID: ${r.id}`);
  });
  
  if (failed.length > 0) {
    console.log(`\n❌ Thất bại: ${failed.length}/5`);
    failed.forEach(r => {
      console.log(`   ${r.index}. ${r.name} - Error: ${r.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Hoàn thành!');
  if (successful.length === 5) {
    console.log('✨ Tất cả 5 TechPack đã được tạo thành công!');
    console.log('\n🔗 Bạn có thể xem các TechPack tại:');
    successful.forEach(r => {
      console.log(`   http://localhost:5173/techpacks/${r.id} - ${r.name}`);
    });
  }
  console.log('='.repeat(60));
  
  process.exit(failed.length > 0 ? 1 : 0);
}

run().catch(error => {
  console.error('💥 Lỗi khi chạy script:', error);
  process.exit(1);
});

