const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/techpacker', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// TechPack Schema (simplified)
const TechPackSchema = new mongoose.Schema({
  productName: String,
  articleCode: String,
  version: String,
  technicalDesignerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // ... other fields
}, { timestamps: true });

const TechPack = mongoose.model('TechPack', TechPackSchema);

async function fixTechnicalDesignerIds() {
  try {
    console.log('🔍 Finding TechPacks without technicalDesignerId...');
    
    // Find TechPacks that don't have technicalDesignerId set
    const techPacksWithoutDesigner = await TechPack.find({
      $or: [
        { technicalDesignerId: { $exists: false } },
        { technicalDesignerId: null }
      ]
    });

    console.log(`📊 Found ${techPacksWithoutDesigner.length} TechPacks without technicalDesignerId`);

    if (techPacksWithoutDesigner.length === 0) {
      console.log('✅ All TechPacks already have technicalDesignerId set');
      process.exit(0);
    }

    // Update each TechPack to set technicalDesignerId to the creator
    let updatedCount = 0;
    for (const techPack of techPacksWithoutDesigner) {
      if (techPack.createdBy) {
        await TechPack.updateOne(
          { _id: techPack._id },
          { $set: { technicalDesignerId: techPack.createdBy } }
        );
        updatedCount++;
        console.log(`✅ Updated TechPack ${techPack.articleCode} (${techPack._id})`);
      } else {
        console.log(`⚠️  Skipping TechPack ${techPack.articleCode} - no createdBy field`);
      }
    }

    console.log(`🎉 Successfully updated ${updatedCount} TechPacks`);
    console.log('✅ Migration completed successfully');

  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the migration
fixTechnicalDesignerIds();


