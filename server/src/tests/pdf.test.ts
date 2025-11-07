import request from 'supertest';
import express from 'express';
import pdfRoutes from '../routes/pdf.routes';
import { TechPackData } from '../types/techpack.types';

// Shared mock data used across multiple test suites in this file
const mockTechPackData: TechPackData = {
  techpack: {
    _id: 'test-techpack-1',
    name: 'Test Shirt',
    articleCode: 'TS001',
    version: 'V1',
    designer: 'Test Designer',
    supplier: 'Test Supplier',
    season: 'Spring 2024',
    fabricDescription: 'Cotton blend test fabric',
    lifecycleStage: 'Development',
    createdAt: '2024-01-01',
    lastModified: '2024-01-15'
  },
  materials: [
    {
      part: 'Main Body',
      materialName: 'Cotton Fabric',
      placement: 'Body',
      size: '150cm',
      quantity: 2,
      uom: 'meters',
      supplier: 'Fabric Co'
    }
  ],
  measurements: [
    {
      pomCode: 'A',
      pomName: 'Chest Width',
      toleranceMinus: 1,
      tolerancePlus: 1,
      sizes: { S: 50, M: 53, L: 56 }
    }
  ],
  howToMeasure: [
    {
      pomCode: 'A',
      pomName: 'Chest Width',
      description: 'Measure across chest',
      imageUrl: 'https://example.com/image.jpg',
      stepNumber: 1,
      instructions: ['Step 1', 'Step 2']
    }
  ],
  colorways: [
    {
      name: 'Navy Blue',
      code: 'NV001',
      placement: 'Main',
      materialType: 'Fabric'
    }
  ]
};

const app = express();
app.use(express.json());
app.use('/api/techpacks', pdfRoutes);

describe('PDF Generator API', () => {

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/techpacks/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('PDF service is healthy');
    });
  });

  describe('GET /docs', () => {
    it('should return API documentation', async () => {
      const response = await request(app)
        .get('/api/techpacks/docs')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.examples).toBeDefined();
    });
  });

  describe('GET /:id/pdf/info', () => {
    it('should return PDF info for valid techpack', async () => {
      const response = await request(app)
        .get('/api/techpacks/sample-techpack-1/pdf/info')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.techpackId).toBe('sample-techpack-1');
      expect(response.body.data.canGeneratePDF).toBeDefined();
    });

    it('should return 404 for non-existent techpack', async () => {
      const response = await request(app)
        .get('/api/techpacks/non-existent/pdf/info')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('TechPack not found');
    });

    it('should validate techpack ID format', async () => {
      const response = await request(app)
        .get('/api/techpacks/invalid@id/pdf/info')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /:id/pdf/preview', () => {
    it('should generate PDF preview', async () => {
      const response = await request(app)
        .get('/api/techpacks/sample-techpack-1/pdf/preview?page=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.success) {
        expect(response.body.data.base64).toBeDefined();
        expect(response.body.data.filename).toBeDefined();
      }
    });

    it('should validate page parameter', async () => {
      const response = await request(app)
        .get('/api/techpacks/sample-techpack-1/pdf/preview?page=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /:id/pdf', () => {
    it('should generate PDF with default options', async () => {
      const response = await request(app)
        .post('/api/techpacks/sample-techpack-1/pdf')
        .send({})
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should generate PDF with custom options', async () => {
      const response = await request(app)
        .post('/api/techpacks/sample-techpack-1/pdf')
        .send({
          options: {
            format: 'A4',
            orientation: 'portrait',
            includeImages: true
          }
        })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
    });

    it('should validate PDF options', async () => {
      const response = await request(app)
        .post('/api/techpacks/sample-techpack-1/pdf')
        .send({
          options: {
            format: 'InvalidFormat',
            orientation: 'invalid'
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent techpack', async () => {
      const response = await request(app)
        .post('/api/techpacks/non-existent/pdf')
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /bulk/pdf', () => {
    it('should generate bulk PDFs', async () => {
      const response = await request(app)
        .post('/api/techpacks/bulk/pdf')
        .send({
          techpackIds: ['sample-techpack-1'],
          options: {
            format: 'A4'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
    });

    it('should validate techpack IDs array', async () => {
      const response = await request(app)
        .post('/api/techpacks/bulk/pdf')
        .send({
          techpackIds: []
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should limit bulk requests to 10 items', async () => {
      const techpackIds = Array.from({ length: 11 }, (_, i) => `techpack-${i}`);
      
      const response = await request(app)
        .post('/api/techpacks/bulk/pdf')
        .send({ techpackIds })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on PDF generation', async () => {
      // Make multiple requests quickly
      const requests = Array.from({ length: 12 }, () =>
        request(app)
          .post('/api/techpacks/sample-techpack-1/pdf')
          .send({})
      );

      const responses = await Promise.allSettled(requests);
      
      // Some requests should be rate limited
      const rateLimited = responses.some(result => 
        result.status === 'fulfilled' && 
        result.value.status === 429
      );
      
      expect(rateLimited).toBe(true);
    });
  });
});

describe('PDF Service Unit Tests', () => {
  describe('validateTechPackData', () => {
    it('should validate complete techpack data', () => {
      const pdfService = require('../services/pdf.service').default;
      const validation = pdfService.validateTechPackData(mockTechPackData);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject incomplete techpack data', () => {
      const pdfService = require('../services/pdf.service').default;
      const incompleteData = {
        ...mockTechPackData,
        techpack: {
          ...mockTechPackData.techpack,
          name: '' // Missing required field
        }
      };
      
      const validation = pdfService.validateTechPackData(incompleteData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('Logo Generator Tests', () => {
  const LogoGenerator = require('../utils/logo-generator').default;

  it('should generate text logo', () => {
    const logo = LogoGenerator.generateSVGLogo({
      companyName: 'Test Company',
      logoType: 'text'
    });

    expect(logo).toContain('<svg');
    expect(logo).toContain('Test Company');
  });

  it('should generate supplier-specific logo', () => {
    const logoUrl = LogoGenerator.getLogoForSupplier('LS Apparel');
    
    expect(logoUrl).toMatch(/^data:image\/svg\+xml;base64,/);
  });
});

describe('Watermark Generator Tests', () => {
  const WatermarkGenerator = require('../utils/watermark').default;

  it('should generate watermark CSS', () => {
    const css = WatermarkGenerator.generateWatermarkCSS({
      text: 'CONFIDENTIAL',
      opacity: 0.1,
      rotation: -45,
      fontSize: 60,
      color: '#ff0000',
      position: 'center'
    });

    expect(css).toContain('CONFIDENTIAL');
    expect(css).toContain('opacity: 0.1');
    expect(css).toContain('rotate(-45deg)');
  });

  it('should get predefined watermarks', () => {
    const watermarks = WatermarkGenerator.getPredefinedWatermarks();
    
    expect(watermarks.confidential).toBeDefined();
    expect(watermarks.draft).toBeDefined();
    expect(watermarks.sample).toBeDefined();
  });

  it('should generate lifecycle-based watermark', () => {
    const watermark = WatermarkGenerator.getWatermarkForLifecycleStage('Development');
    
    expect(watermark).toBeDefined();
    expect(watermark?.text).toBe('DRAFT');
  });
});
