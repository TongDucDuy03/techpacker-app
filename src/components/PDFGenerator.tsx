import React, { useState, useRef, useEffect } from 'react';
import { 
  ExportTemplate, 
  ExportJob, 
  TechPack, 
  PDFMetadata, 
  PageLayout, 
  TextStyle,
  ExportFormat,
  ExportStatus 
} from '../types';
import { 
  Download, 
  FileText, 
  Settings, 
  Play, 
  Pause, 
  Square, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  Edit,
  Save,
  Trash2,
  Copy,
  RefreshCw
} from 'lucide-react';

interface PDFGeneratorProps {
  techPack: TechPack;
  template: ExportTemplate;
  onJobCreated: (job: ExportJob) => void;
  className?: string;
}

export const PDFGenerator: React.FC<PDFGeneratorProps> = ({
  techPack,
  template,
  onJobCreated,
  className = ''
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [exportSettings, setExportSettings] = useState({
    includeImages: true,
    imageQuality: 90,
    includeComments: true,
    includeRevisions: true,
    pageRange: { start: 1, end: template.pages.length }
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewPages, setPreviewPages] = useState<string[]>([]);

  const generatePDF = async () => {
    setIsGenerating(true);
    setProgress(0);
    
    const job: ExportJob = {
      id: `job-${Date.now()}`,
      techPackId: techPack.id,
      templateId: template.id,
      format: 'PDF',
      status: 'processing',
      progress: 0,
      fileName: `${techPack.name}-TechPack.pdf`,
      createdAt: new Date(),
      createdBy: 'Current User',
      settings: exportSettings
    };

    onJobCreated(job);

    try {
      // Simulate PDF generation steps
      const steps = [
        'Initializing PDF document...',
        'Processing cover page...',
        'Generating BOM tables...',
        'Creating measurement charts...',
        'Adding construction details...',
        'Including care instructions...',
        'Optimizing images...',
        'Finalizing document...',
        'Generating navigation...',
        'Applying security settings...'
      ];

      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(steps[i]);
        setProgress((i + 1) * 10);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Update job status
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.fileSize = Math.floor(Math.random() * 5000000) + 1000000; // Random file size
      job.downloadUrl = `#download-${job.id}`;

      setCurrentStep('PDF generation completed!');
      
    } catch (error) {
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setCurrentStep('PDF generation failed!');
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePreview = async () => {
    setPreviewMode(true);
    const pages: string[] = [];
    
    for (let i = 0; i < template.pages.length; i++) {
      const pageLayout = template.pages[i];
      const canvas = canvasRef.current;
      if (!canvas) continue;

      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      // Set canvas size based on page layout
      canvas.width = pageLayout.orientation === 'portrait' ? 595 : 842; // A4 dimensions in points
      canvas.height = pageLayout.orientation === 'portrait' ? 842 : 595;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw page background
      if (pageLayout.backgroundColor) {
        ctx.fillStyle = pageLayout.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw page border
      if (pageLayout.borderColor && pageLayout.borderWidth) {
        ctx.strokeStyle = pageLayout.borderColor;
        ctx.lineWidth = pageLayout.borderWidth;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
      }

      // Draw header
      if (pageLayout.header.enabled) {
        ctx.fillStyle = pageLayout.header.style.color;
        ctx.font = `${pageLayout.header.style.fontWeight} ${pageLayout.header.style.fontSize}px ${pageLayout.header.style.fontFamily}`;
        ctx.textAlign = pageLayout.header.style.textAlign as CanvasTextAlign;
        ctx.fillText(
          pageLayout.header.content,
          pageLayout.margins.left,
          pageLayout.header.height - 10
        );
      }

      // Draw footer
      if (pageLayout.footer.enabled) {
        ctx.fillStyle = pageLayout.footer.style.color;
        ctx.font = `${pageLayout.footer.style.fontWeight} ${pageLayout.footer.style.fontSize}px ${pageLayout.footer.style.fontFamily}`;
        ctx.textAlign = pageLayout.footer.style.textAlign as CanvasTextAlign;
        ctx.fillText(
          pageLayout.footer.content,
          pageLayout.margins.left,
          canvas.height - pageLayout.margins.bottom + pageLayout.footer.style.fontSize
        );

        // Draw page number
        if (pageLayout.footer.pageNumber) {
          ctx.textAlign = 'center';
          ctx.fillText(
            `${i + 1}`,
            canvas.width / 2,
            canvas.height - pageLayout.margins.bottom + pageLayout.footer.style.fontSize
          );
        }
      }

      // Draw content based on page type
      drawPageContent(ctx, pageLayout, i);

      // Convert canvas to data URL
      pages.push(canvas.toDataURL('image/png'));
    }

    setPreviewPages(pages);
  };

  const drawPageContent = (ctx: CanvasRenderingContext2D, layout: PageLayout, pageIndex: number) => {
    const contentArea = {
      x: layout.margins.left,
      y: layout.header.enabled ? layout.header.height : layout.margins.top,
      width: layout.orientation === 'portrait' ? 595 - layout.margins.left - layout.margins.right : 842 - layout.margins.left - layout.margins.right,
      height: layout.orientation === 'portrait' ? 842 - (layout.header.enabled ? layout.header.height : layout.margins.top) - (layout.footer.enabled ? layout.footer.height : layout.margins.bottom) : 595 - (layout.header.enabled ? layout.header.height : layout.margins.top) - (layout.footer.enabled ? layout.footer.height : layout.margins.bottom)
    };

    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';

    switch (layout.type) {
      case 'cover':
        drawCoverPage(ctx, contentArea);
        break;
      case 'bom':
        drawBOMPage(ctx, contentArea);
        break;
      case 'measurements':
        drawMeasurementsPage(ctx, contentArea);
        break;
      case 'construction':
        drawConstructionPage(ctx, contentArea);
        break;
      case 'care':
        drawCarePage(ctx, contentArea);
        break;
      default:
        drawGenericPage(ctx, contentArea, layout.type);
    }
  };

  const drawCoverPage = (ctx: CanvasRenderingContext2D, area: any) => {
    // Title
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(techPack.name, area.x + area.width / 2, area.y + 50);
    
    // Subtitle
    ctx.font = '16px Arial';
    ctx.fillText(`${techPack.category} - ${techPack.season}`, area.x + area.width / 2, area.y + 80);
    
    // Brand info
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Brand: ${techPack.brand}`, area.x, area.y + 120);
    ctx.fillText(`Designer: ${techPack.designer}`, area.x, area.y + 140);
    ctx.fillText(`Status: ${techPack.status}`, area.x, area.y + 160);
    ctx.fillText(`Created: ${techPack.dateCreated.toLocaleDateString()}`, area.x, area.y + 180);
  };

  const drawBOMPage = (ctx: CanvasRenderingContext2D, area: any) => {
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Bill of Materials', area.x, area.y + 20);
    
    // Table headers
    ctx.font = 'bold 12px Arial';
    const headers = ['Material', 'Composition', 'Supplier', 'Color', 'Consumption'];
    const colWidth = area.width / headers.length;
    
    headers.forEach((header, index) => {
      ctx.fillText(header, area.x + index * colWidth, area.y + 50);
    });
    
    // Table data
    ctx.font = '12px Arial';
    techPack.materials.forEach((material, index) => {
      const y = area.y + 70 + index * 20;
      ctx.fillText(material.name, area.x, y);
      ctx.fillText(material.composition, area.x + colWidth, y);
      ctx.fillText(material.supplier, area.x + colWidth * 2, y);
      ctx.fillText(material.color, area.x + colWidth * 3, y);
      ctx.fillText(material.consumption, area.x + colWidth * 4, y);
    });
  };

  const drawMeasurementsPage = (ctx: CanvasRenderingContext2D, area: any) => {
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Measurement Chart', area.x, area.y + 20);
    
    // Size headers
    const sizes = Object.keys(techPack.measurements[0]?.sizes || {});
    const colWidth = area.width / (sizes.length + 1);
    
    ctx.font = 'bold 12px Arial';
    ctx.fillText('Measurement', area.x, area.y + 50);
    sizes.forEach((size, index) => {
      ctx.fillText(size, area.x + (index + 1) * colWidth, area.y + 50);
    });
    
    // Measurement data
    ctx.font = '12px Arial';
    techPack.measurements.forEach((measurement, index) => {
      const y = area.y + 70 + index * 20;
      ctx.fillText(measurement.point, area.x, y);
      sizes.forEach((size, sizeIndex) => {
        const value = measurement.sizes[size] || 'N/A';
        ctx.fillText(value, area.x + (sizeIndex + 1) * colWidth, y);
      });
    });
  };

  const drawConstructionPage = (ctx: CanvasRenderingContext2D, area: any) => {
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Construction Details', area.x, area.y + 20);
    
    ctx.font = '12px Arial';
    techPack.constructionDetails.forEach((detail, index) => {
      const y = area.y + 50 + index * 20;
      ctx.fillText(`• ${detail}`, area.x, y);
    });
  };

  const drawCarePage = (ctx: CanvasRenderingContext2D, area: any) => {
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Care Instructions', area.x, area.y + 20);
    
    ctx.font = '12px Arial';
    ctx.fillText('Care instructions will be included here...', area.x, area.y + 50);
  };

  const drawGenericPage = (ctx: CanvasRenderingContext2D, area: any, type: string) => {
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`${type.charAt(0).toUpperCase() + type.slice(1)} Page`, area.x, area.y + 20);
    
    ctx.font = '12px Arial';
    ctx.fillText('Content will be generated here...', area.x, area.y + 50);
  };

  const getStatusIcon = (status: ExportStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'processing': return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: ExportStatus) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  return (
    <div className={`pdf-generator ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF Generator</h3>
        <p className="text-sm text-gray-600">
          Generate professional PDF documents from your tech pack data.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Export Settings</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">Include Images</label>
                <input
                  type="checkbox"
                  checked={exportSettings.includeImages}
                  onChange={(e) => setExportSettings(prev => ({ ...prev, includeImages: e.target.checked }))}
                  className="rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Image Quality</label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={exportSettings.imageQuality}
                  onChange={(e) => setExportSettings(prev => ({ ...prev, imageQuality: Number(e.target.value) }))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{exportSettings.imageQuality}%</span>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">Include Comments</label>
                <input
                  type="checkbox"
                  checked={exportSettings.includeComments}
                  onChange={(e) => setExportSettings(prev => ({ ...prev, includeComments: e.target.checked }))}
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">Include Revisions</label>
                <input
                  type="checkbox"
                  checked={exportSettings.includeRevisions}
                  onChange={(e) => setExportSettings(prev => ({ ...prev, includeRevisions: e.target.checked }))}
                  className="rounded"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Page Range</h4>
            <div className="space-y-2">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Start Page</label>
                <input
                  type="number"
                  min="1"
                  max={template.pages.length}
                  value={exportSettings.pageRange.start}
                  onChange={(e) => setExportSettings(prev => ({ 
                    ...prev, 
                    pageRange: { ...prev.pageRange, start: Number(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">End Page</label>
                <input
                  type="number"
                  min="1"
                  max={template.pages.length}
                  value={exportSettings.pageRange.end}
                  onChange={(e) => setExportSettings(prev => ({ 
                    ...prev, 
                    pageRange: { ...prev.pageRange, end: Number(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900">Preview</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={generatePreview}
                  className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  Generate Preview
                </button>
                <button
                  onClick={generatePDF}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Generate PDF
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {isGenerating && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>{currentStep}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Preview Pages */}
            {previewMode && (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {previewPages.map((pageData, index) => (
                  <div key={index} className="border border-gray-300 rounded">
                    <div className="bg-gray-50 px-3 py-2 text-sm text-gray-600 border-b">
                      Page {index + 1}: {template.pages[index]?.name}
                    </div>
                    <img
                      src={pageData}
                      alt={`Page ${index + 1}`}
                      className="w-full h-auto"
                      style={{ maxHeight: '300px' }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Hidden canvas for preview generation */}
            <canvas
              ref={canvasRef}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Template Info */}
      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Template Information</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Template:</span>
            <span className="ml-2 font-medium">{template.name}</span>
          </div>
          <div>
            <span className="text-gray-600">Pages:</span>
            <span className="ml-2 font-medium">{template.pages.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Format:</span>
            <span className="ml-2 font-medium">PDF</span>
          </div>
          <div>
            <span className="text-gray-600">Security:</span>
            <span className="ml-2 font-medium">{template.metadata.securityLevel}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
