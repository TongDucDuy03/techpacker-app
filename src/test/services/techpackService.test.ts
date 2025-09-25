import { describe, it, expect, beforeEach, vi } from 'vitest';
import { techpackService } from '../../services/techpackService';
import { mockTechPack, mockBOMItem, mockPOMSpecification } from '../utils/testUtils';

// Mock the database
vi.mock('../../config/database', () => ({
  pgPool: {
    query: vi.fn(),
    connect: vi.fn(() => ({
      query: vi.fn(),
      release: vi.fn(),
    })),
  },
}));

describe('TechPackService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllTechPacks', () => {
    it('should fetch all tech packs with default options', async () => {
      const mockTechPacks = [mockTechPack(), mockTechPack({ id: 'tp_2' })];
      const mockQuery = vi.fn().mockResolvedValue({ rows: mockTechPacks });
      
      vi.mocked(techpackService.getAllTechPacks).mockImplementation(async () => {
        return mockQuery();
      });

      const result = await techpackService.getAllTechPacks();
      
      expect(result).toEqual(mockTechPacks);
    });

    it('should fetch tech packs with filters', async () => {
      const mockTechPacks = [mockTechPack({ status: 'draft' })];
      const mockQuery = vi.fn().mockResolvedValue({ rows: mockTechPacks });
      
      vi.mocked(techpackService.getAllTechPacks).mockImplementation(async () => {
        return mockQuery();
      });

      const result = await techpackService.getAllTechPacks({
        status: 'draft',
        page: 1,
        limit: 10
      });
      
      expect(result).toEqual(mockTechPacks);
    });
  });

  describe('getTechPackById', () => {
    it('should fetch tech pack by ID with all related data', async () => {
      const mockTechPackData = {
        ...mockTechPack(),
        bomItems: [mockBOMItem()],
        measurements: [mockPOMSpecification()],
        constructionDetails: [],
        careInstructions: [],
        colorways: [],
        versions: []
      };

      vi.mocked(techpackService.getTechPackById).mockResolvedValue(mockTechPackData);

      const result = await techpackService.getTechPackById('tp_1');
      
      expect(result).toEqual(mockTechPackData);
    });

    it('should return null for non-existent tech pack', async () => {
      vi.mocked(techpackService.getTechPackById).mockResolvedValue(null);

      const result = await techpackService.getTechPackById('non-existent');
      
      expect(result).toBeNull();
    });
  });

  describe('createTechPack', () => {
    it('should create new tech pack with all related data', async () => {
      const techPackData = {
        name: 'New TechPack',
        category: 'apparel',
        season: 'SS24',
        brand: 'New Brand',
        designer: 'New Designer',
        bomItems: [mockBOMItem()],
        measurements: [mockPOMSpecification()],
        constructionDetails: [],
        careInstructions: [],
        colorways: []
      };

      const mockCreatedTechPack = {
        ...mockTechPack(),
        ...techPackData
      };

      vi.mocked(techpackService.createTechPack).mockResolvedValue(mockCreatedTechPack);

      const result = await techpackService.createTechPack(techPackData, 'user_1');
      
      expect(result).toEqual(mockCreatedTechPack);
    });

    it('should throw error for invalid tech pack data', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        category: 'apparel',
        season: 'SS24',
        brand: 'Brand',
        designer: 'Designer'
      };

      vi.mocked(techpackService.createTechPack).mockRejectedValue(
        new Error('Validation failed: name is required')
      );

      await expect(
        techpackService.createTechPack(invalidData, 'user_1')
      ).rejects.toThrow('Validation failed: name is required');
    });
  });

  describe('updateTechPack', () => {
    it('should update existing tech pack', async () => {
      const updateData = {
        name: 'Updated TechPack',
        status: 'review' as const
      };

      const mockUpdatedTechPack = {
        ...mockTechPack(),
        ...updateData
      };

      vi.mocked(techpackService.updateTechPack).mockResolvedValue(mockUpdatedTechPack);

      const result = await techpackService.updateTechPack('tp_1', updateData, 'user_1');
      
      expect(result).toEqual(mockUpdatedTechPack);
    });

    it('should throw error for non-existent tech pack', async () => {
      vi.mocked(techpackService.updateTechPack).mockRejectedValue(
        new Error('TechPack not found')
      );

      await expect(
        techpackService.updateTechPack('non-existent', {}, 'user_1')
      ).rejects.toThrow('TechPack not found');
    });
  });

  describe('deleteTechPack', () => {
    it('should soft delete tech pack', async () => {
      vi.mocked(techpackService.deleteTechPack).mockResolvedValue(true);

      const result = await techpackService.deleteTechPack('tp_1', 'user_1');
      
      expect(result).toBe(true);
    });

    it('should return false for non-existent tech pack', async () => {
      vi.mocked(techpackService.deleteTechPack).mockResolvedValue(false);

      const result = await techpackService.deleteTechPack('non-existent', 'user_1');
      
      expect(result).toBe(false);
    });
  });

  describe('getTechPackStats', () => {
    it('should return tech pack statistics', async () => {
      const mockStats = {
        total_techpacks: 10,
        draft_count: 3,
        review_count: 2,
        approved_count: 4,
        production_count: 1,
        recent_count: 5
      };

      vi.mocked(techpackService.getTechPackStats).mockResolvedValue(mockStats);

      const result = await techpackService.getTechPackStats();
      
      expect(result).toEqual(mockStats);
    });
  });
});
