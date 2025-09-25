import React, { useState, useEffect, useMemo } from 'react';
import { Regulation, ComplianceRegion } from '../types';
import { Search, Filter, Calendar, ExternalLink, Download, RefreshCw, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface RegulationDatabaseProps {
  className?: string;
}

// Mock regulations data - in real app, this would come from API
const mockRegulations: Regulation[] = [
  {
    id: 'us-care-labeling',
    name: 'US Care Labeling Rule',
    region: 'US',
    category: 'Care',
    description: 'Federal Trade Commission care labeling requirements for textile products',
    requirements: [
      'Care instructions must be provided in English',
      'Symbols must be accompanied by text instructions',
      'Fiber content must be disclosed',
      'Country of origin must be stated',
      'Labels must be permanent and legible'
    ],
    effectiveDate: new Date('1972-01-01'),
    lastUpdated: new Date('2023-01-01'),
    source: 'Federal Trade Commission',
    url: 'https://www.ftc.gov/enforcement/rules/rulemaking-regulatory-reform-proceedings/care-labeling-textile-wearing-apparel'
  },
  {
    id: 'eu-textile-labeling',
    name: 'EU Textile Labeling Regulation',
    region: 'EU',
    category: 'Labeling',
    description: 'European Union regulation on textile fiber names and related labeling',
    requirements: [
      'Fiber composition must be disclosed',
      'Care instructions must be provided',
      'Country of origin must be stated',
      'Labels must be durable and legible',
      'Fiber names must follow EU standards'
    ],
    effectiveDate: new Date('2012-05-08'),
    lastUpdated: new Date('2023-01-01'),
    source: 'European Commission',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32012R1007'
  },
  {
    id: 'us-flammability',
    name: 'US Flammability Standards',
    region: 'US',
    category: 'Safety',
    description: 'CPSC flammability requirements for textiles and wearing apparel',
    requirements: [
      'Children\'s sleepwear must meet flammability standards',
      'Mattress pads must meet flammability requirements',
      'Testing must be conducted by accredited laboratories',
      'Products must be labeled with flammability warnings',
      'Compliance testing required before sale'
    ],
    effectiveDate: new Date('1973-01-01'),
    lastUpdated: new Date('2023-01-01'),
    source: 'Consumer Product Safety Commission',
    url: 'https://www.cpsc.gov/Business--Manufacturing/Business-Education/Business-Guidance/Flammability'
  },
  {
    id: 'eu-chemical-restrictions',
    name: 'EU Chemical Restrictions (REACH)',
    region: 'EU',
    category: 'Chemical',
    description: 'REACH regulation chemical restrictions for textiles',
    requirements: [
      'AZO dyes must not exceed 30mg/kg',
      'Formaldehyde must not exceed 75mg/kg',
      'Lead content must not exceed 1mg/kg',
      'Phthalates restrictions apply to children\'s products',
      'PFAS chemicals restricted in certain applications'
    ],
    effectiveDate: new Date('2007-06-01'),
    lastUpdated: new Date('2023-01-01'),
    source: 'European Chemicals Agency',
    url: 'https://echa.europa.eu/regulations/reach/restrictions'
  },
  {
    id: 'uk-textile-labeling',
    name: 'UK Textile Labeling Requirements',
    region: 'UK',
    category: 'Labeling',
    description: 'UK-specific textile labeling requirements post-Brexit',
    requirements: [
      'Fiber composition must be disclosed',
      'Care instructions must be provided',
      'Country of origin must be stated',
      'Labels must be in English',
      'UKCA marking may be required'
    ],
    effectiveDate: new Date('2021-01-01'),
    lastUpdated: new Date('2023-01-01'),
    source: 'UK Government',
    url: 'https://www.gov.uk/guidance/textile-labelling'
  },
  {
    id: 'canada-textile-labeling',
    name: 'Canada Textile Labeling Act',
    region: 'CA',
    category: 'Labeling',
    description: 'Canadian textile labeling and advertising regulations',
    requirements: [
      'Fiber content must be disclosed',
      'Care instructions must be provided',
      'Country of origin must be stated',
      'Labels must be in English and French',
      'Dealer identification required'
    ],
    effectiveDate: new Date('1971-01-01'),
    lastUpdated: new Date('2023-01-01'),
    source: 'Competition Bureau Canada',
    url: 'https://www.competitionbureau.gc.ca/eic/site/cb-bc.nsf/eng/04320.html'
  },
  {
    id: 'australia-textile-labeling',
    name: 'Australia Textile Labeling Standards',
    region: 'AU',
    category: 'Labeling',
    description: 'Australian consumer law textile labeling requirements',
    requirements: [
      'Fiber content must be disclosed',
      'Care instructions must be provided',
      'Country of origin must be stated',
      'Labels must be permanent and legible',
      'Compliance with Australian standards required'
    ],
    effectiveDate: new Date('2011-01-01'),
    lastUpdated: new Date('2023-01-01'),
    source: 'Australian Competition and Consumer Commission',
    url: 'https://www.accc.gov.au/business/business-rights-protections/textile-labelling'
  },
  {
    id: 'japan-textile-labeling',
    name: 'Japan Textile Labeling Standards',
    region: 'JP',
    category: 'Labeling',
    description: 'Japanese Industrial Standards for textile labeling',
    requirements: [
      'Fiber content must be disclosed',
      'Care instructions must be provided',
      'Country of origin must be stated',
      'Labels must be in Japanese',
      'JIS standards compliance required'
    ],
    effectiveDate: new Date('2000-01-01'),
    lastUpdated: new Date('2023-01-01'),
    source: 'Japanese Standards Association',
    url: 'https://www.jsa.or.jp/en/'
  },
  {
    id: 'china-textile-labeling',
    name: 'China Textile Labeling Requirements',
    region: 'CN',
    category: 'Labeling',
    description: 'Chinese national standards for textile labeling',
    requirements: [
      'Fiber content must be disclosed',
      'Care instructions must be provided',
      'Country of origin must be stated',
      'Labels must be in Chinese',
      'GB standards compliance required'
    ],
    effectiveDate: new Date('2008-01-01'),
    lastUpdated: new Date('2023-01-01'),
    source: 'Standardization Administration of China',
    url: 'http://www.sac.gov.cn/'
  }
];

const categoryColors = {
  Care: 'bg-blue-100 text-blue-800',
  Labeling: 'bg-green-100 text-green-800',
  Safety: 'bg-red-100 text-red-800',
  Chemical: 'bg-yellow-100 text-yellow-800',
  Testing: 'bg-purple-100 text-purple-800'
};

const regionFlags: Record<ComplianceRegion, string> = {
  US: '🇺🇸',
  EU: '🇪🇺',
  UK: '🇬🇧',
  CA: '🇨🇦',
  AU: '🇦🇺',
  JP: '🇯🇵',
  CN: '🇨🇳',
  Global: '🌍'
};

export const RegulationDatabase: React.FC<RegulationDatabaseProps> = ({
  className = ''
}) => {
  const [regulations, setRegulations] = useState<Regulation[]>(mockRegulations);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<ComplianceRegion | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'region'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isUpdating, setIsUpdating] = useState(false);

  const categories = ['Care', 'Labeling', 'Safety', 'Chemical', 'Testing'];
  const regions: ComplianceRegion[] = ['US', 'EU', 'UK', 'CA', 'AU', 'JP', 'CN', 'Global'];

  const filteredRegulations = useMemo(() => {
    let filtered = regulations;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(regulation =>
        regulation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        regulation.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        regulation.source.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by region
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(regulation => regulation.region === selectedRegion);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(regulation => regulation.category === selectedCategory);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = a.effectiveDate.getTime() - b.effectiveDate.getTime();
          break;
        case 'region':
          comparison = a.region.localeCompare(b.region);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [regulations, searchTerm, selectedRegion, selectedCategory, sortBy, sortOrder]);

  const updateRegulations = async () => {
    setIsUpdating(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In real app, fetch updated regulations from API
    setRegulations([...mockRegulations]);
    setIsUpdating(false);
  };

  const exportRegulations = () => {
    const dataStr = JSON.stringify(filteredRegulations, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'regulations.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (regulation: Regulation) => {
    const now = new Date();
    const isActive = regulation.effectiveDate <= now && (!regulation.expiryDate || regulation.expiryDate >= now);
    
    if (isActive) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (regulation.expiryDate && regulation.expiryDate < now) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    } else {
      return <Calendar className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusText = (regulation: Regulation) => {
    const now = new Date();
    const isActive = regulation.effectiveDate <= now && (!regulation.expiryDate || regulation.expiryDate >= now);
    
    if (isActive) {
      return 'Active';
    } else if (regulation.expiryDate && regulation.expiryDate < now) {
      return 'Expired';
    } else {
      return 'Future';
    }
  };

  return (
    <div className={`regulation-database ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Regulation Database</h3>
            <p className="text-sm text-gray-600">
              Access up-to-date textile regulations and compliance requirements from around the world.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={updateRegulations}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {isUpdating ? 'Updating...' : 'Update'}
            </button>
            <button
              onClick={exportRegulations}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search regulations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Region Filter */}
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value as ComplianceRegion | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Regions</option>
            {regions.map(region => (
              <option key={region} value={region}>
                {regionFlags[region]} {region}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          {/* Sort */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'region')}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name">Name</option>
              <option value="date">Date</option>
              <option value="region">Region</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Regulations List */}
      <div className="space-y-4">
        {filteredRegulations.map(regulation => (
          <div key={regulation.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{regionFlags[regulation.region]}</span>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">{regulation.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">{regulation.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Source: {regulation.source}</span>
                    <span>Effective: {regulation.effectiveDate.toLocaleDateString()}</span>
                    {regulation.expiryDate && (
                      <span>Expires: {regulation.expiryDate.toLocaleDateString()}</span>
                    )}
                    <span>Updated: {regulation.lastUpdated.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[regulation.category]}`}>
                  {regulation.category}
                </span>
                <div className="flex items-center gap-1">
                  {getStatusIcon(regulation)}
                  <span className="text-xs text-gray-600">{getStatusText(regulation)}</span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h5 className="text-sm font-semibold text-gray-700 mb-2">Requirements:</h5>
              <ul className="space-y-1">
                {regulation.requirements.map((requirement, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{requirement}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Info className="w-4 h-4" />
                <span>Regulation ID: {regulation.id}</span>
              </div>
              <div className="flex items-center gap-2">
                {regulation.url && (
                  <a
                    href={regulation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Source
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredRegulations.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Filter className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No regulations found matching your criteria.</p>
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredRegulations.length} of {regulations.length} regulations
          </div>
          <div className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};
