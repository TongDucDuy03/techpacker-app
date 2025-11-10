/**
 * Script tạo TechPack hoàn chỉnh với dữ liệu sản phẩm thực tế
 * 
 * Sử dụng:
 *   cd server
 *   node create-complete-techpack.js
 * 
 * Hoặc với thông tin đăng nhập tùy chỉnh:
 *   TEST_EMAIL=your@email.com TEST_PASSWORD=yourpassword node create-complete-techpack.js
 */

const axios = require('axios');

// Cấu hình
const BASE_URL = process.env.API_URL || 'http://localhost:4001/api/v1';
const TEST_USER = {
  email: process.env.TEST_EMAIL || 'test@techpacker.com',
  password: process.env.TEST_PASSWORD || 'password123'
};

let authToken = '';
let createdTechPackId = '';

// Dữ liệu TechPack hoàn chỉnh cho sản phẩm thực tế: Áo Polo Nam
const completeTechPack = {
  articleInfo: {
    productName: 'Classic Cotton Polo Shirt',
    articleCode: `POLO-${Date.now().toString().slice(-6)}`, // Mã duy nhất
    version: 1,
    supplier: 'Vietnam Textile Manufacturing Co., Ltd.',
    season: 'SS25',
    fabricDescription: '100% Premium Cotton, 180 GSM, Single Jersey Knit, Pre-shrunk, Soft Touch Finish',
    productDescription: 'Classic fit polo shirt with ribbed collar and cuffs. Three-button placket with reinforced stitching. Side vents for comfort. Perfect for casual and business casual wear.',
    designSketchUrl: '',
    productClass: 'Polo Shirts',
    gender: 'Men',
    technicalDesignerId: '', // Sẽ được set sau khi login
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
      id: 'bom-1',
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
      testingRequirements: 'AATCC 61-2A (Colorfastness), ISO 13934-1 (Tensile Strength)',
      comments: 'Pre-approved fabric. Color matching required for each colorway.'
    },
    {
      id: 'bom-2',
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
      id: 'bom-3',
      part: 'Ribbed Cuff',
      materialName: 'Cotton Rib Knit',
      placement: 'Cuff',
      size: 'All Sizes',
      quantity: 0.12,
      uom: 'm',
      supplier: 'Vietnam Textile Manufacturing Co., Ltd.',
      supplierCode: 'VTM-COT-RIB-200',
      materialComposition: '100% Cotton',
      weight: '200 GSM',
      width: '8 cm',
      comments: 'Must match main fabric color.'
    },
    {
      id: 'bom-4',
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
    },
    {
      id: 'bom-5',
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
      id: 'bom-6',
      part: 'Label - Main',
      materialName: 'Woven Care Label',
      placement: 'Side Seam',
      size: '5cm x 2cm',
      quantity: 1,
      uom: 'pcs',
      supplier: 'Label Solutions Inc.',
      supplierCode: 'LSI-WOV-CARE-001',
      comments: 'Must include: Brand name, Size, Care instructions, Country of origin'
    },
    {
      id: 'bom-7',
      part: 'Label - Size',
      materialName: 'Printed Size Label',
      placement: 'Back Neck',
      size: '3cm x 1.5cm',
      quantity: 1,
      uom: 'pcs',
      supplier: 'Label Solutions Inc.',
      supplierCode: 'LSI-PRN-SIZE-001',
      comments: 'Size to be printed as per size chart (S, M, L, XL, XXL)'
    },
    {
      id: 'bom-8',
      part: 'Hang Tag',
      materialName: 'Cardboard Hang Tag',
      placement: 'Attached to garment',
      size: '8cm x 5cm',
      quantity: 1,
      uom: 'pcs',
      supplier: 'Packaging Plus',
      supplierCode: 'PP-CARD-HT-001',
      comments: 'Brand logo, product name, price, barcode. Attach with string.'
    }
  ],
  measurements: [
    {
      id: 'meas-1',
      pomCode: 'CHEST',
      pomName: 'Chest Width',
      toleranceMinus: 1.5,
      tolerancePlus: 1.5,
      sizes: {
        S: 98,
        M: 104,
        L: 110,
        XL: 116,
        XXL: 122
      },
      notes: 'Measure 2.5cm below armhole, across chest. Garment laid flat.',
      measurementMethod: 'Lay garment flat, measure from side seam to side seam',
      isActive: true
    },
    {
      id: 'meas-2',
      pomCode: 'WAIST',
      pomName: 'Waist Width',
      toleranceMinus: 1.5,
      tolerancePlus: 1.5,
      sizes: {
        S: 90,
        M: 96,
        L: 102,
        XL: 108,
        XXL: 114
      },
      notes: 'Measure at waist level, garment laid flat.',
      measurementMethod: 'Lay garment flat, measure from side seam to side seam at waist',
      isActive: true
    },
    {
      id: 'meas-3',
      pomCode: 'LENGTH',
      pomName: 'Body Length',
      toleranceMinus: 1.0,
      tolerancePlus: 1.5,
      sizes: {
        S: 70,
        M: 72,
        L: 74,
        XL: 76,
        XXL: 78
      },
      notes: 'Measure from highest point of shoulder to bottom hem.',
      measurementMethod: 'Measure from shoulder seam to hem along center front/back',
      isActive: true
    },
    {
      id: 'meas-4',
      pomCode: 'SLEEVE',
      pomName: 'Sleeve Length',
      toleranceMinus: 1.0,
      tolerancePlus: 1.0,
      sizes: {
        S: 22,
        M: 23,
        L: 24,
        XL: 25,
        XXL: 26
      },
      notes: 'Measure from shoulder seam to cuff edge.',
      measurementMethod: 'Measure from shoulder seam along sleeve to cuff edge',
      isActive: true
    },
    {
      id: 'meas-5',
      pomCode: 'SHOULDER',
      pomName: 'Shoulder Width',
      toleranceMinus: 1.0,
      tolerancePlus: 1.0,
      sizes: {
        S: 42,
        M: 44,
        L: 46,
        XL: 48,
        XXL: 50
      },
      notes: 'Measure from shoulder seam to shoulder seam.',
      measurementMethod: 'Lay garment flat, measure from shoulder seam to shoulder seam',
      isActive: true
    },
    {
      id: 'meas-6',
      pomCode: 'ARMHOLE',
      pomName: 'Armhole Depth',
      toleranceMinus: 0.5,
      tolerancePlus: 0.5,
      sizes: {
        S: 22,
        M: 23,
        L: 24,
        XL: 25,
        XXL: 26
      },
      notes: 'Measure from shoulder seam to armhole bottom.',
      measurementMethod: 'Measure from shoulder seam vertically down to armhole curve',
      isActive: true
    },
    {
      id: 'meas-7',
      pomCode: 'COLLAR',
      pomName: 'Collar Height',
      toleranceMinus: 0.3,
      tolerancePlus: 0.3,
      sizes: {
        S: 2.5,
        M: 2.5,
        L: 2.5,
        XL: 2.5,
        XXL: 2.5
      },
      notes: 'Measure height of collar when laid flat.',
      measurementMethod: 'Measure from collar base to top edge',
      isActive: true
    },
    {
      id: 'meas-8',
      pomCode: 'CUFF',
      pomName: 'Cuff Opening',
      toleranceMinus: 0.5,
      tolerancePlus: 0.5,
      sizes: {
        S: 18,
        M: 19,
        L: 20,
        XL: 21,
        XXL: 22
      },
      notes: 'Measure circumference of cuff opening.',
      measurementMethod: 'Measure around cuff opening when laid flat, multiply by 2',
      isActive: true
    }
  ],
  colorways: [
    {
      id: 'color-1',
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
      rgbColor: {
        r: 27,
        g: 54,
        b: 93
      },
      supplier: 'Vietnam Textile Manufacturing Co., Ltd.',
      notes: 'Approved color. Bulk fabric ordered. Delivery expected in 2 weeks.',
      collectionName: 'Spring Essentials 2025',
      parts: [
        {
          id: 'part-1',
          partName: 'Main Body',
          colorName: 'Navy Blue',
          pantoneCode: 'PANTONE 19-3832 TCX',
          hexCode: '#1B365D',
          rgbCode: 'rgb(27, 54, 93)',
          colorType: 'Solid',
          supplier: 'Vietnam Textile Manufacturing Co., Ltd.'
        },
        {
          id: 'part-2',
          partName: 'Collar & Cuffs',
          colorName: 'Navy Blue',
          pantoneCode: 'PANTONE 19-3832 TCX',
          hexCode: '#1B365D',
          rgbCode: 'rgb(27, 54, 93)',
          colorType: 'Solid',
          supplier: 'Vietnam Textile Manufacturing Co., Ltd.'
        }
      ]
    },
    {
      id: 'color-2',
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
      rgbColor: {
        r: 255,
        g: 255,
        b: 255
      },
      supplier: 'Vietnam Textile Manufacturing Co., Ltd.',
      notes: 'Approved color. Bulk fabric ready for production.',
      collectionName: 'Spring Essentials 2025',
      parts: [
        {
          id: 'part-3',
          partName: 'Main Body',
          colorName: 'Classic White',
          pantoneCode: 'PANTONE 11-0601 TCX',
          hexCode: '#FFFFFF',
          rgbCode: 'rgb(255, 255, 255)',
          colorType: 'Solid',
          supplier: 'Vietnam Textile Manufacturing Co., Ltd.'
        },
        {
          id: 'part-4',
          partName: 'Collar & Cuffs',
          colorName: 'Classic White',
          pantoneCode: 'PANTONE 11-0601 TCX',
          hexCode: '#FFFFFF',
          rgbCode: 'rgb(255, 255, 255)',
          colorType: 'Solid',
          supplier: 'Vietnam Textile Manufacturing Co., Ltd.'
        }
      ]
    },
    {
      id: 'color-3',
      name: 'Charcoal Gray',
      code: 'GRAY-001',
      placement: 'All Over',
      materialType: 'Fabric',
      season: 'SS25',
      isDefault: false,
      approvalStatus: 'Pending',
      productionStatus: 'Lab Dip',
      pantoneCode: 'PANTONE 19-3908 TCX',
      hexColor: '#4A4A4A',
      rgbColor: {
        r: 74,
        g: 74,
        b: 74
      },
      supplier: 'Vietnam Textile Manufacturing Co., Ltd.',
      notes: 'Lab dip submitted. Awaiting approval.',
      collectionName: 'Spring Essentials 2025',
      parts: [
        {
          id: 'part-5',
          partName: 'Main Body',
          colorName: 'Charcoal Gray',
          pantoneCode: 'PANTONE 19-3908 TCX',
          hexCode: '#4A4A4A',
          rgbCode: 'rgb(74, 74, 74)',
          colorType: 'Solid',
          supplier: 'Vietnam Textile Manufacturing Co., Ltd.'
        },
        {
          id: 'part-6',
          partName: 'Collar & Cuffs',
          colorName: 'Charcoal Gray',
          pantoneCode: 'PANTONE 19-3908 TCX',
          hexCode: '#4A4A4A',
          rgbCode: 'rgb(74, 74, 74)',
          colorType: 'Solid',
          supplier: 'Vietnam Textile Manufacturing Co., Ltd.'
        }
      ]
    }
  ],
  howToMeasures: [
    {
      id: 'htm-1',
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
        'Do not stretch the fabric while measuring',
        'Measure at the widest point of the chest area',
        'Take the measurement twice to ensure accuracy'
      ],
      commonMistakes: [
        'Measuring too high or too low on the chest',
        'Not laying the garment completely flat',
        'Stretching the fabric while measuring',
        'Measuring at an angle instead of horizontally'
      ],
      relatedMeasurements: ['WAIST', 'SHOULDER']
    },
    {
      id: 'htm-2',
      pomCode: 'WAIST',
      pomName: 'Waist Width',
      description: 'Measure the waist width of the garment',
      stepNumber: 2,
      instructions: [
        'Lay the garment flat on a smooth surface',
        'Locate the waist level (typically at the narrowest point of the body)',
        'Place the measuring tape horizontally across the waist',
        'Measure from side seam to side seam',
        'Record the measurement in centimeters'
      ],
      tips: [
        'The waist is usually the narrowest part of the garment',
        'Ensure the garment is flat and not twisted',
        'Measure at the natural waistline'
      ],
      commonMistakes: [
        'Measuring at the wrong level (too high or too low)',
        'Not keeping the tape horizontal',
        'Measuring a twisted or folded garment'
      ],
      relatedMeasurements: ['CHEST', 'LENGTH']
    },
    {
      id: 'htm-3',
      pomCode: 'LENGTH',
      pomName: 'Body Length',
      description: 'Measure the total length of the garment from shoulder to hem',
      stepNumber: 3,
      instructions: [
        'Lay the garment flat on a smooth surface',
        'Locate the highest point of the shoulder seam',
        'Place the measuring tape at this point',
        'Measure vertically down to the bottom hem',
        'Follow the center line of the garment (front or back)',
        'Record the measurement in centimeters'
      ],
      tips: [
        'Measure along the center front or center back',
        'Keep the tape straight and vertical',
        'Ensure the hem is fully extended'
      ],
      commonMistakes: [
        'Measuring from the wrong point on the shoulder',
        'Not keeping the tape vertical',
        'Measuring along the side seam instead of center',
        'Not extending the hem fully'
      ],
      relatedMeasurements: ['SLEEVE', 'ARMHOLE']
    },
    {
      id: 'htm-4',
      pomCode: 'SLEEVE',
      pomName: 'Sleeve Length',
      description: 'Measure the length of the sleeve from shoulder to cuff',
      stepNumber: 4,
      instructions: [
        'Lay the garment flat with the sleeve extended',
        'Locate the shoulder seam',
        'Place the measuring tape at the shoulder seam',
        'Measure along the sleeve to the edge of the cuff',
        'Follow the natural curve of the sleeve',
        'Record the measurement in centimeters'
      ],
      tips: [
        'Extend the sleeve fully but do not stretch',
        'Follow the natural curve of the sleeve',
        'Measure to the edge of the cuff, not the hem'
      ],
      commonMistakes: [
        'Measuring in a straight line instead of following the curve',
        'Measuring to the wrong point (hem instead of cuff edge)',
        'Stretching the sleeve while measuring'
      ],
      relatedMeasurements: ['ARMHOLE', 'CUFF']
    },
    {
      id: 'htm-5',
      pomCode: 'SHOULDER',
      pomName: 'Shoulder Width',
      description: 'Measure the width across the shoulders',
      stepNumber: 5,
      instructions: [
        'Lay the garment flat on a smooth surface',
        'Locate the shoulder seams on both sides',
        'Place the measuring tape horizontally from shoulder seam to shoulder seam',
        'Measure across the back of the garment',
        'Record the measurement in centimeters'
      ],
      tips: [
        'Measure across the back for accuracy',
        'Ensure both shoulder seams are aligned',
        'Keep the tape horizontal'
      ],
      commonMistakes: [
        'Measuring at an angle',
        'Not aligning the shoulder seams properly',
        'Measuring the front instead of the back'
      ],
      relatedMeasurements: ['CHEST', 'ARMHOLE']
    }
  ],
  status: 'draft'
};

// Hàm helper
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
          completeTechPack.articleInfo.technicalDesignerId = userData._id || userData.id;
          console.log(`✅ User ID: ${completeTechPack.articleInfo.technicalDesignerId}`);
        } else {
          const userResponse = await axios.get(`${BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
          
          if (userResponse.data.success && userResponse.data.data) {
            const user = userResponse.data.data.user || userResponse.data.data;
            completeTechPack.articleInfo.technicalDesignerId = user._id || user.id;
            console.log(`✅ User ID: ${completeTechPack.articleInfo.technicalDesignerId}`);
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

async function createTechPack() {
  try {
    console.log('\n📝 Đang tạo TechPack hoàn chỉnh...');
    console.log(`   Tên sản phẩm: ${completeTechPack.articleInfo.productName}`);
    console.log(`   Mã sản phẩm: ${completeTechPack.articleInfo.articleCode}`);
    console.log(`   Nhà cung cấp: ${completeTechPack.articleInfo.supplier}`);
    console.log(`   Mùa: ${completeTechPack.articleInfo.season}`);
    console.log(`   BOM items: ${completeTechPack.bom.length}`);
    console.log(`   Measurements: ${completeTechPack.measurements.length}`);
    console.log(`   Colorways: ${completeTechPack.colorways.length}`);
    console.log(`   How to Measure: ${completeTechPack.howToMeasures.length}`);
    
    const response = await axios.post(
      `${BASE_URL}/techpacks`,
      completeTechPack,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success && response.data.data) {
      createdTechPackId = response.data.data._id || response.data.data.id;
      console.log('\n✅ TechPack đã được tạo thành công!');
      console.log(`   ID: ${createdTechPackId}`);
      console.log(`   Tên sản phẩm: ${response.data.data.productName}`);
      console.log(`   Mã sản phẩm: ${response.data.data.articleCode}`);
      console.log(`   Trạng thái: ${response.data.data.status}`);
      console.log(`   Version: ${response.data.data.version}`);
      console.log(`\n📊 Tóm tắt dữ liệu đã tạo:`);
      console.log(`   - BOM Items: ${response.data.data.bom?.length || 0}`);
      console.log(`   - Measurements: ${response.data.data.measurements?.length || 0}`);
      console.log(`   - Colorways: ${response.data.data.colorways?.length || 0}`);
      console.log(`   - How to Measure: ${response.data.data.howToMeasure?.length || 0}`);
      
      console.log(`\n🔗 Bạn có thể xem TechPack tại:`);
      console.log(`   http://localhost:5173/techpacks/${createdTechPackId}`);
      
      return true;
    } else {
      console.error('❌ Tạo TechPack thất bại: Response không hợp lệ');
      console.error('Response:', JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Tạo TechPack thất bại');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Error:', error.message);
    }
    return false;
  }
}

// Chạy script
async function run() {
  console.log('🚀 Bắt đầu tạo TechPack hoàn chỉnh...');
  console.log(`📍 API URL: ${BASE_URL}`);
  console.log(`👤 User: ${TEST_USER.email}`);
  console.log('='.repeat(60));
  
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('\n❌ Không thể tiếp tục nếu không đăng nhập được.');
    console.error('💡 Hãy kiểm tra lại email và password.');
    process.exit(1);
  }
  
  const createSuccess = await createTechPack();
  if (!createSuccess) {
    console.error('\n❌ Tạo TechPack thất bại.');
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Hoàn thành! TechPack đã được tạo với đầy đủ thông tin.');
  console.log('='.repeat(60));
  process.exit(0);
}

run().catch(error => {
  console.error('💥 Lỗi khi chạy script:', error);
  process.exit(1);
});

