import React, { useState, useEffect } from 'react';
import { ComplianceInfo, ComplianceCheck, Regulation, ComplianceRegion, FlammabilityClass, ChemicalRestriction, FiberContent } from '../types';
import { CheckCircle, XCircle, AlertTriangle, Info, Download, RefreshCw, Shield, AlertCircle } from 'lucide-react';

interface ComplianceCheckerProps {
  complianceInfo: ComplianceInfo;
  onComplianceChange: (compliance: ComplianceInfo) => void;
  regions: ComplianceRegion[];
  className?: string;
}

// Mock regulations data - in real app, this would come from API
const mockRegulations: Regulation[] = [
  {
    id: 'us-care-labeling',
    name: 'US Care Labeling Rule',
    region: 'US',
    category: 'Care',
    description: 'Federal Trade Commission care labeling requirements',
    requirements: [
      'Care instructions must be provided in English',
      'Symbols must be accompanied by text instructions',
      'Fiber content must be disclosed',
      'Country of origin must be stated'
    ],
    effectiveDate: new Date('1972-01-01'),
    lastUpdated: new Date('2023-01-01'),
    source: 'FTC',
    url: 'https://www.ftc.gov/enforcement/rules/rulemaking-regulatory-reform-proceedings/care-labeling-textile-wearing-apparel'
  },
  {
    id: 'eu-textile-labeling',
    name: 'EU Textile Labeling Regulation',
    region: 'EU',
    category: 'Labeling',
    description: 'European Union textile labeling requirements',
    requirements: [
      'Fiber composition must be disclosed',
      'Care instructions must be provided',
      'Country of origin must be stated',
      'Labels must be durable and legible'
    ],
    effectiveDate: new Date('2012-05-08'),
    lastUpdated: new Date('2023-01-01'),
    source: 'EU Commission',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32012R1007'
  },
  {
    id: 'us-flammability',
    name: 'US Flammability Standards',
    region: 'US',
    category: 'Safety',
    description: 'CPSC flammability requirements for textiles',
    requirements: [
      'Children\'s sleepwear must meet flammability standards',
      'Mattress pads must meet flammability requirements',
      'Testing must be conducted by accredited laboratories'
    ],
    effectiveDate: new Date('1973-01-01'),
    lastUpdated: new Date('2023-01-01'),
    source: 'CPSC',
    url: 'https://www.cpsc.gov/Business--Manufacturing/Business-Education/Business-Guidance/Flammability'
  },
  {
    id: 'eu-chemical-restrictions',
    name: 'EU Chemical Restrictions',
    region: 'EU',
    category: 'Chemical',
    description: 'REACH chemical restrictions for textiles',
    requirements: [
      'AZO dyes must not exceed 30mg/kg',
      'Formaldehyde must not exceed 75mg/kg',
      'Lead content must not exceed 1mg/kg',
      'Phthalates restrictions apply to children\'s products'
    ],
    effectiveDate: new Date('2007-06-01'),
    lastUpdated: new Date('2023-01-01'),
    source: 'ECHA',
    url: 'https://echa.europa.eu/regulations/reach/restrictions'
  }
];

export const ComplianceChecker: React.FC<ComplianceCheckerProps> = ({
  complianceInfo,
  onComplianceChange,
  regions,
  className = ''
}) => {
  const [complianceChecks, setComplianceChecks] = useState<ComplianceCheck[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<ComplianceRegion>('US');
  const [showDetails, setShowDetails] = useState(false);

  const fiberTypes = [
    'Cotton', 'Polyester', 'Wool', 'Silk', 'Linen', 'Nylon', 'Acrylic', 'Rayon', 'Spandex', 'Bamboo', 'Hemp', 'Other'
  ];

  const chemicalRestrictions: ChemicalRestriction[] = ['AZO', 'Formaldehyde', 'Lead', 'Phthalates', 'PFAS', 'Other'];
  const flammabilityClasses: FlammabilityClass[] = ['Class 1', 'Class 2', 'Class 3', 'Not Applicable'];

  const runComplianceCheck = async () => {
    setIsChecking(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const relevantRegulations = mockRegulations.filter(reg => 
      regions.includes(reg.region) || reg.region === 'Global'
    );

    const checks: ComplianceCheck[] = [];

    // Check fiber content requirements
    const fiberContentReg = relevantRegulations.find(reg => reg.category === 'Labeling');
    if (fiberContentReg) {
      const totalPercentage = complianceInfo.fiberContent.reduce((sum, fiber) => sum + fiber.percentage, 0);
      const isValidPercentage = totalPercentage >= 95 && totalPercentage <= 100;
      
      checks.push({
        id: 'fiber-content',
        regulationId: fiberContentReg.id,
        regulationName: fiberContentReg.name,
        status: isValidPercentage ? 'Pass' : 'Fail',
        details: `Fiber content totals ${totalPercentage}%. ${isValidPercentage ? 'Meets requirements.' : 'Must total 95-100%.'}`,
        recommendations: isValidPercentage ? [] : ['Adjust fiber percentages to total 95-100%'],
        checkedAt: new Date(),
        checkedBy: 'System'
      });
    }

    // Check chemical restrictions
    const chemicalReg = relevantRegulations.find(reg => reg.category === 'Chemical');
    if (chemicalReg) {
      const hasRestrictedChemicals = complianceInfo.chemicalRestrictions.length > 0;
      checks.push({
        id: 'chemical-restrictions',
        regulationId: chemicalReg.id,
        regulationName: chemicalReg.name,
        status: hasRestrictedChemicals ? 'Warning' : 'Pass',
        details: hasRestrictedChemicals 
          ? `Contains ${complianceInfo.chemicalRestrictions.length} restricted chemicals`
          : 'No restricted chemicals declared',
        recommendations: hasRestrictedChemicals 
          ? ['Ensure chemical levels are within allowed limits', 'Obtain test certificates']
          : [],
        checkedAt: new Date(),
        checkedBy: 'System'
      });
    }

    // Check flammability requirements
    const flammabilityReg = relevantRegulations.find(reg => reg.category === 'Safety');
    if (flammabilityReg && complianceInfo.flammabilityClass) {
      const isCompliant = complianceInfo.flammabilityClass !== 'Not Applicable';
      checks.push({
        id: 'flammability',
        regulationId: flammabilityReg.id,
        regulationName: flammabilityReg.name,
        status: isCompliant ? 'Pass' : 'Not Applicable',
        details: `Flammability class: ${complianceInfo.flammabilityClass}`,
        recommendations: isCompliant ? ['Ensure proper testing documentation'] : [],
        checkedAt: new Date(),
        checkedBy: 'System'
      });
    }

    // Check country of origin
    const originReg = relevantRegulations.find(reg => reg.category === 'Labeling');
    if (originReg) {
      const hasOrigin = complianceInfo.countryOfOrigin.trim().length > 0;
      checks.push({
        id: 'country-origin',
        regulationId: originReg.id,
        regulationName: originReg.name,
        status: hasOrigin ? 'Pass' : 'Fail',
        details: hasOrigin 
          ? `Country of origin: ${complianceInfo.countryOfOrigin}`
          : 'Country of origin not specified',
        recommendations: hasOrigin ? [] : ['Specify country of origin'],
        checkedAt: new Date(),
        checkedBy: 'System'
      });
    }

    setComplianceChecks(checks);
    setIsChecking(false);
  };

  const addFiberContent = () => {
    const newFiber: FiberContent = {
      id: `fiber-${Date.now()}`,
      fiberType: 'Cotton',
      percentage: 0,
      genericName: '',
      tradeName: ''
    };
    
    onComplianceChange({
      ...complianceInfo,
      fiberContent: [...complianceInfo.fiberContent, newFiber]
    });
  };

  const updateFiberContent = (index: number, updates: Partial<FiberContent>) => {
    const newFiberContent = [...complianceInfo.fiberContent];
    newFiberContent[index] = { ...newFiberContent[index], ...updates };
    
    onComplianceChange({
      ...complianceInfo,
      fiberContent: newFiberContent
    });
  };

  const removeFiberContent = (index: number) => {
    const newFiberContent = complianceInfo.fiberContent.filter((_, i) => i !== index);
    
    onComplianceChange({
      ...complianceInfo,
      fiberContent: newFiberContent
    });
  };

  const addChemicalRestriction = (restriction: ChemicalRestriction) => {
    if (!complianceInfo.chemicalRestrictions.includes(restriction)) {
      onComplianceChange({
        ...complianceInfo,
        chemicalRestrictions: [...complianceInfo.chemicalRestrictions, restriction]
      });
    }
  };

  const removeChemicalRestriction = (restriction: ChemicalRestriction) => {
    onComplianceChange({
      ...complianceInfo,
      chemicalRestrictions: complianceInfo.chemicalRestrictions.filter(r => r !== restriction)
    });
  };

  const addTestingRequirement = (requirement: string) => {
    if (requirement.trim() && !complianceInfo.testingRequirements.includes(requirement.trim())) {
      onComplianceChange({
        ...complianceInfo,
        testingRequirements: [...complianceInfo.testingRequirements, requirement.trim()]
      });
    }
  };

  const removeTestingRequirement = (index: number) => {
    const newRequirements = complianceInfo.testingRequirements.filter((_, i) => i !== index);
    onComplianceChange({
      ...complianceInfo,
      testingRequirements: newRequirements
    });
  };

  const addCertification = (certification: string) => {
    if (certification.trim() && !complianceInfo.certifications.includes(certification.trim())) {
      onComplianceChange({
        ...complianceInfo,
        certifications: [...complianceInfo.certifications, certification.trim()]
      });
    }
  };

  const removeCertification = (index: number) => {
    const newCertifications = complianceInfo.certifications.filter((_, i) => i !== index);
    onComplianceChange({
      ...complianceInfo,
      certifications: newCertifications
    });
  };

  const getOverallStatus = (): 'Pass' | 'Fail' | 'Warning' => {
    if (complianceChecks.length === 0) return 'Pass';
    
    const hasFailures = complianceChecks.some(check => check.status === 'Fail');
    const hasWarnings = complianceChecks.some(check => check.status === 'Warning');
    
    if (hasFailures) return 'Fail';
    if (hasWarnings) return 'Warning';
    return 'Pass';
  };

  const getStatusIcon = (status: 'Pass' | 'Fail' | 'Warning' | 'Not Applicable') => {
    switch (status) {
      case 'Pass': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Fail': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'Warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'Not Applicable': return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: 'Pass' | 'Fail' | 'Warning' | 'Not Applicable') => {
    switch (status) {
      case 'Pass': return 'text-green-600 bg-green-100';
      case 'Fail': return 'text-red-600 bg-red-100';
      case 'Warning': return 'text-yellow-600 bg-yellow-100';
      case 'Not Applicable': return 'text-gray-600 bg-gray-100';
    }
  };

  const overallStatus = getOverallStatus();

  return (
    <div className={`compliance-checker ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Compliance Checker</h3>
            <p className="text-sm text-gray-600">
              Ensure your product meets regulatory requirements for target markets.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getStatusColor(overallStatus)}`}>
              <Shield className="w-5 h-5" />
              <span className="font-medium">{overallStatus}</span>
            </div>
            <button
              onClick={runComplianceCheck}
              disabled={isChecking}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {isChecking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {isChecking ? 'Checking...' : 'Check Compliance'}
            </button>
          </div>
        </div>
      </div>

      {/* Compliance Information Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Fiber Content */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Fiber Content</h4>
          <div className="space-y-3">
            {complianceInfo.fiberContent.map((fiber, index) => (
              <div key={fiber.id} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fiber Type</label>
                  <select
                    value={fiber.fiberType}
                    onChange={(e) => updateFiberContent(index, { fiberType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {fiberTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="w-20">
                  <label className="block text-sm font-medium text-gray-700 mb-1">%</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={fiber.percentage}
                    onChange={(e) => updateFiberContent(index, { percentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => removeFiberContent(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            ))}
            <button
              onClick={addFiberContent}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <CheckCircle className="w-4 h-4" />
              Add Fiber Content
            </button>
          </div>
        </div>

        {/* Country of Origin & Flammability */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Product Information</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country of Origin</label>
              <input
                type="text"
                value={complianceInfo.countryOfOrigin}
                onChange={(e) => onComplianceChange({ ...complianceInfo, countryOfOrigin: e.target.value })}
                placeholder="e.g., China, Bangladesh, USA"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Flammability Class</label>
              <select
                value={complianceInfo.flammabilityClass || 'Not Applicable'}
                onChange={(e) => onComplianceChange({ ...complianceInfo, flammabilityClass: e.target.value as FlammabilityClass })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {flammabilityClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Chemical Restrictions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Chemical Restrictions</h4>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {chemicalRestrictions.map(restriction => (
              <button
                key={restriction}
                onClick={() => {
                  if (complianceInfo.chemicalRestrictions.includes(restriction)) {
                    removeChemicalRestriction(restriction);
                  } else {
                    addChemicalRestriction(restriction);
                  }
                }}
                className={`px-3 py-2 rounded-md border transition-all ${
                  complianceInfo.chemicalRestrictions.includes(restriction)
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {restriction}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Testing Requirements & Certifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Testing Requirements</h4>
          <div className="space-y-2">
            {complianceInfo.testingRequirements.map((requirement, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600 flex-1">{requirement}</span>
                <button
                  onClick={() => removeTestingRequirement(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
            <input
              type="text"
              placeholder="Add testing requirement..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addTestingRequirement(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Certifications</h4>
          <div className="space-y-2">
            {complianceInfo.certifications.map((certification, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                <span className="text-sm text-gray-600 flex-1">{certification}</span>
                <button
                  onClick={() => removeCertification(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
            <input
              type="text"
              placeholder="Add certification..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addCertification(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Compliance Check Results */}
      {complianceChecks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Compliance Check Results</h4>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <Info className="w-4 h-4" />
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          <div className="space-y-3">
            {complianceChecks.map(check => (
              <div key={check.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                {getStatusIcon(check.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-medium text-gray-900">{check.regulationName}</h5>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(check.status)}`}>
                      {check.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{check.details}</p>
                  {showDetails && check.recommendations && check.recommendations.length > 0 && (
                    <div className="mt-2">
                      <h6 className="text-sm font-medium text-gray-700 mb-1">Recommendations:</h6>
                      <ul className="text-sm text-gray-600">
                        {check.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-1">
                            <span className="text-blue-500">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
