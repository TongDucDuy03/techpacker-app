import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import jwt from 'jsonwebtoken';
import techpackRoutes from '../../routes/techpack.routes';
import { requireAuth } from '../../middleware/auth.middleware';
import User, { UserRole } from '../../models/user.model';
import TechPack from '../../models/techpack.model';
import { config } from '../../config/config';

const app = express();
app.use(express.json());
app.use(requireAuth);
app.use('/api/techpacks', techpackRoutes);

describe('TechPack Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let designerToken: string;
  let adminToken: string;
  let designerUser: any;
  let adminUser: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test users
    designerUser = await User.create({
      username: 'designer1',
      email: 'designer@test.com',
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'Designer',
      role: UserRole.Designer
    });

    adminUser = await User.create({
      username: 'admin1',
      email: 'admin@test.com',
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'Admin',
      role: UserRole.Admin
    });

    // Generate tokens
    designerToken = jwt.sign({ userId: designerUser._id }, config.jwtSecret);
    adminToken = jwt.sign({ userId: adminUser._id }, config.jwtSecret);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await TechPack.deleteMany({});
  });

  describe('POST /api/techpacks', () => {
    const validTechPackData = {
      productName: 'Test Shirt',
      articleCode: 'TS001',
      supplier: 'Test Supplier',
      season: 'Spring 2024',
      fabricDescription: 'Cotton blend fabric',
      category: 'Shirts',
      gender: 'Men'
    };

    it('should create techpack successfully', async () => {
      const response = await request(app)
        .post('/api/techpacks')
        .set('Authorization', `Bearer ${designerToken}`)
        .send(validTechPackData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.techpack.productName).toBe(validTechPackData.productName);
      expect(response.body.data.techpack.designer).toBe(designerUser._id.toString());
      expect(response.body.data.techpack.version).toBe('V1');
    });

    it('should not create techpack with duplicate article code', async () => {
      await TechPack.create({
        ...validTechPackData,
        designer: designerUser._id,
        designerName: designerUser.fullName,
        createdBy: designerUser._id,
        createdByName: designerUser.fullName,
        updatedBy: designerUser._id,
        updatedByName: designerUser.fullName
      });

      const response = await request(app)
        .post('/api/techpacks')
        .set('Authorization', `Bearer ${designerToken}`)
        .send(validTechPackData)
        .expect(500); // Duplicate key error

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/techpacks')
        .set('Authorization', `Bearer ${designerToken}`)
        .send({
          productName: 'Test Shirt'
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/techpacks', () => {
    beforeEach(async () => {
      // Create test techpacks
      await TechPack.create([
        {
          productName: 'Designer Shirt 1',
          articleCode: 'DS001',
          supplier: 'Supplier A',
          season: 'Spring 2024',
          fabricDescription: 'Cotton',
          designer: designerUser._id,
          designerName: designerUser.fullName,
          createdBy: designerUser._id,
          createdByName: designerUser.fullName,
          updatedBy: designerUser._id,
          updatedByName: designerUser.fullName
        },
        {
          productName: 'Designer Shirt 2',
          articleCode: 'DS002',
          supplier: 'Supplier B',
          season: 'Summer 2024',
          fabricDescription: 'Polyester',
          designer: designerUser._id,
          designerName: designerUser.fullName,
          createdBy: designerUser._id,
          createdByName: designerUser.fullName,
          updatedBy: designerUser._id,
          updatedByName: designerUser.fullName
        }
      ]);
    });

    it('should get techpacks with pagination', async () => {
      const response = await request(app)
        .get('/api/techpacks?page=1&limit=10')
        .set('Authorization', `Bearer ${designerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.techpacks).toHaveLength(2);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalItems).toBe(2);
    });

    it('should filter techpacks by search query', async () => {
      const response = await request(app)
        .get('/api/techpacks?q=Designer Shirt 1')
        .set('Authorization', `Bearer ${designerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.techpacks).toHaveLength(1);
      expect(response.body.data.techpacks[0].productName).toBe('Designer Shirt 1');
    });

    it('should filter techpacks by season', async () => {
      const response = await request(app)
        .get('/api/techpacks?season=Spring 2024')
        .set('Authorization', `Bearer ${designerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.techpacks).toHaveLength(1);
      expect(response.body.data.techpacks[0].season).toBe('Spring 2024');
    });

    it('should only show designer own techpacks for designer role', async () => {
      // Create techpack for another user
      const anotherUser = await User.create({
        username: 'designer2',
        email: 'designer2@test.com',
        password: 'Test123!',
        firstName: 'Another',
        lastName: 'Designer',
        role: UserRole.Designer
      });

      await TechPack.create({
        productName: 'Another Designer Shirt',
        articleCode: 'ADS001',
        supplier: 'Supplier C',
        season: 'Fall 2024',
        fabricDescription: 'Wool',
        designer: anotherUser._id,
        designerName: anotherUser.fullName,
        createdBy: anotherUser._id,
        createdByName: anotherUser.fullName,
        updatedBy: anotherUser._id,
        updatedByName: anotherUser.fullName
      });

      const response = await request(app)
        .get('/api/techpacks')
        .set('Authorization', `Bearer ${designerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.techpacks).toHaveLength(2); // Only designer's own techpacks
    });

    it('should show all techpacks for admin role', async () => {
      const response = await request(app)
        .get('/api/techpacks')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.techpacks).toHaveLength(2);
    });
  });

  describe('GET /api/techpacks/:id', () => {
    let techpackId: string;

    beforeEach(async () => {
      const techpack = await TechPack.create({
        productName: 'Test Shirt',
        articleCode: 'TS001',
        supplier: 'Test Supplier',
        season: 'Spring 2024',
        fabricDescription: 'Cotton',
        designer: designerUser._id,
        designerName: designerUser.fullName,
        createdBy: designerUser._id,
        createdByName: designerUser.fullName,
        updatedBy: designerUser._id,
        updatedByName: designerUser.fullName
      });
      techpackId = techpack._id.toString();
    });

    it('should get techpack by id', async () => {
      const response = await request(app)
        .get(`/api/techpacks/${techpackId}`)
        .set('Authorization', `Bearer ${designerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.techpack.productName).toBe('Test Shirt');
    });

    it('should return 404 for non-existent techpack', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/techpacks/${nonExistentId}`)
        .set('Authorization', `Bearer ${designerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should not allow designer to access other designer techpack', async () => {
      const anotherUser = await User.create({
        username: 'designer2',
        email: 'designer2@test.com',
        password: 'Test123!',
        firstName: 'Another',
        lastName: 'Designer',
        role: UserRole.Designer
      });

      const anotherTechpack = await TechPack.create({
        productName: 'Another Shirt',
        articleCode: 'AS001',
        supplier: 'Another Supplier',
        season: 'Summer 2024',
        fabricDescription: 'Polyester',
        designer: anotherUser._id,
        designerName: anotherUser.fullName,
        createdBy: anotherUser._id,
        createdByName: anotherUser.fullName,
        updatedBy: anotherUser._id,
        updatedByName: anotherUser.fullName
      });

      const response = await request(app)
        .get(`/api/techpacks/${anotherTechpack._id}`)
        .set('Authorization', `Bearer ${designerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });
  });

  describe('PUT /api/techpacks/:id', () => {
    let techpackId: string;

    beforeEach(async () => {
      const techpack = await TechPack.create({
        productName: 'Test Shirt',
        articleCode: 'TS001',
        supplier: 'Test Supplier',
        season: 'Spring 2024',
        fabricDescription: 'Cotton',
        designer: designerUser._id,
        designerName: designerUser.fullName,
        createdBy: designerUser._id,
        createdByName: designerUser.fullName,
        updatedBy: designerUser._id,
        updatedByName: designerUser.fullName
      });
      techpackId = techpack._id.toString();
    });

    it('should update techpack successfully', async () => {
      const updateData = {
        productName: 'Updated Shirt',
        supplier: 'Updated Supplier'
      };

      const response = await request(app)
        .put(`/api/techpacks/${techpackId}`)
        .set('Authorization', `Bearer ${designerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.techpack.productName).toBe(updateData.productName);
      expect(response.body.data.techpack.supplier).toBe(updateData.supplier);
    });

    it('should create revision for significant changes', async () => {
      const updateData = {
        productName: 'Significantly Different Shirt', // Significant change
        fabricDescription: 'Completely different fabric'
      };

      const response = await request(app)
        .put(`/api/techpacks/${techpackId}`)
        .set('Authorization', `Bearer ${designerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.revisionCreated).toBe(true);
      expect(response.body.data.techpack.version).toBe('V2');
    });
  });

  describe('PATCH /api/techpacks/:id', () => {
    let techpackId: string;

    beforeEach(async () => {
      const techpack = await TechPack.create({
        productName: 'Test Shirt',
        articleCode: 'TS001',
        supplier: 'Test Supplier',
        season: 'Spring 2024',
        fabricDescription: 'Cotton',
        designer: designerUser._id,
        designerName: designerUser.fullName,
        createdBy: designerUser._id,
        createdByName: designerUser.fullName,
        updatedBy: designerUser._id,
        updatedByName: designerUser.fullName
      });
      techpackId = techpack._id.toString();
    });

    it('should patch techpack without creating revision', async () => {
      const patchData = {
        notes: 'Added some notes'
      };

      const response = await request(app)
        .patch(`/api/techpacks/${techpackId}`)
        .set('Authorization', `Bearer ${designerToken}`)
        .send(patchData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.techpack.notes).toBe(patchData.notes);
      expect(response.body.data.techpack.version).toBe('V1'); // Version unchanged
    });
  });

  describe('DELETE /api/techpacks/:id', () => {
    let techpackId: string;

    beforeEach(async () => {
      const techpack = await TechPack.create({
        productName: 'Test Shirt',
        articleCode: 'TS001',
        supplier: 'Test Supplier',
        season: 'Spring 2024',
        fabricDescription: 'Cotton',
        designer: designerUser._id,
        designerName: designerUser.fullName,
        createdBy: designerUser._id,
        createdByName: designerUser.fullName,
        updatedBy: designerUser._id,
        updatedByName: designerUser.fullName
      });
      techpackId = techpack._id.toString();
    });

    it('should soft delete techpack', async () => {
      const response = await request(app)
        .delete(`/api/techpacks/${techpackId}`)
        .set('Authorization', `Bearer ${designerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify techpack is archived
      const techpack = await TechPack.findById(techpackId);
      expect(techpack?.status).toBe('Archived');
    });
  });
});
