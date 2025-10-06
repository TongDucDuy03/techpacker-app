// Advanced CSS styles for PDF generation with professional WFX layout

export const getPDFStyles = (options?: {
  includeWatermark?: boolean;
  watermarkText?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
}) => {
  const {
    includeWatermark = false,
    watermarkText = 'CONFIDENTIAL',
    primaryColor = '#1e3a8a',
    secondaryColor = '#64748b',
    fontFamily = 'Arial, Helvetica, sans-serif'
  } = options || {};

  return `
    <style>
      /* Reset and base styles */
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      html, body {
        width: 100%;
        height: 100%;
        font-family: ${fontFamily};
        font-size: 11px;
        line-height: 1.4;
        color: #222;
        background: white;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      /* Page layout and breaks */
      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 15mm;
        background: white;
        position: relative;
        page-break-after: always;
        overflow: hidden;
      }
      
      .page:last-child {
        page-break-after: avoid;
      }
      
      .page-break {
        page-break-before: always;
        clear: both;
      }
      
      .avoid-break {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      .keep-together {
        page-break-inside: avoid;
        break-inside: avoid;
        display: block;
      }
      
      /* Header section */
      .header {
        border-bottom: 3px solid ${primaryColor};
        padding-bottom: 15px;
        margin-bottom: 20px;
        position: relative;
      }
      
      .header-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 15px;
        gap: 20px;
      }
      
      .logo-section {
        flex: 0 0 auto;
        max-width: 150px;
      }
      
      .logo {
        max-width: 120px;
        max-height: 60px;
        object-fit: contain;
        display: block;
      }
      
      .article-info {
        flex: 1;
        text-align: right;
        font-size: 10px;
        line-height: 1.3;
      }
      
      .article-info p {
        margin-bottom: 3px;
      }
      
      .article-info strong {
        font-weight: bold;
        color: ${primaryColor};
        display: inline-block;
        min-width: 70px;
        text-align: left;
      }
      
      .tech-pack-title {
        text-align: center;
        font-size: 20px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        margin-bottom: 8px;
        color: ${primaryColor};
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 8px;
      }
      
      .fabric-description {
        text-align: center;
        font-style: italic;
        color: ${secondaryColor};
        margin-bottom: 15px;
        font-size: 12px;
        line-height: 1.5;
      }
      
      /* Section headers */
      .section-title {
        font-size: 14px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: ${primaryColor};
        border-bottom: 2px solid ${primaryColor};
        padding-bottom: 6px;
        margin: 25px 0 15px 0;
        page-break-after: avoid;
        position: relative;
      }
      
      .section-title::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        width: 50px;
        height: 2px;
        background: ${secondaryColor};
      }
      
      /* Tables */
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        font-size: 9px;
        background: white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      
      th, td {
        border: 1px solid #d1d5db;
        padding: 8px 6px;
        text-align: left;
        vertical-align: top;
        word-wrap: break-word;
      }
      
      th {
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        font-weight: bold;
        text-transform: uppercase;
        font-size: 8px;
        letter-spacing: 0.5px;
        color: ${primaryColor};
        border-bottom: 2px solid ${primaryColor};
      }
      
      tr:nth-child(even) {
        background-color: #f9fafb;
      }
      
      tr:hover {
        background-color: #f3f4f6;
      }
      
      /* BOM Table specific styling */
      .bom-table {
        font-size: 8px;
      }
      
      .bom-table th:nth-child(1) { width: 10%; min-width: 60px; }
      .bom-table th:nth-child(2) { width: 25%; min-width: 120px; }
      .bom-table th:nth-child(3) { width: 15%; min-width: 80px; }
      .bom-table th:nth-child(4) { width: 8%; min-width: 50px; }
      .bom-table th:nth-child(5) { width: 6%; min-width: 40px; text-align: center; }
      .bom-table th:nth-child(6) { width: 6%; min-width: 40px; text-align: center; }
      .bom-table th:nth-child(7) { width: 15%; min-width: 80px; }
      .bom-table th:nth-child(8) { width: 15%; min-width: 80px; }
      
      .bom-table td:nth-child(5),
      .bom-table td:nth-child(6) {
        text-align: center;
        font-weight: bold;
      }
      
      /* Measurement Table specific styling */
      .measurement-table {
        font-size: 7px;
      }
      
      .measurement-table th:nth-child(1) { width: 8%; min-width: 50px; }
      .measurement-table th:nth-child(2) { width: 20%; min-width: 100px; }
      .measurement-table th:nth-child(3) { width: 5%; min-width: 30px; text-align: center; }
      .measurement-table th:nth-child(4) { width: 5%; min-width: 30px; text-align: center; }
      .measurement-table th:nth-child(n+5):nth-child(-2) { width: 6%; min-width: 35px; text-align: center; }
      .measurement-table th:last-child { width: 15%; min-width: 80px; }
      
      .measurement-table td:nth-child(1) {
        font-weight: bold;
        background-color: #fef3c7;
        color: #92400e;
      }
      
      .measurement-table td:nth-child(3) {
        color: #dc2626;
        text-align: center;
        font-weight: bold;
      }
      
      .measurement-table td:nth-child(4) {
        color: #16a34a;
        text-align: center;
        font-weight: bold;
      }
      
      .measurement-table td:nth-child(n+5):nth-child(-2) {
        text-align: center;
        font-weight: bold;
      }
      
      /* How to Measure section */
      .how-to-measure-item {
        display: flex;
        gap: 15px;
        margin-bottom: 25px;
        page-break-inside: avoid;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 15px;
        background: #fafafa;
      }
      
      .measure-image-container {
        flex: 0 0 180px;
      }
      
      .measure-image {
        width: 180px;
        height: 180px;
        border: 2px solid #d1d5db;
        border-radius: 6px;
        object-fit: cover;
        background: white;
      }
      
      .measure-content {
        flex: 1;
        min-width: 0;
      }
      
      .measure-content h3 {
        font-size: 13px;
        font-weight: bold;
        margin-bottom: 10px;
        color: ${primaryColor};
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 5px;
      }
      
      .measure-content p {
        font-size: 10px;
        line-height: 1.6;
        color: #374151;
        margin-bottom: 8px;
      }
      
      .measure-content ol {
        margin-left: 18px;
        margin-top: 8px;
      }
      
      .measure-content li {
        margin-bottom: 4px;
        font-size: 9px;
        line-height: 1.4;
      }
      
      /* Colorway section */
      .colorway-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      
      .colorway-item {
        border: 1px solid #d1d5db;
        border-radius: 8px;
        padding: 12px;
        background: white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        page-break-inside: avoid;
      }
      
      .colorway-swatch {
        width: 50px;
        height: 50px;
        border: 2px solid #9ca3af;
        border-radius: 6px;
        margin-bottom: 10px;
        display: block;
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
      }
      
      .colorway-info {
        font-size: 8px;
        line-height: 1.4;
      }
      
      .colorway-info p {
        margin-bottom: 3px;
      }
      
      .colorway-info strong {
        color: ${primaryColor};
        font-weight: bold;
      }
      
      /* Status badges and indicators */
      .status-badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 7px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      
      .status-approved {
        background: #dcfce7;
        color: #166534;
        border: 1px solid #bbf7d0;
      }
      
      .status-pending {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fde68a;
      }
      
      .status-critical {
        background: #fee2e2;
        color: #dc2626;
        border: 1px solid #fecaca;
      }
      
      /* Summary boxes */
      .summary-box {
        margin-top: 15px;
        padding: 12px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        font-size: 9px;
      }
      
      .summary-header {
        font-weight: bold;
        color: ${primaryColor};
        margin-bottom: 8px;
        font-size: 10px;
      }
      
      .summary-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
      }
      
      .summary-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      
      /* Footer */
      .footer {
        position: fixed;
        bottom: 8mm;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 8px;
        color: ${secondaryColor};
        border-top: 1px solid #e5e7eb;
        padding-top: 5px;
        background: white;
      }
      
      /* Watermark */
      ${includeWatermark ? `
      body::before {
        content: "${watermarkText}";
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 80px;
        font-weight: bold;
        color: rgba(0, 0, 0, 0.05);
        z-index: -1;
        pointer-events: none;
        user-select: none;
        white-space: nowrap;
      }
      ` : ''}
      
      /* Print optimizations */
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        
        .page {
          margin: 0;
          padding: 15mm;
          box-shadow: none;
        }
        
        .page-break {
          page-break-before: always;
        }
        
        .avoid-break {
          page-break-inside: avoid;
        }
        
        table {
          page-break-inside: auto;
        }
        
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        
        thead {
          display: table-header-group;
        }
        
        tfoot {
          display: table-footer-group;
        }
      }
      
      /* Responsive adjustments for different page sizes */
      @page {
        size: A4;
        margin: 0;
      }
      
      @page :first {
        margin-top: 0;
      }
      
      /* Utility classes */
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .text-left { text-align: left; }
      .font-bold { font-weight: bold; }
      .font-normal { font-weight: normal; }
      .text-primary { color: ${primaryColor}; }
      .text-secondary { color: ${secondaryColor}; }
      .bg-light { background-color: #f8fafc; }
      .border-primary { border-color: ${primaryColor}; }
      
      .mb-1 { margin-bottom: 4px; }
      .mb-2 { margin-bottom: 8px; }
      .mb-3 { margin-bottom: 12px; }
      .mb-4 { margin-bottom: 16px; }
      .mb-5 { margin-bottom: 20px; }
      
      .mt-1 { margin-top: 4px; }
      .mt-2 { margin-top: 8px; }
      .mt-3 { margin-top: 12px; }
      .mt-4 { margin-top: 16px; }
      .mt-5 { margin-top: 20px; }
      
      .p-1 { padding: 4px; }
      .p-2 { padding: 8px; }
      .p-3 { padding: 12px; }
      .p-4 { padding: 16px; }
      
      /* Animation for interactive elements (if needed) */
      .fade-in {
        animation: fadeIn 0.3s ease-in;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    </style>
  `;
};

export default getPDFStyles;
