import React, { useState, useRef, useEffect } from 'react';
import { LabelDesign, CareSymbol } from '../types';
import { Save, Download, Undo, Redo, Move, Type, Image, Square, Circle, Trash2, Copy, RotateCcw } from 'lucide-react';

interface LabelDesignerProps {
  design: LabelDesign;
  onDesignChange: (design: LabelDesign) => void;
  careSymbols: CareSymbol[];
  className?: string;
}

type Tool = 'select' | 'text' | 'symbol' | 'rectangle' | 'circle' | 'line';
type ElementType = 'symbol' | 'text' | 'logo' | 'barcode';

export const LabelDesigner: React.FC<LabelDesignerProps> = ({
  design,
  onDesignChange,
  careSymbols,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedTool, setSelectedTool] = useState<Tool>('select');
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<LabelDesign[]>([design]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [newText, setNewText] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<CareSymbol | null>(null);

  const canvasWidth = design.canvas.width;
  const canvasHeight = design.canvas.height;

  useEffect(() => {
    drawCanvas();
  }, [design, zoom, showGrid]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvasWidth * zoom;
    canvas.height = canvasHeight * zoom;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    if (design.canvas.backgroundColor) {
      ctx.fillStyle = design.canvas.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw border
    if (design.canvas.borderColor && design.canvas.borderWidth) {
      ctx.strokeStyle = design.canvas.borderColor;
      ctx.lineWidth = design.canvas.borderWidth * zoom;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      const gridSize = 10 * zoom;
      
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw elements
    design.elements.forEach(element => {
      drawElement(ctx, element);
    });

    // Draw selection highlight
    if (selectedElement) {
      const element = design.elements.find(el => el.id === selectedElement);
      if (element) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          element.x * zoom,
          element.y * zoom,
          element.width * zoom,
          element.height * zoom
        );
        ctx.setLineDash([]);
      }
    }
  };

  const drawElement = (ctx: CanvasRenderingContext2D, element: any) => {
    const x = element.x * zoom;
    const y = element.y * zoom;
    const width = element.width * zoom;
    const height = element.height * zoom;

    switch (element.type) {
      case 'text':
        ctx.fillStyle = element.style?.color || '#000000';
        ctx.font = `${(element.style?.fontSize || 12) * zoom}px Arial`;
        ctx.textAlign = element.style?.alignment || 'left';
        ctx.fillText(element.content, x, y + height);
        break;

      case 'symbol':
        // For symbols, we'll draw a placeholder rectangle
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(x, y, width, height);
        
        // Draw symbol name
        ctx.fillStyle = '#000000';
        ctx.font = `${8 * zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(
          typeof element.content === 'string' ? element.content : element.content.name,
          x + width / 2,
          y + height / 2
        );
        break;

      case 'rectangle':
        ctx.strokeStyle = element.style?.color || '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
        break;

      case 'circle':
        ctx.strokeStyle = element.style?.color || '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x + width / 2, y + height / 2, Math.min(width, height) / 2, 0, 2 * Math.PI);
        ctx.stroke();
        break;
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (selectedTool === 'select') {
      // Find element at click position
      const clickedElement = design.elements.find(element =>
        x >= element.x && x <= element.x + element.width &&
        y >= element.y && y <= element.y + element.height
      );

      setSelectedElement(clickedElement?.id || null);
    } else {
      // Start drawing
      setIsDrawing(true);
      setStartPos({ x, y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || selectedTool === 'select') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Update preview while drawing
    drawCanvas();
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    switch (selectedTool) {
      case 'rectangle':
        ctx.strokeRect(startPos.x * zoom, startPos.y * zoom, (x - startPos.x) * zoom, (y - startPos.y) * zoom);
        break;
      case 'circle':
        const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
        ctx.beginPath();
        ctx.arc(startPos.x * zoom, startPos.y * zoom, radius * zoom, 0, 2 * Math.PI);
        ctx.stroke();
        break;
    }
    
    ctx.setLineDash([]);
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || selectedTool === 'select') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    const newElement = {
      id: `element-${Date.now()}`,
      type: selectedTool === 'text' ? 'text' : selectedTool === 'symbol' ? 'symbol' : 'rectangle',
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y),
      content: selectedTool === 'text' ? newText : selectedTool === 'symbol' ? selectedSymbol : '',
      style: {
        fontSize: 12,
        color: '#000000',
        alignment: 'left'
      }
    };

    // Ensure minimum size
    if (newElement.width < 10) newElement.width = 10;
    if (newElement.height < 10) newElement.height = 10;

    addToHistory();
    onDesignChange({
      ...design,
      elements: [...design.elements, newElement]
    });

    setIsDrawing(false);
    setNewText('');
    setSelectedSymbol(null);
  };

  const addToHistory = () => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(design);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      onDesignChange(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      onDesignChange(history[historyIndex + 1]);
    }
  };

  const deleteSelectedElement = () => {
    if (selectedElement) {
      addToHistory();
      onDesignChange({
        ...design,
        elements: design.elements.filter(el => el.id !== selectedElement)
      });
      setSelectedElement(null);
    }
  };

  const duplicateSelectedElement = () => {
    if (selectedElement) {
      const element = design.elements.find(el => el.id === selectedElement);
      if (element) {
        addToHistory();
        const newElement = {
          ...element,
          id: `element-${Date.now()}`,
          x: element.x + 10,
          y: element.y + 10
        };
        onDesignChange({
          ...design,
          elements: [...design.elements, newElement]
        });
      }
    }
  };

  const exportDesign = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${design.name}-label.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const selectedElementData = selectedElement ? design.elements.find(el => el.id === selectedElement) : null;

  return (
    <div className={`label-designer ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Label Designer</h3>
        <p className="text-sm text-gray-600">
          Design your care label layout with symbols, text, and graphics.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tools Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Tools</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { tool: 'select', icon: Move, label: 'Select' },
                { tool: 'text', icon: Type, label: 'Text' },
                { tool: 'symbol', icon: Image, label: 'Symbol' },
                { tool: 'rectangle', icon: Square, label: 'Rectangle' },
                { tool: 'circle', icon: Circle, label: 'Circle' }
              ].map(({ tool, icon: Icon, label }) => (
                <button
                  key={tool}
                  onClick={() => setSelectedTool(tool as Tool)}
                  className={`flex flex-col items-center gap-1 p-2 rounded border transition-all ${
                    selectedTool === tool
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Actions</h4>
            <div className="space-y-2">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <Undo className="w-4 h-4" />
                Undo
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <Redo className="w-4 h-4" />
                Redo
              </button>
              <button
                onClick={deleteSelectedElement}
                disabled={!selectedElement}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={duplicateSelectedElement}
                disabled={!selectedElement}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
            </div>
          </div>

          {/* Canvas Settings */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Canvas Settings</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Zoom</label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showGrid"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="showGrid" className="text-xs text-gray-700">Show Grid</label>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-semibold text-gray-900">Canvas</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportDesign}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
            
            <div className="border border-gray-300 rounded overflow-hidden">
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                className="cursor-crosshair"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
            
            <div className="mt-2 text-xs text-gray-500">
              Canvas: {canvasWidth} × {canvasHeight}px
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        <div className="lg:col-span-1">
          {selectedElementData ? (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Properties</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <span className="text-sm text-gray-600 capitalize">{selectedElementData.type}</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={selectedElementData.x}
                      onChange={(e) => {
                        const newElements = design.elements.map(el =>
                          el.id === selectedElement ? { ...el, x: Number(e.target.value) } : el
                        );
                        onDesignChange({ ...design, elements: newElements });
                      }}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="X"
                    />
                    <input
                      type="number"
                      value={selectedElementData.y}
                      onChange={(e) => {
                        const newElements = design.elements.map(el =>
                          el.id === selectedElement ? { ...el, y: Number(e.target.value) } : el
                        );
                        onDesignChange({ ...design, elements: newElements });
                      }}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Y"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={selectedElementData.width}
                      onChange={(e) => {
                        const newElements = design.elements.map(el =>
                          el.id === selectedElement ? { ...el, width: Number(e.target.value) } : el
                        );
                        onDesignChange({ ...design, elements: newElements });
                      }}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="W"
                    />
                    <input
                      type="number"
                      value={selectedElementData.height}
                      onChange={(e) => {
                        const newElements = design.elements.map(el =>
                          el.id === selectedElement ? { ...el, height: Number(e.target.value) } : el
                        );
                        onDesignChange({ ...design, elements: newElements });
                      }}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="H"
                    />
                  </div>
                </div>
                {selectedElementData.type === 'text' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Text</label>
                    <input
                      type="text"
                      value={selectedElementData.content}
                      onChange={(e) => {
                        const newElements = design.elements.map(el =>
                          el.id === selectedElement ? { ...el, content: e.target.value } : el
                        );
                        onDesignChange({ ...design, elements: newElements });
                      }}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Properties</h4>
              <p className="text-xs text-gray-500">Select an element to edit its properties</p>
            </div>
          )}

          {/* Care Symbols */}
          {selectedTool === 'symbol' && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Care Symbols</h4>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {careSymbols.map(symbol => (
                  <button
                    key={symbol.id}
                    onClick={() => setSelectedSymbol(symbol)}
                    className={`p-2 border rounded text-center ${
                      selectedSymbol?.id === symbol.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div
                      className="w-8 h-8 mx-auto mb-1 flex items-center justify-center border border-gray-300 rounded bg-white"
                      dangerouslySetInnerHTML={{ __html: symbol.svg }}
                    />
                    <span className="text-xs text-gray-600">{symbol.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
