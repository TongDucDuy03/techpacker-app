const fs = require('fs');
const path = require('path');

async function main() {
  try {
    // require compiled dist service to avoid ts-node compile issues
    // Ensure you ran `npm run build` in server first
    const pdfModule = require('../dist/services/pdf.service');
    const pdfService = pdfModule.pdfService || pdfModule.default || pdfModule;

    const outDir = path.join(__dirname, '..', 'output');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const techpack = {
      _id: 'sample-1',
      productName: 'LS Cotton Blend Security Tee',
      articleCode: 'LSCOTTON-SEC-001',
      version: 'v1.0',
      technicalDesignerId: null,
      supplier: 'LS Apparel',
      season: 'SS25',
      fabricDescription: '60% Cotton / 40% Polyester - 180G',
      status: 'Design',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: 'T-Shirt',
      gender: 'Unisex',
      brand: 'SampleBrand',
      collectionName: 'Security Line',
      retailPrice: 29.99,
      currency: 'USD',
      description: 'A classic security tee with reinforced seams.',
      notes: 'Handle with care. Use pre-shrunk fabric.',
      bom: [
        { part: 'Body', materialName: 'Cotton Blend Jersey', placement: 'Main Body', size: 'One Size', quantity: 1, uom: 'pcs', supplier: 'Textile Mills', materialCode: 'MAT-001', color: 'Black', pantoneCode: 'PANT-1234', comments: 'Main fabric - top quality', unitPrice: 2.5, totalPrice: 2.5, leadTime: 14 },
        { part: 'Label', materialName: 'Woven Label', placement: 'Neck', size: 'One Size', quantity: 1, uom: 'pcs', supplier: 'Label House', materialCode: 'LBL-01', comments: 'Woven label with care symbols', unitPrice: 0.15, totalPrice: 0.15 }
      ],
      measurements: [
        { pomCode: 'POM-001', pomName: 'Chest', toleranceMinus: -1, tolerancePlus: 1, sizes: { S: 50, M: 52, L: 54, XL: 56 }, notes: 'Measure 1 cm below armhole', critical: true, measurementType: 'Garment', category: 'Body' },
        { pomCode: 'POM-002', pomName: 'Length', toleranceMinus: -1, tolerancePlus: 1, sizes: { S: 70, M: 72, L: 74, XL: 76 }, notes: 'From high point shoulder to hem', measurementType: 'Garment', category: 'Body' }
      ],
      howToMeasure: [ { pomCode: 'POM-001', pomName: 'Chest', description: 'Measure across the chest from side seam to side seam', imageUrl: '', stepNumber: 1, instructions: ['Lay garment flat', 'Measure across 1 cm below armhole'] } ],
      colorways: [ { name: 'Black', code: 'BLK', hexColor: '#000000', placement: 'All Over', materialType: 'Jersey' } ]
    };

    console.log('Requesting PDF generation (will use compiled dist service).');
    const metadata = await pdfService.getOrCreatePdf({ techpack, printedBy: 'local-user' });

    console.log('PDF generated:', metadata);
    const src = metadata.path;
    const dest = path.join(outDir, path.basename(src));
    fs.copyFileSync(src, dest);
    console.log('Copied to', dest);
    process.exit(0);
  } catch (err) {
    console.error('Error generating sample PDF:', err);
    process.exit(1);
  }
}

main();
