const { mongoDb } = require('../config/database');
const { businessRules } = require('../config/validation');

class TechPackService {
  // Get all tech packs with pagination and filtering
  async getAllTechPacks(options = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      brand,
      season,
      search,
      sortBy = 'last_modified',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    const filter = { is_active: true };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (brand) filter.brand = { $regex: brand, $options: 'i' };
    if (season) filter.season = season;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { designer: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = { [sortBy]: sortOrder.toUpperCase() === 'DESC' ? -1 : 1 };

    const cursor = mongoDb.collection('techpacks')
      .find(filter)
      .sort(sort)
      .skip(offset)
      .limit(limit);

    const items = await cursor.toArray();
    const withCounts = items.map(doc => ({
      ...doc,
      bom_item_count: Array.isArray(doc.bomItems) ? doc.bomItems.length : 0,
      measurement_count: Array.isArray(doc.measurements) ? doc.measurements.length : 0,
      construction_detail_count: Array.isArray(doc.constructionDetails) ? doc.constructionDetails.length : 0,
      care_instruction_count: Array.isArray(doc.careInstructions) ? doc.careInstructions.length : 0,
      version_count: Array.isArray(doc.versions) ? doc.versions.length : 0
    }));

    return withCounts;
  }

  // Get tech pack by ID with all related data
  async getTechPackById(id) {
    const techPack = await mongoDb.collection('techpacks').findOne({ id, is_active: true });
    return techPack || null;
  }

  // Create new tech pack
  async createTechPack(techPackData, userId) {
    const {
      name,
      category,
      status = 'draft',
      season,
      brand,
      designer,
      images = [],
      metadata = {},
      version = '1.0.0',
      parent_id = null,
      bomItems = [],
      measurements = [],
      constructionDetails = [],
      careInstructions = [],
      colorways = []
    } = techPackData;

    const validation = businessRules.validateTechPackCompleteness({
      materials: bomItems,
      measurements,
      constructionDetails
    });
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const bomValidation = businessRules.validateBOMConsistency(bomItems);
    if (!bomValidation.isValid) {
      throw new Error(`BOM validation failed: ${bomValidation.errors.join(', ')}`);
    }

    const measurementValidation = businessRules.validateMeasurementConsistency(measurements);
    if (!measurementValidation.isValid) {
      throw new Error(`Measurement validation failed: ${measurementValidation.errors.join(', ')}`);
    }

    const techPackId = `tp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const doc = {
      id: techPackId,
      name,
      category,
      status,
      season,
      brand,
      designer,
      images,
      metadata,
      version,
      parent_id,
      is_active: true,
      created_by: userId,
      updated_by: userId,
      created_at: now,
      last_modified: now,
      bomItems,
      measurements,
      constructionDetails,
      careInstructions,
      colorways,
      versions: []
    };

    await mongoDb.collection('techpacks').insertOne(doc);
    return await this.getTechPackById(techPackId);
  }

  // Update tech pack
  async updateTechPack(id, updateData, userId) {
    const {
      name, category, status, season, brand, designer, images, metadata, version,
      bomItems, measurements, constructionDetails, careInstructions, colorways
    } = updateData;

    const update = { $set: { updated_by: userId, last_modified: new Date().toISOString() } };
    if (name !== undefined) update.$set.name = name;
    if (category !== undefined) update.$set.category = category;
    if (status !== undefined) update.$set.status = status;
    if (season !== undefined) update.$set.season = season;
    if (brand !== undefined) update.$set.brand = brand;
    if (designer !== undefined) update.$set.designer = designer;
    if (images !== undefined) update.$set.images = images;
    if (metadata !== undefined) update.$set.metadata = metadata;
    if (version !== undefined) update.$set.version = version;
    if (bomItems !== undefined) update.$set.bomItems = bomItems;
    if (measurements !== undefined) update.$set.measurements = measurements;
    if (constructionDetails !== undefined) update.$set.constructionDetails = constructionDetails;
    if (careInstructions !== undefined) update.$set.careInstructions = careInstructions;
    if (colorways !== undefined) update.$set.colorways = colorways;

    const result = await mongoDb.collection('techpacks').findOneAndUpdate(
      { id, is_active: true },
      update,
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('TechPack not found');
    }

    return result.value;
  }

  // Delete tech pack (soft delete)
  async deleteTechPack(id, userId) {
    const result = await mongoDb.collection('techpacks').updateOne(
      { id, is_active: true },
      { $set: { is_active: false, updated_by: userId, last_modified: new Date().toISOString() } }
    );
    return result.matchedCount > 0;
  }

  // Get tech pack statistics
  async getTechPackStats() {
    const collection = mongoDb.collection('techpacks');
    const [total_techpacks, draft_count, review_count, approved_count, recent_count] = await Promise.all([
      collection.countDocuments({ is_active: true }),
      collection.countDocuments({ is_active: true, status: 'draft' }),
      collection.countDocuments({ is_active: true, status: 'review' }),
      collection.countDocuments({ is_active: true, status: 'approved' }),
      collection.countDocuments({ is_active: true, created_at: { $gte: new Date(Date.now() - 30*24*60*60*1000).toISOString() } })
    ]);

    return { total_techpacks, draft_count, review_count, approved_count, recent_count };
  }
}

module.exports = { techpackService: new TechPackService() };
