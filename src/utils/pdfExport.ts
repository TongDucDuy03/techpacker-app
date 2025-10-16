import { TechPack } from '../types/techpack';

// PDF Export utility functions
export class TechPackPDFExporter {
  private techpack: TechPack;

  constructor(techpack: TechPack) {
    this.techpack = techpack;
  }

  // Generate PDF-ready data structure
  generatePDFData() {
    return {
      header: this.generateHeader(),
      articleInfo: this.generateArticleInfo(),
      bom: this.generateBOMTable(),
      measurements: this.generateMeasurementTable(),
      colorways: this.generateColorwayTable(),
      howToMeasures: this.generateHowToMeasures(),
      footer: this.generateFooter(),
    };
  }

  private generateHeader() {
    return {
      title: 'TECH PACK SPECIFICATION',
      articleCode: this.techpack.articleInfo.articleCode,
      productName: this.techpack.articleInfo.productName,
      version: `V${this.techpack.articleInfo.version}`,
      date: new Date().toLocaleDateString(),
      status: this.techpack.status,
    };
  }

  private generateArticleInfo() {
    const { articleInfo } = this.techpack;
    return {
      basicInfo: [
        { label: 'Article Code', value: articleInfo.articleCode },
        { label: 'Product Name', value: articleInfo.productName },
        { label: 'Gender', value: articleInfo.gender },
        { label: 'Product Class', value: articleInfo.productClass },
        { label: 'Fit Type', value: articleInfo.fitType },
        { label: 'Season', value: articleInfo.season },
        { label: 'Lifecycle Stage', value: articleInfo.lifecycleStage },
      ],
      supplierInfo: [
        { label: 'Supplier', value: articleInfo.supplier },
        { label: 'Technical Designer', value: articleInfo.technicalDesignerId },
      ],
      fabricDescription: articleInfo.fabricDescription,
      notes: articleInfo.notes,
    };
  }

  private generateBOMTable() {
    return {
      headers: ['Part', 'Material Name', 'Placement', 'Quantity', 'UOM', 'Supplier', 'Comments'],
      rows: this.techpack.bom.map(item => [
        item.part,
        item.materialName,
        item.placement,
        item.quantity.toString(),
        item.uom,
        item.supplier,
        item.comments || '',
      ]),
      summary: {
        totalItems: this.techpack.bom.length,
        uniqueSuppliers: new Set(this.techpack.bom.map(item => item.supplier)).size,
      },
    };
  }

  private generateMeasurementTable() {
    if (this.techpack.measurements.length === 0) {
      return { headers: [], rows: [], sizes: [] };
    }

    // Get all unique sizes across all measurements
    const allSizes = new Set<string>();
    this.techpack.measurements.forEach(measurement => {
      Object.keys(measurement.sizes).forEach(size => allSizes.add(size));
    });
    const sortedSizes = Array.from(allSizes).sort();

    const headers = ['POM Code', 'POM Name', 'Tolerance', ...sortedSizes, 'Notes'];
    const rows = this.techpack.measurements.map(measurement => [
      measurement.pomCode,
      measurement.pomName,
      measurement.minusTolerance,
      ...sortedSizes.map(size => measurement.sizes[size]?.toFixed(1) || '-'),
      measurement.notes || '',
    ]);

    return { headers, rows, sizes: sortedSizes };
  }

  private generateColorwayTable() {
    return this.techpack.colorways.map(colorway => ({
      name: colorway.colorwayName,
      code: colorway.colorwayCode,
      isDefault: colorway.isDefault,
      approvalStatus: colorway.approvalStatus,
      parts: colorway.parts.map(part => ({
        partName: part.partName,
        colorName: part.colorName,
        pantoneCode: part.pantoneCode,
        hexCode: part.hexCode,
        colorType: part.colorType,
      })),
    }));
  }

  private generateHowToMeasures() {
    return this.techpack.howToMeasures.map(htm => ({
      pomCode: htm.pomCode,
      description: htm.description,
      steps: htm.steps || [],
      imageUrl: htm.imageUrl,
      language: htm.language,
    }));
  }

  private generateFooter() {
    return {
      generatedAt: new Date().toISOString(),
      generatedBy: 'TechPack Management System',
      version: '1.0',
      totalPages: 'TBD', // Will be calculated during PDF generation
    };
  }

  // Export to different formats
  async exportToPDF(): Promise<Blob> {
    // This would integrate with a PDF library like jsPDF or PDFKit
    // For now, return a mock implementation
    const pdfData = this.generatePDFData();
    
    try {
      // Mock PDF generation - in real implementation, use jsPDF or similar
      const mockPDFContent = this.generateMockPDF(pdfData);
      return new Blob([mockPDFContent], { type: 'application/pdf' });
    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  async exportToHTML(): Promise<string> {
    const pdfData = this.generatePDFData();
    return this.generateHTMLTemplate(pdfData);
  }

  private generateMockPDF(data: any): string {
    // Mock PDF content - in real implementation, this would use a PDF library
    return `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(${data.header.title}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
300
%%EOF`;
  }

  private generateHTMLTemplate(data: any): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.header.title} - ${data.header.articleCode}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .colorway-part { display: inline-block; margin: 5px; padding: 5px 10px; border-radius: 4px; background-color: #f0f0f0; }
        @media print { body { margin: 0; } .no-print { display: none; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>${data.header.title}</h1>
        <h2>${data.header.productName}</h2>
        <p><strong>Article Code:</strong> ${data.header.articleCode} | <strong>Version:</strong> ${data.header.version} | <strong>Date:</strong> ${data.header.date}</p>
    </div>

    <div class="section">
        <h2>Article Information</h2>
        <table>
            ${data.articleInfo.basicInfo.map((item: any) => `
                <tr><td><strong>${item.label}</strong></td><td>${item.value}</td></tr>
            `).join('')}
        </table>
        ${data.articleInfo.fabricDescription ? `
            <h3>Fabric Description</h3>
            <p>${data.articleInfo.fabricDescription}</p>
        ` : ''}
    </div>

    <div class="section">
        <h2>Bill of Materials</h2>
        <table>
            <thead>
                <tr>${data.bom.headers.map((header: string) => `<th>${header}</th>`).join('')}</tr>
            </thead>
            <tbody>
                ${data.bom.rows.map((row: string[]) => `
                    <tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>
                `).join('')}
            </tbody>
        </table>
        <p><strong>Summary:</strong> ${data.bom.summary.totalItems} items from ${data.bom.summary.uniqueSuppliers} suppliers</p>
    </div>

    ${data.measurements.headers.length > 0 ? `
    <div class="section">
        <h2>Measurement Chart</h2>
        <table>
            <thead>
                <tr>${data.measurements.headers.map((header: string) => `<th>${header}</th>`).join('')}</tr>
            </thead>
            <tbody>
                ${data.measurements.rows.map((row: string[]) => `
                    <tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    ${data.colorways.length > 0 ? `
    <div class="section">
        <h2>Colorways</h2>
        ${data.colorways.map((colorway: any) => `
            <div style="margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
                <h3>${colorway.name} (${colorway.code}) ${colorway.isDefault ? '- DEFAULT' : ''}</h3>
                <p><strong>Status:</strong> ${colorway.approvalStatus}</p>
                <div>
                    ${colorway.parts.map((part: any) => `
                        <div class="colorway-part">
                            <strong>${part.partName}:</strong> ${part.colorName}
                            ${part.pantoneCode ? `<br><small>Pantone: ${part.pantoneCode}</small>` : ''}
                            ${part.hexCode ? `<span style="display: inline-block; width: 20px; height: 20px; background-color: ${part.hexCode}; border: 1px solid #ccc; margin-left: 5px; vertical-align: middle;"></span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="section no-print">
        <p><em>Generated on ${data.footer.generatedAt} by ${data.footer.generatedBy}</em></p>
    </div>
</body>
</html>`;
  }
}

// Utility functions for PDF export
export const exportTechPackToPDF = async (techpack: TechPack): Promise<void> => {
  const exporter = new TechPackPDFExporter(techpack);
  
  try {
    const htmlContent = await exporter.exportToHTML();
    
    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Trigger print dialog after content loads
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  } catch (error) {
    console.error('Export failed:', error);
    alert('Failed to export tech pack. Please try again.');
  }
};

export const downloadTechPackAsHTML = async (techpack: TechPack): Promise<void> => {
  const exporter = new TechPackPDFExporter(techpack);
  
  try {
    const htmlContent = await exporter.exportToHTML();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${techpack.articleInfo.articleCode || 'techpack'}_v${techpack.articleInfo.version}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
    alert('Failed to download tech pack. Please try again.');
  }
};

export default TechPackPDFExporter;
