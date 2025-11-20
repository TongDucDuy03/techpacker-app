import React, { useState, useMemo } from 'react';
import { useTechPack } from '../../../contexts/TechPackContext';
import { HowToMeasure, MeasurementPoint } from '../../../types/techpack';
import Input from '../shared/Input';
import Select from '../shared/Select';
import Textarea from '../shared/Textarea';
import { Plus, Upload, Image, Video, Eye, Edit, Trash2, Globe } from 'lucide-react';
import ZoomableImage from '../../common/ZoomableImage';

const HowToMeasureTab: React.FC = () => {
  const context = useTechPack();
  const { state, addHowToMeasure, updateHowToMeasure, deleteHowToMeasure } = context ?? {};
  const { howToMeasures = [], measurements = [] } = state?.techpack ?? {};

  const measurementNameMap = useMemo(() => {
    return new Map((measurements as MeasurementPoint[]).map(m => [m.pomCode, m.pomName || '']));
  }, [measurements]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'en-US' | 'vi-VN' | 'zh-CN' | 'es-ES'>('en-US');
  const [previewMode, setPreviewMode] = useState(false);
  
  const [formData, setFormData] = useState<Partial<HowToMeasure>>({
    pomCode: '',
    description: '',
    imageUrl: '',
    steps: [],
    videoUrl: '',
    language: 'en-US',
    pomName: '',
    stepNumber: howToMeasures.length + 1,
    tips: [],
    commonMistakes: [],
    relatedMeasurements: [],
  });

  const [currentStep, setCurrentStep] = useState('');

  // Language options
  const languageOptions = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'vi-VN', label: 'Tiếng Việt' },
    { value: 'zh-CN', label: '中文 (简体)' },
    { value: 'es-ES', label: 'Español' },
  ];

  // Get available POM codes from measurements
  const availablePomCodes = useMemo(() => {
    return measurements.map((m: MeasurementPoint) => ({ value: m.pomCode, label: `${m.pomCode} - ${m.pomName}` }));
  }, [measurements]);

  // Filter how-to-measures by selected language
  const filteredHowToMeasures = useMemo(() => {
    return howToMeasures
      .map((htm: HowToMeasure, index: number) => ({
        ...htm,
        pomName: htm.pomName || measurementNameMap.get(htm.pomCode) || '',
        stepNumber: typeof htm.stepNumber === 'number' ? htm.stepNumber : index + 1,
        steps: htm.steps && htm.steps.length > 0 ? htm.steps : (htm.instructions || []),
      }))
      .filter((htm: HowToMeasure) => htm.language === selectedLanguage);
  }, [howToMeasures, selectedLanguage, measurementNameMap]);

  const handleInputChange = (field: keyof HowToMeasure) => (value: string | string[] | number) => {
    if (field === 'pomCode') {
      const pomName = measurementNameMap.get(String(value)) || '';
      setFormData(prev => ({
        ...prev,
        pomCode: String(value),
        pomName,
        stepNumber: prev.stepNumber ?? howToMeasures.length + 1,
      }));
      return;
    }

    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddStep = () => {
    if (currentStep.trim()) {
      const newSteps = [...(formData.steps || []), currentStep.trim()];
      setFormData(prev => ({ ...prev, steps: newSteps }));
      setCurrentStep('');
    }
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = (formData.steps || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, steps: newSteps }));
  };

  const handleEditStep = (index: number, newValue: string) => {
    const newSteps = [...(formData.steps || [])];
    newSteps[index] = newValue;
    setFormData(prev => ({ ...prev, steps: newSteps }));
  };

  const handleSubmit = () => {
    if (!formData.pomCode || !formData.description) {
      alert('Please fill in POM Code and Description');
      return;
    }

    const howToMeasure: HowToMeasure = {
      id: editingIndex !== null ? howToMeasures[editingIndex].id : `htm_${Date.now()}`,
      pomCode: formData.pomCode!,
      description: formData.description!,
      imageUrl: formData.imageUrl || '',
      steps: formData.steps || [],
      videoUrl: formData.videoUrl || '',
      language: formData.language || 'en-US',
      pomName: formData.pomName || measurementNameMap.get(formData.pomCode!) || '',
      stepNumber: typeof formData.stepNumber === 'number'
        ? formData.stepNumber
        : Number((formData as any).stepNumber) || howToMeasures.length + 1,
      instructions: formData.steps || [],
      tips: formData.tips || [],
      commonMistakes: formData.commonMistakes || [],
      relatedMeasurements: formData.relatedMeasurements || [],
    };

    if (editingIndex !== null) {
      updateHowToMeasure(editingIndex, howToMeasure);
      setEditingIndex(null);
    } else {
      addHowToMeasure(howToMeasure);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      pomCode: '',
      description: '',
      imageUrl: '',
      steps: [],
      videoUrl: '',
      language: selectedLanguage,
      pomName: '',
      stepNumber: howToMeasures.length + 1,
      tips: [],
      commonMistakes: [],
      relatedMeasurements: [],
    });
    setCurrentStep('');
    setShowAddForm(false);
    setEditingIndex(null);
  };

  const handleEdit = (howTo: HowToMeasure, index: number) => {
    setFormData({
      ...howTo,
      steps: howTo.steps && howTo.steps.length > 0 ? howTo.steps : (howTo.instructions || []),
      pomName: howTo.pomName || measurementNameMap.get(howTo.pomCode) || '',
      stepNumber: howTo.stepNumber || (index + 1),
      tips: howTo.tips || [],
      commonMistakes: howTo.commonMistakes || [],
      relatedMeasurements: howTo.relatedMeasurements || [],
    });
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleDelete = (howTo: HowToMeasure, index: number) => {
    if (window.confirm(`Are you sure you want to delete instructions for "${howTo.pomCode}"?`)) {
      deleteHowToMeasure(index);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real app, you'd upload to a server and get back a URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({ ...prev, imageUrl: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const generateSampleInstructions = (pomCode: string) => {
    const samples = {
      'CHEST': {
        description: 'Measure the chest circumference at the fullest part, typically 1 inch below the armhole. Keep the measuring tape parallel to the ground and ensure the garment is laid flat.',
        steps: [
          'Lay the garment flat on a clean, smooth surface',
          'Locate the point 1 inch below the armhole seam',
          'Place measuring tape across the chest at this point',
          'Ensure tape is parallel to the ground and not twisted',
          'Record measurement to nearest 0.1 cm'
        ]
      },
      'LENGTH': {
        description: 'Measure the total length from the highest point of the shoulder at the neck to the bottom hem of the garment.',
        steps: [
          'Lay garment flat with front facing up',
          'Locate center back neck point',
          'Place tape measure at neck point',
          'Extend tape straight down to bottom hem',
          'Record measurement to nearest 0.1 cm'
        ]
      },
      'SLEEVE': {
        description: 'Measure sleeve length from the shoulder point to the end of the cuff, following the natural curve of the sleeve.',
        steps: [
          'Lay garment flat with sleeve extended',
          'Locate shoulder point where sleeve meets body',
          'Place tape at shoulder point',
          'Follow sleeve seam to cuff end',
          'Record measurement to nearest 0.1 cm'
        ]
      }
    };

    const sample = samples[pomCode as keyof typeof samples];
    if (sample) {
      setFormData(prev => ({
        ...prev,
        description: sample.description,
        steps: sample.steps
      }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">How To Measure</h1>
            <p className="text-sm text-gray-600 mt-1">
              Detailed measurement instructions for each point
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Select
              label=""
              value={selectedLanguage}
              onChange={(value) => setSelectedLanguage(value as any)}
              options={languageOptions}
              className="min-w-40"
            />
            
            <div className="text-sm text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredHowToMeasures.length}</div>
              <div className="text-gray-500">Instructions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                previewMode
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview Mode
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Instructions
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Form Panel */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editingIndex !== null ? 'Edit Instructions' : 'Add New Instructions'}
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="POM Code"
                  value={formData.pomCode || ''}
                  onChange={handleInputChange('pomCode')}
                  options={availablePomCodes}
                  placeholder="Select measurement point..."
                  required
                />
                
                <Select
                  label="Language"
                  value={formData.language || 'en-US'}
                  onChange={handleInputChange('language')}
                  options={languageOptions}
                  required
                />
              </div>

              {formData.pomCode && (
                <button
                  onClick={() => generateSampleInstructions(formData.pomCode!)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Generate sample instructions for {formData.pomCode}
                </button>
              )}

              <Textarea
                label="Description"
                value={formData.description || ''}
                onChange={handleInputChange('description')}
                placeholder="Detailed measurement instructions..."
                required
                rows={4}
              />

              {/* Steps */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Measurement Steps
                </label>
                
                <div className="space-y-2 mb-3">
                  {(formData.steps || []).map((step, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500 min-w-6">{index + 1}.</span>
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => handleEditStep(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => handleRemoveStep(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={currentStep}
                    onChange={(e) => setCurrentStep(e.target.value)}
                    placeholder="Add a new step..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStep()}
                  />
                  <button
                    onClick={handleAddStep}
                    className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Illustration Image
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </label>
                  <Input
                    label=""
                    value={formData.imageUrl || ''}
                    onChange={handleInputChange('imageUrl')}
                    placeholder="Or paste image URL..."
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Video URL */}
              <Input
                label="Video URL (Optional)"
                value={formData.videoUrl || ''}
                onChange={handleInputChange('videoUrl')}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                {editingIndex !== null ? 'Update' : 'Add'} Instructions
              </button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Preview
            </h3>
            
            {formData.pomCode ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {formData.pomCode}
                  </h4>
                  <p className="text-sm text-gray-700">
                    {formData.description || 'No description provided'}
                  </p>
                </div>

                {formData.imageUrl && (
                  <div className="text-center">
                    <ZoomableImage
                      src={formData.imageUrl}
                      alt="Measurement illustration"
                      containerClassName="max-w-full h-48 mx-auto rounded-lg border border-gray-200 bg-white"
                      className="h-48"
                      fallback={null}
                    />
                  </div>
                )}

                {formData.steps && formData.steps.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Steps:</h5>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                      {formData.steps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {formData.videoUrl && (
                  <div className="flex items-center text-sm text-blue-600">
                    <Video className="w-4 h-4 mr-2" />
                    <a href={formData.videoUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      View instructional video
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Image className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Select a POM code to see preview</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredHowToMeasures.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Image className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No instructions available</p>
            <p className="text-sm">Add measurement instructions to help with accurate measurements.</p>
          </div>
        ) : (
          filteredHowToMeasures.map((howTo: HowToMeasure, index: number) => (
            <div key={howTo.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{howTo.pomCode}</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(howTo, index)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(howTo, index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {howTo.imageUrl && (
                  <div className="mb-3">
                    <ZoomableImage
                      src={howTo.imageUrl}
                      alt={`${howTo.pomCode} measurement`}
                      containerClassName="w-full h-32 rounded-md border border-gray-200 bg-white"
                      className="h-32"
                      fallback={
                        <div className="flex flex-col items-center justify-center text-gray-400 h-full">
                          <Image className="w-8 h-8 mb-1" />
                          <p className="text-xs">Không có ảnh</p>
                        </div>
                      }
                    />
                  </div>
                )}

                <p className="text-sm text-gray-700 mb-3 line-clamp-3">
                  {howTo.description}
                </p>

                {howTo.steps && howTo.steps.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-600 mb-1">
                      {howTo.steps.length} steps
                    </p>
                    <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1">
                      {howTo.steps.slice(0, 2).map((step: string, stepIndex: number) => (
                        <li key={stepIndex} className="line-clamp-1">{step}</li>
                      ))}
                      {howTo.steps.length > 2 && (
                        <li className="text-gray-400">... and {howTo.steps.length - 2} more</li>
                      )}
                    </ol>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center">
                    <Globe className="w-3 h-3 mr-1" />
                    {languageOptions.find(l => l.value === howTo.language)?.label}
                  </div>
                  {howTo.videoUrl && (
                    <a
                      href={howTo.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-800"
                    >
                      <Video className="w-3 h-3 mr-1" />
                      Video
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HowToMeasureTab;
