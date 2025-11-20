import { TechPack } from '../types/techpack';
import { formatMeasurementValue, formatTolerance } from '../components/TechPackForm/tabs/measurementHelpers';
import { DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR, DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR } from '../constants/measurementDisplay';

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
      packingNotes: this.techpack.packingNotes || '',
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

    const configuredSizes = Array.isArray(this.techpack.measurementSizeRange) && this.techpack.measurementSizeRange.length > 0
      ? [...this.techpack.measurementSizeRange]
      : [];
    const extras = sortedSizes.filter(size => !configuredSizes.includes(size));
    const sizeOrder = configuredSizes.length > 0 ? [...configuredSizes, ...extras] : sortedSizes;

    const headers = ['POM Code', 'POM Name', 'Tolerance', ...sizeOrder, 'Notes'];
    const rows = this.techpack.measurements.map(measurement => {
      const minus = typeof measurement.minusTolerance === 'number'
        ? measurement.minusTolerance
        : parseFloat(String(measurement.minusTolerance)) || 0;
      const plus = typeof measurement.plusTolerance === 'number'
        ? measurement.plusTolerance
        : parseFloat(String(measurement.plusTolerance)) || 0;
      const toleranceDisplay = Math.abs(minus - plus) < 1e-3
        ? formatTolerance(minus)
        : `-${minus.toFixed(1)}cm / +${plus.toFixed(1)}cm`;

      return [
        measurement.pomCode,
        measurement.pomName,
        toleranceDisplay,
        ...sizeOrder.map(size => {
          const value = measurement.sizes[size];
          return value === undefined || value === null ? '-' : formatMeasurementValue(value);
        }),
        measurement.notes || '',
      ];
    });

    const configuredBase = this.techpack.measurementBaseSize;
    const baseSizeColumn = configuredBase && sizeOrder.includes(configuredBase)
      ? configuredBase
      : this.techpack.measurements.find(m => m.baseSize && sizeOrder.includes(m.baseSize))?.baseSize || sizeOrder[0];
    const baseHighlightColor = DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR; // Always use default color
    const rowStripeColor = this.techpack.measurementRowStripeColor || DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR;

    return {
      headers,
      rows,
      sizes: sizeOrder,
      baseSizeColumn,
      rowBaseSizes: this.techpack.measurements.map(m => m.baseSize || null),
      sizeColumnStart: 3,
      baseHighlightColor,
      rowStripeColor,
    };
  }

  private generateColorwayTable() {
    return this.techpack.colorways.map(colorway => ({
      name: colorway.name,
      code: colorway.code,
      isDefault: colorway.isDefault,
      approvalStatus: colorway.approvalStatus,
      placement: colorway.placement,
      materialType: colorway.materialType,
      supplier: colorway.supplier,
      pantoneCode: colorway.pantoneCode,
      hexColor: colorway.hexColor,
      imageUrl: colorway.imageUrl,
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
        .measurement-table th.base-column { background-color: ${data.measurements.baseHighlightColor}; color: #0f172a; }
        .measurement-table td.base-cell { background-color: ${data.measurements.baseHighlightColor}; font-weight: 600; color: #0f172a; }
        .measurement-table tbody tr:nth-child(odd) { background-color: #ffffff; }
        .measurement-table tbody tr:nth-child(even) { background-color: ${data.measurements.rowStripeColor}; }
        .packing-content { border: 1px solid #e5e7eb; padding: 16px; border-radius: 6px; background-color: #fff; }
        .packing-content img { max-width: 100%; height: auto; }
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
        <table class="measurement-table">
            <thead>
                <tr>
                    ${data.measurements.headers.map((header: string, idx: number) => {
                      const sizeIndex = idx - data.measurements.sizeColumnStart;
                      const sizeLabel = data.measurements.sizes[sizeIndex];
                      const isBaseHeader = sizeLabel && data.measurements.baseSizeColumn === sizeLabel;
                      return `<th${isBaseHeader ? ' class="base-column"' : ''}>${header}</th>`;
                    }).join('')}
                </tr>
            </thead>
            <tbody>
                ${data.measurements.rows.map((row: string[], rowIndex: number) => `
                    <tr>
                        ${row.map((cell, cellIndex) => {
                          const sizeIndex = cellIndex - data.measurements.sizeColumnStart;
                          const sizeLabel = data.measurements.sizes[sizeIndex];
                          const rowBase = data.measurements.rowBaseSizes?.[rowIndex];
                          const isBaseCell = sizeLabel && rowBase && sizeLabel === rowBase;
                          return `<td${isBaseCell ? ' class="base-cell"' : ''}>${cell}</td>`;
                        }).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    ${data.packingNotes ? `
    <div class="section">
        <h2>Packing Instructions</h2>
        <div class="packing-content">
            ${data.packingNotes}
        </div>
    </div>
    ` : ''}

    ${data.colorways.length > 0 ? `
    <div class="section">
        <h2>Colorways</h2>
        ${data.colorways.map((colorway: any) => {
          // Resolve image URL for PDF (convert relative paths to absolute if needed)
          let imageUrl = colorway.imageUrl || '';
          if (imageUrl && imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
            // For PDF export, we need absolute URL - this will be handled by the server when generating PDF
            // For HTML preview, keep relative path
            imageUrl = imageUrl;
          }
          return `
            <div style="margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
                ${imageUrl ? `
                    <div style="width: 100%; height: 180px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #f3f4f6; margin-bottom: 15px; overflow: hidden;">
                        <img src="${imageUrl}" alt="${colorway.name}" style="width: 100%; height: 100%; object-fit: cover; object-position: center;" onerror="this.parentElement.innerHTML='<div style=\\'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 14px;\\'>No Image</div>';" />
                    </div>
                ` : `
                    <div style="width: 100%; height: 180px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #f3f4f6; margin-bottom: 15px; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 14px;">
                        No Image
                    </div>
                `}
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
        `;
        }).join('')}
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
