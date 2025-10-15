const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/techpacker_app';

async function fixUserIndexes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // List current indexes
    console.log('Current indexes on users collection:');
    const indexes = await usersCollection.indexes();
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // Drop the problematic username index if it exists
    try {
      await usersCollection.dropIndex('username_1');
      console.log('✅ Dropped username_1 index successfully');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️ username_1 index does not exist');
      } else {
        console.error('❌ Error dropping index:', error.message);
      }
    }
    
    // Also clean up any documents with username field
    const result = await usersCollection.updateMany(
      { username: { $exists: true } },
      { $unset: { username: "" } }
    );
    console.log(`✅ Cleaned up ${result.modifiedCount} documents with username field`);
    
    // List indexes after cleanup
    console.log('\nIndexes after cleanup:');
    const newIndexes = await usersCollection.indexes();
    newIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
  } catch (error) {
    console.error('❌ Database operation failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
}

fixUserIndexes();
