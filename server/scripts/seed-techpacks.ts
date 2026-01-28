import dotenv from 'dotenv';
import mongoose from 'mongoose';

import TechPack, { TechPackStatus } from '../src/models/techpack.model';
import User, { UserRole } from '../src/models/user.model';
import { config } from '../src/config/config';

dotenv.config();

interface SeedTechpacksOptions {
  designerEmail?: string;
}

async function getDefaultDesigner(designerEmail?: string) {
  if (designerEmail) {
    const user = await User.findOne({ email: designerEmail.toLowerCase() });
    if (user) {
      return user;
    }
    console.warn(`⚠️  Không tìm thấy user với email "${designerEmail}", sẽ tìm user khác làm designer mặc định.`);
  }

  // Ưu tiên Admin hoặc Designer
  const adminOrDesigner = await User.findOne({
    role: { $in: [UserRole.Admin, UserRole.Designer] },
    isActive: true,
  }).sort({ createdAt: 1 });

  if (adminOrDesigner) {
    return adminOrDesigner;
  }

  // Fallback: bất kỳ user nào
  const anyUser = await User.findOne().sort({ createdAt: 1 });
  if (!anyUser) {
    throw new Error('Không tìm thấy user nào trong hệ thống. Hãy chạy seed-admin trước.');
  }

  return anyUser;
}

async function seedTechpacks(options: SeedTechpacksOptions = {}) {
  try {
    console.log('🔌 Đang kết nối MongoDB...');
    await mongoose.connect(config.mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Đã kết nối MongoDB');

    const designer = await getDefaultDesigner(options.designerEmail);
    const createdBy = designer._id;
    const createdByName = `${designer.firstName} ${designer.lastName}`;

    const baseTechpacks = [
      {
        articleName: 'LS Cotton Blend Security Shirt',
        articleCode: 'TP-SAMPLE-001',
        sampleType: 'V1',
        technicalDesignerId: designer.email,
        supplier: 'Sample Supplier A',
        season: 'SS25',
        fabricDescription: 'Cotton blend, 150gsm, plain weave',
        productDescription: 'Long sleeve security shirt with epaulettes',
        status: TechPackStatus.Draft,
      },
      {
        articleName: 'Basic Crewneck T-Shirt',
        articleCode: 'TP-SAMPLE-002',
        sampleType: 'V1',
        technicalDesignerId: designer.email,
        supplier: 'Sample Supplier B',
        season: 'SS25',
        fabricDescription: '100% cotton jersey, 160gsm',
        productDescription: 'Unisex basic crewneck t-shirt',
        status: TechPackStatus.Draft,
      },
      {
        articleName: 'Women Slim Fit Jeans',
        articleCode: 'TP-SAMPLE-003',
        sampleType: 'V1',
        technicalDesignerId: designer.email,
        supplier: 'Sample Supplier C',
        season: 'FW25',
        fabricDescription: 'Denim 12oz, 98% cotton 2% elastane',
        productDescription: 'Slim fit mid-rise jeans',
        status: TechPackStatus.InReview,
      },
      {
        articleName: 'Men Hoodie Fleece',
        articleCode: 'TP-SAMPLE-004',
        sampleType: 'V1',
        technicalDesignerId: designer.email,
        supplier: 'Sample Supplier D',
        season: 'FW25',
        fabricDescription: 'Brushed fleece, 65% cotton 35% polyester',
        productDescription: 'Regular fit hoodie with kangaroo pocket',
        status: TechPackStatus.Draft,
      },
      {
        articleName: 'Kids Jogger Pants',
        articleCode: 'TP-SAMPLE-005',
        sampleType: 'V1',
        technicalDesignerId: designer.email,
        supplier: 'Sample Supplier E',
        season: 'SS26',
        fabricDescription: 'French terry, 240gsm',
        productDescription: 'Jogger pants with elastic waistband and cuffs',
        status: TechPackStatus.Draft,
      },
    ];

    // Đảm bảo không tạo trùng articleCode
    const articleCodes = baseTechpacks.map((t) => t.articleCode);
    const existing = await TechPack.find({ articleCode: { $in: articleCodes } }).select('articleCode');
    const existingCodes = new Set(existing.map((t) => t.articleCode));

    const techpacksToInsert = baseTechpacks
      .filter((t) => !existingCodes.has(t.articleCode))
      .map((t) => ({
        ...t,
        bom: [],
        measurements: [],
        sampleMeasurementRounds: [],
        colorways: [],
        howToMeasure: [],
        measurementSizeRange: [],
        measurementBaseSize: 'M',
        measurementUnit: 'cm',
        createdBy,
        createdByName,
        updatedBy: createdBy,
        updatedByName: createdByName,
        sharedWith: [],
        auditLogs: [],
      }));

    if (techpacksToInsert.length === 0) {
      console.log('⚠️  5 techpack mẫu đã tồn tại (dựa trên articleCode). Không có gì để tạo thêm.');
      await mongoose.disconnect();
      return;
    }

    console.log(`👕 Đang tạo ${techpacksToInsert.length} techpack mẫu...`);
    const createdDocs = await TechPack.insertMany(techpacksToInsert);

    createdDocs.forEach((doc) => {
      console.log(`✅ Đã tạo techpack: ${doc.articleCode} - ${doc.articleName}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Seed 5 techpack mẫu hoàn tất thành công.');
  } catch (error: any) {
    console.error('❌ Lỗi khi seed techpack mẫu:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Chạy trực tiếp bằng Node
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: SeedTechpacksOptions = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    if (key && value) {
      (options as any)[key] = value;
    }
  }

  seedTechpacks(options)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export { seedTechpacks };

