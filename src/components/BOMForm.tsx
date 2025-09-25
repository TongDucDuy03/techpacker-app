import React, { useState, useEffect } from 'react';
import { X, Plus, Save, Upload, AlertCircle } from 'lucide-react';
import { BOMItem, PartClassification, Placement, UOM, Supplier } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface BOMFormProps {
  item?: BOMItem | null;
  suppliers: Supplier[];
  onSave: (item: Omit<BOMItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const partClassifications: PartClassification[] = ['Fabric', 'Trims', 'Labels', 'Packaging'];
const placements: Placement[] = ['Collar', 'Placket', 'Pocket', 'Sleeve', 'Body', 'Cuff', 'Hem', 'Seam', 'Buttonhole', 'Zipper', 'Other'];
const uoms: UOM[] = ['Yards', 'Meters', 'Pieces', 'Dozen', 'Rolls', 'Sheets', 'Feet', 'Inches', 'Grams', 'Kilograms'];

export const BOMForm: React.FC<BOMFormProps> = ({ item, suppliers, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    part: 'Fabric' as PartClassification,
    materialCode: '',
    placement: 'Body' as Placement,
    sizeSpec: '',
    quantity: 1,
    uom: 'Pieces' as UOM,
    supplier: '',
    comments: [''],
    images: [] as string[],
    color: '',
    weight: 0,
    cost: 0,
    leadTime: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        part: item.part,
        materialCode: item.materialCode,
        placement: item.placement,
        sizeSpec: item.sizeSpec,
        quantity: item.quantity,
        uom: item.uom,
        supplier: item.supplier,
        comments: item.comments.length > 0 ? item.comments : [''],
        images: item.images || [],
        color: item.color || '',
        weight: item.weight || 0,
        cost: item.cost || 0,
        leadTime: item.leadTime || 0
      });
    }
  }, [item]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.materialCode.trim()) {
      newErrors.materialCode = t('bom.validation.materialCodeRequired');
    }

    if (!formData.sizeSpec.trim()) {
      newErrors.sizeSpec = t('bom.validation.sizeSpecRequired');
    }

    if (formData.quantity <= 0) {
      newErrors.quantity = t('bom.validation.quantityPositive');
    }

    if (!formData.supplier.trim()) {
      newErrors.supplier = t('bom.validation.supplierRequired');
    }

    // Validate size spec format based on part type
    if (formData.part === 'Fabric' && !/^\d+[L|M|S]$/.test(formData.sizeSpec)) {
      newErrors.sizeSpec = t('bom.validation.sizeSpecFormatFabric');
    }

    if (formData.part === 'Trims' && !/^\d+\/\d+"x\d+\/\d+"$/.test(formData.sizeSpec)) {
      newErrors.sizeSpec = t('bom.validation.sizeSpecFormatTrims');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const itemData = {
        ...formData,
        comments: formData.comments.filter(comment => comment.trim() !== '')
      };
      
      onSave(itemData);
    } catch (error) {
      console.error('Error saving BOM item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentChange = (index: number, value: string) => {
    const newComments = [...formData.comments];
    newComments[index] = value;
    setFormData(prev => ({ ...prev, comments: newComments }));
  };

  const addComment = () => {
    setFormData(prev => ({ ...prev, comments: [...prev.comments, ''] }));
  };

  const removeComment = (index: number) => {
    if (formData.comments.length > 1) {
      const newComments = formData.comments.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, comments: newComments }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).map(file => URL.createObjectURL(file));
      setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
    }
  };

  const removeImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const getPartColor = (part: PartClassification) => {
    switch (part) {
      case 'Fabric': return 'bg-blue-100 text-blue-800';
      case 'Trims': return 'bg-green-100 text-green-800';
      case 'Labels': return 'bg-orange-100 text-orange-800';
      case 'Packaging': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {item ? t('bom.form.titleEdit') : t('bom.form.titleAdd')}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Part Classification */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('bom.part')} *
                </label>
                <select
                  value={formData.part}
                  onChange={(e) => setFormData(prev => ({ ...prev, part: e.target.value as PartClassification }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {partClassifications.map(part => (
                    <option key={part} value={part}>{t(`bom.parts.${part.toLowerCase()}`)}</option>
                  ))}
                </select>
                <div className={`mt-1 px-2 py-1 rounded-full text-xs font-medium inline-block ${getPartColor(formData.part)}`}>
                  {t(`bom.parts.${formData.part.toLowerCase()}`)}
                </div>
              </div>

              {/* Material Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('bom.materialCode')} *
                </label>
                <input
                  type="text"
                  value={formData.materialCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, materialCode: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    errors.materialCode ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={t('bom.placeholders.materialCode')}
                />
                {errors.materialCode && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.materialCode}
                  </p>
                )}
              </div>

              {/* Placement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('bom.placement')} *
                </label>
                <select
                  value={formData.placement}
                  onChange={(e) => setFormData(prev => ({ ...prev, placement: e.target.value as Placement }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {placements.map(placement => (
                    <option key={placement} value={placement}>{t(`bom.placements.${placement.toLowerCase()}`)}</option>
                  ))}
                </select>
              </div>

              {/* Size Specification */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('bom.sizeSpec')} *
                </label>
                <input
                  type="text"
                  value={formData.sizeSpec}
                  onChange={(e) => setFormData(prev => ({ ...prev, sizeSpec: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    errors.sizeSpec ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={formData.part === 'Fabric' ? t('bom.placeholders.sizeSpecFabric') : t('bom.placeholders.sizeSpecTrims')}
                />
                {errors.sizeSpec && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.sizeSpec}
                  </p>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('bom.quantity')} *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    errors.quantity ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.quantity && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.quantity}
                  </p>
                )}
              </div>

              {/* UOM */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('bom.uom')} *
                </label>
                <select
                  value={formData.uom}
                  onChange={(e) => setFormData(prev => ({ ...prev, uom: e.target.value as UOM }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {uoms.map(uom => (
                    <option key={uom} value={uom}>{t(`bom.uoms.${uom.toLowerCase()}`)}</option>
                  ))}
                </select>
              </div>

              {/* Supplier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('bom.supplier')} *
                </label>
                <input
                  type="text"
                  list="suppliers"
                  value={formData.supplier}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    errors.supplier ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={t('bom.placeholders.supplierInput')}
                />
                <datalist id="suppliers">
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.name} />
                  ))}
                </datalist>
                {errors.supplier && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.supplier}
                  </p>
                )}
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('bom.color')}
                </label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder={t('bom.placeholders.color')}
                />
              </div>

              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('bom.weight')} (g)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Cost */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('bom.cost')} ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Lead Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('bom.leadTime')} (days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.leadTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, leadTime: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Comments */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('bom.comments')}
              </label>
              {formData.comments.map((comment, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => handleCommentChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder={t('bom.placeholders.comment')}
                  />
                  {formData.comments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeComment(index)}
                      className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      {t('bom.actions.remove')}
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addComment}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('bom.actions.addComment')}
              </button>
            </div>

            {/* Image Upload */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('bom.images')}
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">{t('bom.imagesHint')}</p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  {t('bom.actions.chooseImages')}
                </label>
              </div>
              
              {formData.images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Material ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? t('common.loading') : (item ? t('common.update') : t('common.create'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
