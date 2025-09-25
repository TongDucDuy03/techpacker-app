import React, { useState, useRef, useEffect } from 'react';
import { PageLayout, TextStyle, PageOrientation } from '../types';
import { 
  Save, 
  Eye, 
  Settings, 
  Type, 
  Layout, 
  Palette, 
  Ruler, 
  Copy, 
  Trash2, 
  Plus,
  Move,
  Square,
  Circle,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline
} from 'lucide-react';

interface PageLayoutDesignerProps {
  layout: PageLayout;
  onLayoutChange: (layout: PageLayout) => void;
  className?: string;
}

export const PageLayoutDesigner: React.FC<PageLayoutDesignerProps> = ({
  layout,
  onLayoutChange,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'header' | 'footer' | 'content' | 'preview'>('general');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'header', label: 'Header', icon: Type },
    { id: 'footer', label: 'Footer', icon: Layout },
    { id: 'content', label: 'Content', icon: Square },
    { id: 'preview', label: 'Preview', icon: Eye }
  ];

  const updateLayout = (updates: Partial<PageLayout>) => {
    onLayoutChange({ ...layout, ...updates });
  };

  const updateHeader = (updates: Partial<PageLayout['header']>) => {
    updateLayout({ header: { ...layout.header, ...updates } });
  };

  const updateFooter = (updates: Partial<PageLayout['footer']>) => {
    updateLayout({ footer: { ...layout.footer, ...updates } });
  };

  const updateHeaderStyle = (updates: Partial<TextStyle>) => {
    updateHeader({ style: { ...layout.header.style, ...updates } });
  };

  const updateFooterStyle = (updates: Partial<TextStyle>) => {
    updateFooter({ style: { ...layout.footer.style, ...updates } });
  };

  const generatePreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = layout.orientation === 'portrait' ? 595 : 842;
    canvas.height = layout.orientation === 'portrait' ? 842 : 595;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    if (layout.backgroundColor) {
      ctx.fillStyle = layout.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw border
    if (layout.borderColor && layout.borderWidth) {
      ctx.strokeStyle = layout.borderColor;
      ctx.lineWidth = layout.borderWidth;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }

    // Draw margins
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(
      layout.margins.left,
      layout.margins.top,
      canvas.width - layout.margins.left - layout.margins.right,
      canvas.height - layout.margins.top - layout.margins.bottom
    );
    ctx.setLineDash([]);

    // Draw header
    if (layout.header.enabled) {
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, 0, canvas.width, layout.header.height);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = `${layout.header.style.fontWeight} ${layout.header.style.fontSize}px ${layout.header.style.fontFamily}`;
      ctx.textAlign = layout.header.style.textAlign as CanvasTextAlign;
      ctx.fillText(
        layout.header.content,
        layout.header.style.textAlign === 'center' ? canvas.width / 2 : 
        layout.header.style.textAlign === 'right' ? canvas.width - layout.margins.right : 
        layout.margins.left,
        layout.header.height - 10
      );
    }

    // Draw footer
    if (layout.footer.enabled) {
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(0, canvas.height - layout.footer.height, canvas.width, layout.footer.height);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = `${layout.footer.style.fontWeight} ${layout.footer.style.fontSize}px ${layout.footer.style.fontFamily}`;
      ctx.textAlign = layout.footer.style.textAlign as CanvasTextAlign;
      ctx.fillText(
        layout.footer.content,
        layout.footer.style.textAlign === 'center' ? canvas.width / 2 : 
        layout.footer.style.textAlign === 'right' ? canvas.width - layout.margins.right : 
        layout.margins.left,
        canvas.height - 10
      );

      // Draw page number
      if (layout.footer.pageNumber) {
        ctx.textAlign = 'center';
        ctx.fillText('1', canvas.width / 2, canvas.height - 10);
      }
    }

    // Draw content area
    const contentArea = {
      x: layout.margins.left,
      y: layout.header.enabled ? layout.header.height : layout.margins.top,
      width: canvas.width - layout.margins.left - layout.margins.right,
      height: canvas.height - (layout.header.enabled ? layout.header.height : layout.margins.top) - (layout.footer.enabled ? layout.footer.height : layout.margins.bottom)
    };

    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(contentArea.x, contentArea.y, contentArea.width, contentArea.height);

    // Draw columns
    if (layout.columns > 1) {
      const columnWidth = (contentArea.width - (layout.columns - 1) * layout.columnGap) / layout.columns;
      
      for (let i = 1; i < layout.columns; i++) {
        const x = contentArea.x + i * columnWidth + (i - 1) * layout.columnGap;
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, contentArea.y);
        ctx.lineTo(x, contentArea.y + contentArea.height);
        ctx.stroke();
      }
    }

    // Draw content preview
    ctx.fillStyle = '#374151';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Content area preview...', contentArea.x + 10, contentArea.y + 30);
  };

  useEffect(() => {
    if (activeTab === 'preview') {
      generatePreview();
    }
  }, [layout, activeTab]);

  const renderGeneralTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Layout Name</label>
        <input
          type="text"
          value={layout.name}
          onChange={(e) => updateLayout({ name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Page Type</label>
        <select
          value={layout.type}
          onChange={(e) => updateLayout({ type: e.target.value as PageLayout['type'] })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="cover">Cover Page</option>
          <option value="content">Content Page</option>
          <option value="bom">BOM Page</option>
          <option value="measurements">Measurements Page</option>
          <option value="construction">Construction Page</option>
          <option value="care">Care Instructions</option>
          <option value="appendix">Appendix</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Orientation</label>
        <div className="flex gap-2">
          <button
            onClick={() => updateLayout({ orientation: 'portrait' })}
            className={`flex-1 px-3 py-2 border rounded-md ${
              layout.orientation === 'portrait' 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            Portrait
          </button>
          <button
            onClick={() => updateLayout({ orientation: 'landscape' })}
            className={`flex-1 px-3 py-2 border rounded-md ${
              layout.orientation === 'landscape' 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            Landscape
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Margins (mm)</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Top</label>
            <input
              type="number"
              value={layout.margins.top}
              onChange={(e) => updateLayout({ 
                margins: { ...layout.margins, top: Number(e.target.value) }
              })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Right</label>
            <input
              type="number"
              value={layout.margins.right}
              onChange={(e) => updateLayout({ 
                margins: { ...layout.margins, right: Number(e.target.value) }
              })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Bottom</label>
            <input
              type="number"
              value={layout.margins.bottom}
              onChange={(e) => updateLayout({ 
                margins: { ...layout.margins, bottom: Number(e.target.value) }
              })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Left</label>
            <input
              type="number"
              value={layout.margins.left}
              onChange={(e) => updateLayout({ 
                margins: { ...layout.margins, left: Number(e.target.value) }
              })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Columns</label>
        <input
          type="number"
          min="1"
          max="3"
          value={layout.columns}
          onChange={(e) => updateLayout({ columns: Number(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Column Gap (mm)</label>
        <input
          type="number"
          value={layout.columnGap}
          onChange={(e) => updateLayout({ columnGap: Number(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
        <input
          type="color"
          value={layout.backgroundColor || '#ffffff'}
          onChange={(e) => updateLayout({ backgroundColor: e.target.value })}
          className="w-full h-10 border border-gray-300 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Border</label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={layout.borderColor || '#000000'}
              onChange={(e) => updateLayout({ borderColor: e.target.value })}
              className="w-8 h-8 border border-gray-300 rounded"
            />
            <input
              type="number"
              value={layout.borderWidth || 0}
              onChange={(e) => updateLayout({ borderWidth: Number(e.target.value) })}
              placeholder="Width"
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderHeaderTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Enable Header</label>
        <input
          type="checkbox"
          checked={layout.header.enabled}
          onChange={(e) => updateHeader({ enabled: e.target.checked })}
          className="rounded"
        />
      </div>

      {layout.header.enabled && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Header Height (mm)</label>
            <input
              type="number"
              value={layout.header.height}
              onChange={(e) => updateHeader({ height: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Header Content</label>
            <input
              type="text"
              value={layout.header.content}
              onChange={(e) => updateHeader({ content: e.target.value })}
              placeholder="e.g., Company Name, Document Title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Font Family</label>
            <select
              value={layout.header.style.fontFamily}
              onChange={(e) => updateHeaderStyle({ fontFamily: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Calibri">Calibri</option>
              <option value="Georgia">Georgia</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
              <input
                type="number"
                value={layout.header.style.fontSize}
                onChange={(e) => updateHeaderStyle({ fontSize: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Font Weight</label>
              <select
                value={layout.header.style.fontWeight}
                onChange={(e) => updateHeaderStyle({ fontWeight: e.target.value as TextStyle['fontWeight'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="lighter">Lighter</option>
                <option value="bolder">Bolder</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Text Alignment</label>
            <div className="flex gap-2">
              <button
                onClick={() => updateHeaderStyle({ textAlign: 'left' })}
                className={`p-2 border rounded ${
                  layout.header.style.textAlign === 'left' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateHeaderStyle({ textAlign: 'center' })}
                className={`p-2 border rounded ${
                  layout.header.style.textAlign === 'center' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateHeaderStyle({ textAlign: 'right' })}
                className={`p-2 border rounded ${
                  layout.header.style.textAlign === 'right' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
            <input
              type="color"
              value={layout.header.style.color}
              onChange={(e) => updateHeaderStyle({ color: e.target.value })}
              className="w-full h-10 border border-gray-300 rounded-md"
            />
          </div>
        </>
      )}
    </div>
  );

  const renderFooterTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Enable Footer</label>
        <input
          type="checkbox"
          checked={layout.footer.enabled}
          onChange={(e) => updateFooter({ enabled: e.target.checked })}
          className="rounded"
        />
      </div>

      {layout.footer.enabled && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Footer Height (mm)</label>
            <input
              type="number"
              value={layout.footer.height}
              onChange={(e) => updateFooter({ height: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Footer Content</label>
            <input
              type="text"
              value={layout.footer.content}
              onChange={(e) => updateFooter({ content: e.target.value })}
              placeholder="e.g., Confidential, Copyright"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Include Page Number</label>
            <input
              type="checkbox"
              checked={layout.footer.pageNumber}
              onChange={(e) => updateFooter({ pageNumber: e.target.checked })}
              className="rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Font Family</label>
            <select
              value={layout.footer.style.fontFamily}
              onChange={(e) => updateFooterStyle({ fontFamily: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Calibri">Calibri</option>
              <option value="Georgia">Georgia</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
              <input
                type="number"
                value={layout.footer.style.fontSize}
                onChange={(e) => updateFooterStyle({ fontSize: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Font Weight</label>
              <select
                value={layout.footer.style.fontWeight}
                onChange={(e) => updateFooterStyle({ fontWeight: e.target.value as TextStyle['fontWeight'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="lighter">Lighter</option>
                <option value="bolder">Bolder</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Text Alignment</label>
            <div className="flex gap-2">
              <button
                onClick={() => updateFooterStyle({ textAlign: 'left' })}
                className={`p-2 border rounded ${
                  layout.footer.style.textAlign === 'left' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateFooterStyle({ textAlign: 'center' })}
                className={`p-2 border rounded ${
                  layout.footer.style.textAlign === 'center' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateFooterStyle({ textAlign: 'right' })}
                className={`p-2 border rounded ${
                  layout.footer.style.textAlign === 'right' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
            <input
              type="color"
              value={layout.footer.style.color}
              onChange={(e) => updateFooterStyle({ color: e.target.value })}
              className="w-full h-10 border border-gray-300 rounded-md"
            />
          </div>
        </>
      )}
    </div>
  );

  const renderContentTab = () => (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Content Settings</h4>
        <p className="text-sm text-gray-600">
          Content-specific settings will be applied based on the page type and template.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Page Type</label>
        <div className="p-3 bg-gray-50 rounded-md">
          <span className="text-sm font-medium text-gray-900">{layout.type}</span>
          <p className="text-xs text-gray-600 mt-1">
            {layout.type === 'cover' && 'Cover page with title and summary'}
            {layout.type === 'bom' && 'Bill of Materials table layout'}
            {layout.type === 'measurements' && 'Measurement charts and size matrices'}
            {layout.type === 'construction' && 'Construction details and drawings'}
            {layout.type === 'care' && 'Care instructions and symbols'}
            {layout.type === 'appendix' && 'Technical notes and references'}
            {layout.type === 'content' && 'General content page'}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Column Layout</label>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(cols => (
            <button
              key={cols}
              onClick={() => updateLayout({ columns: cols })}
              className={`p-3 border rounded-md text-center ${
                layout.columns === cols 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-sm font-medium">{cols} Column{cols > 1 ? 's' : ''}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPreviewTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Page Preview</h4>
        <button
          onClick={generatePreview}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Preview
        </button>
      </div>

      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-auto"
          style={{ maxHeight: '600px' }}
        />
      </div>

      <div className="text-xs text-gray-500">
        <p>Preview shows the page layout with margins, headers, footers, and content areas.</p>
        <p>Actual content will be generated during PDF export.</p>
      </div>
    </div>
  );

  return (
    <div className={`page-layout-designer ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Page Layout Designer</h3>
        <p className="text-sm text-gray-600">
          Design custom page layouts for your PDF exports.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-900">Layout Settings</h4>
            </div>

            {/* Tabs */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-96">
              {activeTab === 'general' && renderGeneralTab()}
              {activeTab === 'header' && renderHeaderTab()}
              {activeTab === 'footer' && renderFooterTab()}
              {activeTab === 'content' && renderContentTab()}
              {activeTab === 'preview' && renderPreviewTab()}
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900">Live Preview</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {layout.orientation === 'portrait' ? '595 × 842px' : '842 × 595px'}
                </span>
                <button
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
                    isPreviewMode 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  {isPreviewMode ? 'Hide' : 'Show'} Preview
                </button>
              </div>
            </div>

            {isPreviewMode && (
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto mx-auto"
                  style={{ maxHeight: '600px' }}
                />
              </div>
            )}

            {!isPreviewMode && (
              <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Eye className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Click "Show Preview" to see the layout</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
