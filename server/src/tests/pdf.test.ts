import pdfService from '../services/pdf.service';
import { buildRenderModel } from '../services/pdf-renderer.service';

const baseTechpack = {
  _id: 'tp-1',
  productName: 'Security Shirt',
  articleCode: 'SEC-01',
  version: 'V1',
  season: 'Summer 2025',
  status: 'Development',
  supplier: 'LS Apparel',
  fabricDescription: 'Cotton blend poplin',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-02-01'),
  currency: 'USD',
  bom: [
    {
      part: 'Body',
      materialName: 'Main Fabric',
      placement: 'Front',
      quantity: 1.2,
      uom: 'm',
      supplier: 'Fabric Co',
      materialCode: 'FAB-001',
    },
  ],
  measurements: [
    {
      pomCode: 'A',
      pomName: 'Chest Width',
      toleranceMinus: 1,
      tolerancePlus: 1,
      sizes: { S: 52, M: 55 },
      measurementType: 'Garment',
      category: 'Body',
      critical: true,
    },
  ],
  howToMeasure: [
    {
      pomCode: 'A',
      pomName: 'Chest Width',
      description: 'Measure 2.5cm below armhole.',
      imageUrl: 'https://example.com/image.png',
      instructions: ['Lay garment flat', 'Measure across chest'],
    },
  ],
};

describe('pdfService.validate', () => {
  it('returns valid for complete techpack', async () => {
    const validation = await pdfService.validate(baseTechpack);
    expect(validation.isValid).toBe(true);
  });

  it('returns errors when BOM missing', async () => {
    const validation = await pdfService.validate({ ...baseTechpack, bom: [] });
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('At least one BOM item is required');
  });
});

describe('buildRenderModel', () => {
  it('creates summary with counts', async () => {
    const model = await buildRenderModel(baseTechpack, {
      printedBy: 'Test User',
      generatedAt: new Date(),
    });
    expect(model.summary.bomCount).toBe(1);
    expect(model.measurements.rows.length).toBeGreaterThan(0);
    expect(model.pageTitle).toContain('Security Shirt');
  });
});
