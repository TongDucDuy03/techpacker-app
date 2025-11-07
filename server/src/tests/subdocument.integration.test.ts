import mongoose from 'mongoose';
import request from 'supertest';

// Create a static test user id that both the mock auth and DB records will use
const TEST_USER_ID = new mongoose.Types.ObjectId().toString();

// Mock the auth middleware before importing the app so routes use the mock
jest.mock('../middleware/auth.middleware', () => {
  const actual = jest.requireActual('../middleware/auth.middleware');
  return {
    ...actual,
    requireAuth: (req: any, _res: any, next: any) => {
      req.user = {
        _id: TEST_USER_ID,
        role: 'admin',
        firstName: 'Test',
        lastName: 'User'
      };
      next();
    },
    requireRole: (_roles: any) => (_req: any, _res: any, next: any) => next()
  };
});

import { connectTestDb, clearTestDb, disconnectTestDb } from './testUtils/setupTestDB';
import { app } from '../index';
import User from '../models/user.model';
import TechPack from '../models/techpack.model';

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

afterEach(async () => {
  await clearTestDb();
});

describe('Subdocument endpoints integration', () => {
  test('POST /api/v1/techpacks/:id/bom adds BOM item and creates a revision', async () => {
    // Create test user and techpack
  const user = await User.create({ _id: TEST_USER_ID, firstName: 'Test', lastName: 'User', email: 'a@b.com', role: 'admin', password: 'x' });
    const techpack = await TechPack.create({
      productName: 'TP1',
      articleCode: 'ART1',
      version: 'v1.0',
      createdBy: user._id,
      createdByName: 'Test User',
      status: 'Draft',
      bom: [],
      productDescription: 'Test product',
      fabricDescription: 'Test fabric',
      season: 'SS25',
      supplier: 'Supplier A',
      technicalDesignerId: user._id
    });

    const bomPayload = {
      part: 'Button',
      materialName: 'Plastic',
      placement: 'Front',
      size: 'S',
      quantity: 10,
      uom: 'pcs',
      supplier: 'Supplier A'
    };

    const res = await request(app)
      .post(`/api/v1/techpacks/${techpack._id}/bom`)
      .send(bomPayload)
      .expect(201);

    expect(res.body.success).toBe(true);
    const bomItem = res.body.data.bomItem;
    expect(bomItem).toHaveProperty('_id');
    expect(bomItem.part).toBe('Button');

    // Fetch techpack and verify BOM persisted
    const getRes = await request(app).get(`/api/v1/techpacks/${techpack._id}`).expect(200);
    const returned = getRes.body.data || getRes.body; // sendSuccess sometimes returns root data differently
    // Ensure bom length is 1
    const fetched = Array.isArray(returned.bom) ? returned : { bom: returned.bom };

    expect(fetched.bom.length).toBeGreaterThanOrEqual(1);

    // Verify a revision exists in DB
    const Revision = require('../models/revision.model').default;
    const revisions = await Revision.find({ techPackId: techpack._id }).lean();
    expect(revisions.length).toBeGreaterThanOrEqual(1);
  });
});
