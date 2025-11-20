import fs from 'fs';
import path from 'path';
import pdfService from '../services/pdf.service';
import { TechPackData } from '../types/techpack.types';

async function main() {
  try {
    const outDir = path.join(__dirname, '..', '..', 'output');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const sample: TechPackData = {
      techpack: {
        _id: 'sample-1',
        name: 'LS Cotton Blend Security Tee',
        articleCode: 'LSCOTTON-SEC-001',
        version: 'v1.0',
        designer: 'Nguyen Van A',
        supplier: 'LS Apparel',
        season: 'SS25',
        fabricDescription: '60% Cotton / 40% Polyester - 180G',
        lifecycleStage: 'Design',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        category: 'T-Shirt',
        gender: 'Unisex',
        brand: 'SampleBrand',
        collection: 'Security Line',
        retailPrice: 29.99,
        currency: 'USD',
        description: 'A classic security tee with reinforced seams.',
        notes: 'Handle with care. Use pre-shrunk fabric.'
      },
      materials: [
        {
          part: 'Body',
          materialName: 'Cotton Blend Jersey',
          placement: 'Main Body',
          size: 'One Size',
          quantity: 1,
          uom: 'pcs',
          supplier: 'Textile Mills',
          materialCode: 'MAT-001',
          color: 'Black',
          pantoneCode: 'PANT-1234',
          comments: 'Main fabric - top quality',
          unitPrice: 2.5,
          totalPrice: 2.5,
          leadTime: 14,
          minimumOrder: 100
        },
        {
          part: 'Label',
          materialName: 'Woven Label',
          placement: 'Neck',
          size: 'One Size',
          quantity: 1,
          uom: 'pcs',
          supplier: 'Label House',
          materialCode: 'LBL-01',
          comments: 'Woven label with care symbols',
          unitPrice: 0.15,
          totalPrice: 0.15
        }
      ],
      measurements: [
        {
          pomCode: 'POM-001',
          pomName: 'Chest',
          toleranceMinus: -1,
          tolerancePlus: 1,
          sizes: { S: 50, M: 52, L: 54, XL: 56 },
          notes: 'Measure 1 cm below armhole',
          critical: true,
          measurementType: 'Garment',
          category: 'Body'
        },
        {
          pomCode: 'POM-002',
          pomName: 'Length',
          toleranceMinus: -1,
          tolerancePlus: 1,
          sizes: { S: 70, M: 72, L: 74, XL: 76 },
          notes: 'From high point shoulder to hem',
          measurementType: 'Garment',
          category: 'Body'
        }
      ],
      howToMeasure: [
        {
          pomCode: 'POM-001',
          pomName: 'Chest',
          description: 'Measure across the chest from side seam to side seam',
          imageUrl: '',
          stepNumber: 1,
          instructions: ['Lay garment flat', 'Measure across 1 cm below armhole'],
          tips: ['Ensure garment is pressed flat'],
          relatedMeasurements: ['POM-002']
        }
      ],
      colorways: [
        { name: 'Black', code: 'BLK', hexColor: '#000000', placement: 'All Over', materialType: 'Jersey' }
      ],
      logoUrl: '',
      companyLogoUrl: ''
    };

  console.log('Generating sample PDF (this may take a few seconds)...');
  // call as any to avoid type mismatch in standalone script
  const result = await (pdfService as any).generateTechPackPDF(sample as any, { format: 'A4', orientation: 'portrait' });

    if (!result.success) {
      console.error('PDF generation failed:', result.error);
      process.exit(1);
    }

    const outPath = path.join(outDir, result.data?.filename || 'sample-techpack.pdf');
    const buffer = result.data?.buffer;
    if (!buffer) {
      console.error('No buffer returned from PDF service');
      process.exit(1);
    }

    fs.writeFileSync(outPath, buffer);
    console.log('Sample PDF written to', outPath);
    process.exit(0);
  } catch (err: any) {
    console.error('Unexpected error generating sample PDF:', err);
    process.exit(1);
  }
}

main();
