import React, { useState } from 'react';
import { PDFMetadata, DocumentSecurity } from '../types';
import { 
  Save, 
  Shield, 
  FileText, 
  Calendar, 
  User, 
  Tag, 
  Lock, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Info,
  Copy,
  Download
} from 'lucide-react';

interface MetadataManagerProps {
  metadata: PDFMetadata;
  onMetadataChange: (metadata: PDFMetadata) => void;
  className?: string;
}

export const MetadataManager: React.FC<MetadataManagerProps> = ({
  metadata,
  onMetadataChange,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'security' | 'signature' | 'preview'>('basic');
  const [showPassword, setShowPassword] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: FileText },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'signature', label: 'Digital Signature', icon: CheckCircle },
    { id: 'preview', label: 'Preview', icon: Eye }
  ];

  const securityLevels: { value: DocumentSecurity; label: string; description: string; icon: any }[] = [
    { 
      value: 'public', 
      label: 'Public', 
      description: 'No restrictions, can be freely shared',
      icon: Eye
    },
    { 
      value: 'internal', 
      label: 'Internal', 
      description: 'For internal use only',
      icon: Info
    },
    { 
      value: 'confidential', 
      label: 'Confidential', 
      description: 'Sensitive information, limited distribution',
      icon: Lock
    },
    { 
      value: 'restricted', 
      label: 'Restricted', 
      description: 'Highly sensitive, strict access control',
      icon: Shield
    }
  ];

  const updateMetadata = (updates: Partial<PDFMetadata>) => {
    onMetadataChange({ ...metadata, ...updates, modifiedDate: new Date() });
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !metadata.keywords.includes(newKeyword.trim())) {
      updateMetadata({ keywords: [...metadata.keywords, newKeyword.trim()] });
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    updateMetadata({ keywords: metadata.keywords.filter(k => k !== keyword) });
  };

  const generateMetadataPreview = () => {
    return {
      title: metadata.title || 'Untitled Document',
      subject: metadata.subject || 'No subject specified',
      author: metadata.author || 'Unknown Author',
      creator: metadata.creator || 'TechPacker Pro',
      producer: metadata.producer || 'TechPacker PDF Generator',
      keywords: metadata.keywords.join(', ') || 'No keywords',
      version: metadata.version || '1.0',
      createdDate: metadata.createdDate.toLocaleDateString(),
      modifiedDate: metadata.modifiedDate.toLocaleDateString(),
      securityLevel: metadata.securityLevel,
      watermark: metadata.watermark || 'None',
      digitalSignature: metadata.digitalSignature ? 'Signed' : 'Not signed'
    };
  };

  const copyMetadata = () => {
    const preview = generateMetadataPreview();
    const text = Object.entries(preview)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    navigator.clipboard.writeText(text);
  };

  const exportMetadata = () => {
    const dataStr = JSON.stringify(metadata, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'metadata.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderBasicTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Document Title *</label>
        <input
          type="text"
          value={metadata.title}
          onChange={(e) => updateMetadata({ title: e.target.value })}
          placeholder="Enter document title"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
        <input
          type="text"
          value={metadata.subject}
          onChange={(e) => updateMetadata({ subject: e.target.value })}
          placeholder="Brief description of the document"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
          <input
            type="text"
            value={metadata.author}
            onChange={(e) => updateMetadata({ author: e.target.value })}
            placeholder="Document author"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Creator</label>
          <input
            type="text"
            value={metadata.creator}
            onChange={(e) => updateMetadata({ creator: e.target.value })}
            placeholder="Application that created the document"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Producer</label>
        <input
          type="text"
          value={metadata.producer}
          onChange={(e) => updateMetadata({ producer: e.target.value })}
          placeholder="PDF producer application"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
        <input
          type="text"
          value={metadata.version}
          onChange={(e) => updateMetadata({ version: e.target.value })}
          placeholder="Document version"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
              placeholder="Add keyword"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={addKeyword}
              className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {metadata.keywords.map((keyword, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
              >
                {keyword}
                <button
                  onClick={() => removeKeyword(keyword)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Watermark</label>
        <input
          type="text"
          value={metadata.watermark || ''}
          onChange={(e) => updateMetadata({ watermark: e.target.value })}
          placeholder="Optional watermark text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Security Level</label>
        <div className="space-y-2">
          {securityLevels.map(level => {
            const Icon = level.icon;
            const isSelected = metadata.securityLevel === level.value;
            
            return (
              <button
                key={level.value}
                onClick={() => updateMetadata({ securityLevel: level.value })}
                className={`w-full p-3 border rounded-lg text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <div>
                    <div className="font-medium">{level.label}</div>
                    <div className="text-sm text-gray-600">{level.description}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Security Settings</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">Require Password</label>
            <input
              type="checkbox"
              className="rounded"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">Allow Printing</label>
            <input
              type="checkbox"
              defaultChecked
              className="rounded"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">Allow Copying</label>
            <input
              type="checkbox"
              defaultChecked
              className="rounded"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">Allow Modification</label>
            <input
              type="checkbox"
              className="rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderSignatureTab = () => (
    <div className="space-y-4">
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <h4 className="text-lg font-medium text-gray-900 mb-2">Digital Signature</h4>
        <p className="text-sm text-gray-600 mb-4">
          Add digital signature for document authentication and integrity.
        </p>
        
        {metadata.digitalSignature ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700 mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Document is signed</span>
            </div>
            <div className="text-sm text-green-600">
              <p>Signer: {metadata.digitalSignature.signer}</p>
              <p>Signed: {metadata.digitalSignature.signedAt.toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Document is not signed</span>
            </div>
            <p className="text-sm text-gray-500">
              Digital signature will be added during PDF generation.
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Signer Name</label>
        <input
          type="text"
          value={metadata.digitalSignature?.signer || ''}
          onChange={(e) => updateMetadata({ 
            digitalSignature: {
              ...metadata.digitalSignature,
              signer: e.target.value,
              signedAt: new Date(),
              certificate: 'default-cert'
            } as any
          })}
          placeholder="Enter signer name"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Certificate</label>
        <select
          value={metadata.digitalSignature?.certificate || 'default-cert'}
          onChange={(e) => updateMetadata({ 
            digitalSignature: {
              ...metadata.digitalSignature,
              certificate: e.target.value,
              signedAt: new Date()
            } as any
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="default-cert">Default Certificate</option>
          <option value="company-cert">Company Certificate</option>
          <option value="personal-cert">Personal Certificate</option>
        </select>
      </div>
    </div>
  );

  const renderPreviewTab = () => {
    const preview = generateMetadataPreview();
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">Metadata Preview</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={copyMetadata}
              className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
            <button
              onClick={exportMetadata}
              className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              <Download className="w-3 h-3" />
              Export
            </button>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="space-y-2 text-sm">
            {Object.entries(preview).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className="text-gray-900 font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <Info className="w-4 h-4" />
            <span className="font-medium">Metadata Information</span>
          </div>
          <p className="text-sm text-blue-600">
            This metadata will be embedded in the PDF document and can be viewed in PDF readers.
            It helps with document organization, search, and compliance tracking.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className={`metadata-manager ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF Metadata Manager</h3>
        <p className="text-sm text-gray-600">
          Configure document properties, security settings, and digital signatures.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-900">Metadata Settings</h4>
            </div>

            {/* Tabs */}
            <div className="mb-4">
              <div className="space-y-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            {activeTab === 'basic' && renderBasicTab()}
            {activeTab === 'security' && renderSecurityTab()}
            {activeTab === 'signature' && renderSignatureTab()}
            {activeTab === 'preview' && renderPreviewTab()}
          </div>
        </div>
      </div>
    </div>
  );
};
