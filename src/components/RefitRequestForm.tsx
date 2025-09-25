import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  AlertCircle, 
  FileText, 
  Target, 
  MessageSquare,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { RefitRequest, TechPack, RefitReason, ChangeType } from '../types';
import { useI18n } from '../lib/i18n';

interface RefitRequestFormProps {
  techPack?: TechPack;
  onSave: (request: RefitRequest) => void;
  onCancel: () => void;
}

const reasons: RefitReason[] = ['Fit Issue', 'Measurement Error', 'Material Change', 'Construction Update', 'Customer Request', 'Quality Issue', 'Other'];
const priorities = ['Low', 'Medium', 'High', 'Critical'];
const changeTypes: ChangeType[] = ['Measurement', 'Material', 'Construction', 'Color', 'Size', 'Other'];

export const RefitRequestForm: React.FC<RefitRequestFormProps> = ({ techPack, onSave, onCancel }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    reason: 'Fit Issue' as RefitReason,
    description: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
    beforeMeasurements: {} as Record<string, any>,
    afterMeasurements: {} as Record<string, any>,
    impactAnalysis: '',
    implementationNotes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'measurements' | 'analysis'>('details');

  useEffect(() => {
    if (techPack) {
      // Initialize with current tech pack measurements
      const currentMeasurements: Record<string, any> = {};
      techPack.measurements?.forEach(measurement => {
        currentMeasurements[measurement.name] = measurement.value;
      });
      setFormData(prev => ({
        ...prev,
        beforeMeasurements: currentMeasurements,
        afterMeasurements: { ...currentMeasurements }
      }));
    }
  }, [techPack]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.reason) {
      newErrors.reason = 'Reason is required';
    }

    if (!formData.priority) {
      newErrors.priority = 'Priority is required';
    }

    if (!formData.impactAnalysis.trim()) {
      newErrors.impactAnalysis = 'Impact analysis is required';
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
      const newRequest: RefitRequest = {
        id: Date.now().toString(),
        techPackId: techPack?.id || 'unknown',
        versionId: 'current',
        reason: formData.reason,
        description: formData.description,
        priority: formData.priority,
        requestedBy: 'current-user', // In real app, get from auth context
        requestedAt: new Date(),
        status: 'Open',
        beforeMeasurements: formData.beforeMeasurements,
        afterMeasurements: formData.afterMeasurements,
        impactAnalysis: formData.impactAnalysis,
        implementationNotes: formData.implementationNotes
      };

      onSave(newRequest);
    } catch (error) {
      console.error('Error saving refit request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMeasurementChange = (type: 'before' | 'after', field: string, value: any) => {
    if (type === 'before') {
      setFormData(prev => ({
        ...prev,
        beforeMeasurements: {
          ...prev.beforeMeasurements,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        afterMeasurements: {
          ...prev.afterMeasurements,
          [field]: value
        }
      }));
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getReasonIcon = (reason: RefitReason) => {
    switch (reason) {
      case 'Fit Issue': return <Target className="w-4 h-4" />;
      case 'Measurement Error': return <AlertCircle className="w-4 h-4" />;
      case 'Material Change': return <FileText className="w-4 h-4" />;
      case 'Construction Update': return <AlertTriangle className="w-4 h-4" />;
      case 'Customer Request': return <User className="w-4 h-4" />;
      case 'Quality Issue': return <CheckCircle className="w-4 h-4" />;
      case 'Other': return <Info className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const tabs = [
    { id: 'details', label: 'Request Details', icon: FileText },
    { id: 'measurements', label: 'Before/After', icon: Target },
    { id: 'analysis', label: 'Impact Analysis', icon: MessageSquare }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('refit.createRequest')}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center ${
                      isActive
                        ? 'border-teal-500 text-teal-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Reason Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Refit Reason *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {reasons.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, reason }))}
                        className={`p-4 rounded-lg border text-left transition-colors ${
                          formData.reason === reason
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {getReasonIcon(reason)}
                          <span className="text-sm font-medium">{t(`refit.reason.${reason.replace(' ', '')}`)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {errors.reason && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.reason}
                    </p>
                  )}
                </div>

                {/* Priority Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority *
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {priorities.map((priority) => (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, priority: priority as any }))}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          formData.priority === priority
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`text-sm font-medium ${getPriorityColor(priority)}`}>
                          {t(`refit.priority.${priority.toLowerCase()}`)}
                        </span>
                      </button>
                    ))}
                  </div>
                  {errors.priority && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.priority}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.description ? 'border-red-300' : 'border-gray-300'
                    }`}
                    rows={4}
                    placeholder="Describe the refit request in detail..."
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.description}
                    </p>
                  )}
                </div>

                {/* Tech Pack Info */}
                {techPack && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Related Tech Pack</h4>
                    <div className="text-sm text-gray-600">
                      <p><strong>Name:</strong> {techPack.name}</p>
                      <p><strong>Style:</strong> {techPack.style}</p>
                      <p><strong>Season:</strong> {techPack.season}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'measurements' && (
              <div className="space-y-6">
                <div className="text-center py-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('refit.beforeAfter')}</h3>
                  <p className="text-sm text-gray-600">Compare current measurements with proposed changes</p>
                </div>

                {/* Measurements Comparison Table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Measurement
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Before
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            After
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Change
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.keys({ ...formData.beforeMeasurements, ...formData.afterMeasurements }).map((field) => {
                          const beforeValue = formData.beforeMeasurements[field] || '';
                          const afterValue = formData.afterMeasurements[field] || '';
                          const hasChange = beforeValue !== afterValue;
                          
                          return (
                            <tr key={field} className={hasChange ? 'bg-yellow-50' : ''}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {field}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="text"
                                  value={beforeValue}
                                  onChange={(e) => handleMeasurementChange('before', field, e.target.value)}
                                  className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="text"
                                  value={afterValue}
                                  onChange={(e) => handleMeasurementChange('after', field, e.target.value)}
                                  className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {hasChange ? (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                                    Changed
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                                    No change
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analysis' && (
              <div className="space-y-6">
                {/* Impact Analysis */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('refit.impactAnalysis')} *
                  </label>
                  <textarea
                    value={formData.impactAnalysis}
                    onChange={(e) => setFormData(prev => ({ ...prev, impactAnalysis: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.impactAnalysis ? 'border-red-300' : 'border-gray-300'
                    }`}
                    rows={4}
                    placeholder="Analyze the impact of these changes on production, cost, timeline, etc."
                  />
                  {errors.impactAnalysis && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.impactAnalysis}
                    </p>
                  )}
                </div>

                {/* Implementation Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('refit.implementationNotes')}
                  </label>
                  <textarea
                    value={formData.implementationNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, implementationNotes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    rows={4}
                    placeholder="Add notes about how to implement these changes..."
                  />
                </div>

                {/* Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Request Summary</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><strong>Reason:</strong> {t(`refit.reason.${formData.reason.replace(' ', '')}`)}</p>
                    <p><strong>Priority:</strong> {t(`refit.priority.${formData.priority.toLowerCase()}`)}</p>
                    <p><strong>Changes:</strong> {Object.keys(formData.afterMeasurements).filter(field => 
                      formData.beforeMeasurements[field] !== formData.afterMeasurements[field]
                    ).length} measurements modified</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('grading.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Creating...' : t('grading.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
