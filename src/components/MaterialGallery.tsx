import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, Package, Tag, FileText, Archive } from 'lucide-react';
import { BOMItem, PartClassification } from '../types';

interface MaterialGalleryProps {
  item: BOMItem;
  onClose: () => void;
}

export const MaterialGallery: React.FC<MaterialGalleryProps> = ({ item, onClose }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const getPartIcon = (part: PartClassification) => {
    switch (part) {
      case 'Fabric': return <Package className="w-5 h-5 text-blue-600" />;
      case 'Trims': return <Tag className="w-5 h-5 text-green-600" />;
      case 'Labels': return <FileText className="w-5 h-5 text-orange-600" />;
      case 'Packaging': return <Archive className="w-5 h-5 text-gray-600" />;
      default: return <Package className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPartColor = (part: PartClassification) => {
    switch (part) {
      case 'Fabric': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Trims': return 'bg-green-100 text-green-800 border-green-200';
      case 'Labels': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Packaging': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const nextImage = () => {
    if (item.images && item.images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === item.images!.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (item.images && item.images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? item.images!.length - 1 : prev - 1
      );
    }
  };

  const downloadImage = (imageUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${item.materialCode}_image_${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentImage = item.images && item.images.length > 0 ? item.images[currentImageIndex] : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {getPartIcon(item.part)}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{item.materialCode}</h2>
              <p className="text-sm text-gray-600">{item.placement} • {item.sizeSpec}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPartColor(item.part)}`}>
              {item.part}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-full">
          {/* Main Image Display */}
          <div className="flex-1 p-6">
            {currentImage ? (
              <div className="relative h-full">
                <div className={`relative h-full bg-gray-100 rounded-lg overflow-hidden ${
                  isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
                }`}>
                  <img
                    src={currentImage}
                    alt={`${item.materialCode} - Image ${currentImageIndex + 1}`}
                    className={`w-full h-full object-contain transition-transform duration-300 ${
                      isZoomed ? 'scale-150' : 'scale-100'
                    }`}
                    onClick={() => setIsZoomed(!isZoomed)}
                  />
                  
                  {/* Navigation Arrows */}
                  {item.images && item.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  {/* Zoom Indicator */}
                  <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                    {isZoomed ? 'Click to zoom out' : 'Click to zoom in'}
                  </div>

                  {/* Image Counter */}
                  {item.images && item.images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {item.images.length}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="text-center">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No images available</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar with Details and Thumbnails */}
          <div className="w-80 border-l border-gray-200 p-6 overflow-y-auto">
            {/* Material Details */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Material Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Material Code</label>
                  <p className="text-sm text-gray-900">{item.materialCode}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Placement</label>
                  <p className="text-sm text-gray-900">{item.placement}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Size Specification</label>
                  <p className="text-sm text-gray-900 font-mono">{item.sizeSpec}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Quantity</label>
                  <p className="text-sm text-gray-900">{item.quantity} {item.uom}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Supplier</label>
                  <p className="text-sm text-gray-900">{item.supplier}</p>
                </div>
                {item.color && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Color</label>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-6 h-6 rounded-full border border-gray-300"
                        style={{ backgroundColor: item.color.toLowerCase() }}
                      />
                      <span className="text-sm text-gray-900">{item.color}</span>
                    </div>
                  </div>
                )}
                {item.weight && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Weight</label>
                    <p className="text-sm text-gray-900">{item.weight}g</p>
                  </div>
                )}
                {item.cost && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Cost</label>
                    <p className="text-sm text-gray-900">${item.cost.toFixed(2)}</p>
                  </div>
                )}
                {item.leadTime && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Lead Time</label>
                    <p className="text-sm text-gray-900">{item.leadTime} days</p>
                  </div>
                )}
              </div>
            </div>

            {/* Comments */}
            {item.comments && item.comments.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Technical Comments</h3>
                <div className="space-y-2">
                  {item.comments.map((comment, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700">{comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image Thumbnails */}
            {item.images && item.images.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Images</h3>
                  <button
                    onClick={() => downloadImage(currentImage!, currentImageIndex)}
                    className="flex items-center text-sm text-teal-600 hover:text-teal-700"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {item.images.map((image, index) => (
                    <div
                      key={index}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        index === currentImageIndex 
                          ? 'border-teal-500 ring-2 ring-teal-200' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setCurrentImageIndex(index)}
                    >
                      <img
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-20 object-cover"
                      />
                      {index === currentImageIndex && (
                        <div className="absolute inset-0 bg-teal-500 bg-opacity-20 flex items-center justify-center">
                          <ZoomIn className="w-4 h-4 text-teal-600" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
