import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb://localhost:27017';
const DATABASE_NAME = 'techpacker_app';

async function fixUserIndexes() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DATABASE_NAME);
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
    
    // List indexes after cleanup
    console.log('\nIndexes after cleanup:');
    const newIndexes = await usersCollection.indexes();
    newIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
  } catch (error) {
    console.error('❌ Database operation failed:', error);
  } finally {
    await client.close();
    console.log('Database connection closed');
  }
}

fixUserIndexes();
