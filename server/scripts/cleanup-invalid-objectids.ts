/**
 * Script to find and clean up TechPacks with invalid ObjectIds in sharedWith array
 * Run this script to identify and fix invalid ObjectId values in the database
 * 
 * Usage: npx ts-node scripts/cleanup-invalid-objectids.ts
 */

import mongoose from 'mongoose';
import TechPack from '../src/models/techpack.model';
import { Types } from 'mongoose';
import { config } from '../src/config/config';

async function cleanupInvalidObjectIds() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all TechPacks
    const techpacks = await TechPack.find({}).lean();
    console.log(`📊 Found ${techpacks.length} TechPacks`);

    let fixedCount = 0;
    let errorCount = 0;
    const issues: Array<{ techpackId: string; issue: string }> = [];

    for (const techpack of techpacks) {
      try {
        const sharedWith = (techpack.sharedWith || []) as any[];
        let needsUpdate = false;
        const cleanedSharedWith = sharedWith.filter((share: any) => {
          if (!share.userId) {
            issues.push({
              techpackId: techpack._id.toString(),
              issue: 'sharedWith entry missing userId'
            });
            needsUpdate = true;
            return false; // Remove entries without userId
          }

          // Check if userId is a valid ObjectId
          const userIdStr = share.userId?.toString();
          if (!Types.ObjectId.isValid(userIdStr)) {
            issues.push({
              techpackId: techpack._id.toString(),
              issue: `Invalid ObjectId in sharedWith.userId: ${userIdStr}`
            });
            needsUpdate = true;
            return false; // Remove entries with invalid ObjectIds
          }

          // Ensure userId is a proper ObjectId instance
          if (!(share.userId instanceof Types.ObjectId)) {
            share.userId = new Types.ObjectId(userIdStr);
            needsUpdate = true;
          }

          // Check sharedBy if it exists
          if (share.sharedBy) {
            const sharedByStr = share.sharedBy.toString();
            if (!Types.ObjectId.isValid(sharedByStr)) {
              issues.push({
                techpackId: techpack._id.toString(),
                issue: `Invalid ObjectId in sharedWith.sharedBy: ${sharedByStr}`
              });
              share.sharedBy = undefined; // Remove invalid sharedBy
              needsUpdate = true;
            } else if (!(share.sharedBy instanceof Types.ObjectId)) {
              share.sharedBy = new Types.ObjectId(sharedByStr);
              needsUpdate = true;
            }
          }

          return true; // Keep valid entries
        });

        if (needsUpdate) {
          await TechPack.updateOne(
            { _id: techpack._id },
            { $set: { sharedWith: cleanedSharedWith } }
          );
          fixedCount++;
          console.log(`✅ Fixed TechPack: ${techpack._id}`);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`❌ Error processing TechPack ${techpack._id}:`, error.message);
        issues.push({
          techpackId: techpack._id.toString(),
          issue: `Error: ${error.message}`
        });
      }
    }

    console.log('\n📋 Summary:');
    console.log(`✅ Fixed: ${fixedCount} TechPacks`);
    console.log(`❌ Errors: ${errorCount} TechPacks`);
    console.log(`📝 Total issues found: ${issues.length}`);

    if (issues.length > 0) {
      console.log('\n🔍 Issues found:');
      issues.forEach(issue => {
        console.log(`  - TechPack ${issue.techpackId}: ${issue.issue}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupInvalidObjectIds();

