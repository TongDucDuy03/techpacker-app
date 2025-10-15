const mongoose = require('mongoose');

// Connect to MongoDB
async function checkTechPacks() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/techpacker_app');
    console.log('Connected successfully');

    // Get collection directly
    const db = mongoose.connection.db;
    const techpacks = await db.collection('techpacks').find({}).limit(10).toArray();
    
    console.log(`Found ${techpacks.length} tech packs:`);
    techpacks.forEach((tp, index) => {
      console.log(`${index + 1}. ID: ${tp._id} (Type: ${typeof tp._id})`);
      console.log(`   Product: ${tp.productName}`);
      console.log(`   Article: ${tp.articleCode}`);
      console.log(`   ID String: "${tp._id.toString()}"`);
      console.log(`   ID Length: ${tp._id.toString().length}`);
      console.log('---');
    });

    // Check if the specific ID exists
    const specificId = '1758726497677';
    console.log(`\nLooking for tech pack with ID: ${specificId}`);
    
    // Try different query approaches
    const byString = await db.collection('techpacks').findOne({ _id: specificId });
    console.log('Found by string ID:', byString ? 'YES' : 'NO');
    
    const byNumber = await db.collection('techpacks').findOne({ _id: parseInt(specificId) });
    console.log('Found by number ID:', byNumber ? 'YES' : 'NO');
    
    // Try to find by any field that might contain this value
    const byAnyField = await db.collection('techpacks').findOne({
      $or: [
        { articleCode: specificId },
        { productName: { $regex: specificId } },
        { 'bom.materialCode': specificId }
      ]
    });
    console.log('Found by other fields:', byAnyField ? 'YES' : 'NO');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkTechPacks();
