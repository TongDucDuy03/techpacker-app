import React, { useState, useEffect } from 'react';
import { X, Plus, Save } from 'lucide-react';
import { TechPack, Material, Measurement, Colorway } from '../types';
import { api, isApiConfigured } from '../lib/api';
import { useI18n } from '../lib/i18n';

interface TechPackFormProps {
  techPack?: TechPack;
  onSave: (techPack: Omit<TechPack, 'id' | 'dateCreated' | 'lastModified'>) => void;
  onCancel: () => void;
}

export const TechPackForm: React.FC<TechPackFormProps> = ({ techPack, onSave, onCancel }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState(() => ({
    // Article information (structured payload expected by backend)
    name: techPack?.name || '',
    articleCode: techPack?.articleCode || '',
    category: techPack?.category || 'Shirts',
    status: techPack?.status || 'Draft' as const,
    season: techPack?.season || '',
    brand: techPack?.brand || '',
    // technicalDesignerId should store user id; designerDisplay is human friendly
    technicalDesignerId: (techPack as any)?.technicalDesignerId || '',
    designerDisplay: (techPack as any)?.technicalDesignerName || techPack?.designer || '',
    supplier: (techPack as any)?.supplier || '',
    fabricDescription: (techPack as any)?.fabricDescription || '',
    productDescription: (techPack as any)?.productDescription || '',
    images: techPack?.images || ['https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg'],
    materials: techPack?.materials || [],
    measurements: techPack?.measurements || [],
    constructionDetails: techPack?.constructionDetails || [''],
    colorways: techPack?.colorways || []
  }));
  const [errors, setErrors] = useState<Record<string,string>>({});

  const [activeTab, setActiveTab] = useState('basic');

  // Save to library toggles
  const [saveMaterialsToLibrary, setSaveMaterialsToLibrary] = useState(false);
  const [saveMeasurementsToLibrary, setSaveMeasurementsToLibrary] = useState(false);
  const [saveColorwaysToLibrary, setSaveColorwaysToLibrary] = useState(false);

  // Library sources
  const [materialsLibrary, setMaterialsLibrary] = useState<any[]>([]);
  const [measurementTemplates, setMeasurementTemplates] = useState<any[]>([]);
  const [colorwaysLibrary, setColorwaysLibrary] = useState<any[]>([]);
  // Designers list for technicalDesignerId select
  const [designers, setDesigners] = useState<any[]>([]);

  // Selected library items (for quick add)
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedColorwayId, setSelectedColorwayId] = useState<string>('');

  useEffect(() => {
    if (!isApiConfigured()) return;
    (async () => {
      try {
            const matsPromise = (api as any).listMaterials ? (api as any).listMaterials() : Promise.resolve([]);
            const tempsPromise = (api as any).listMeasurementTemplates ? (api as any).listMeasurementTemplates() : Promise.resolve([]);
            const colsPromise = (api as any).listColorways ? (api as any).listColorways() : Promise.resolve([]);
            const [mats, temps, cols] = await Promise.all([matsPromise, tempsPromise, colsPromise]);
            setMaterialsLibrary(mats || []);
            setMeasurementTemplates(temps || []);
            setColorwaysLibrary(cols || []);

        // Fetch designers for technicalDesigner selection. Try admin users endpoint filtering by role.
        try {
          const usersResp = await api.getAllUsers({ role: 'Designer', limit: 200 });
          const users = usersResp.users || [];
          setDesigners(users);
        } catch (e) {
          // Fallback: call shareable users endpoint if available
          try {
            const shareable = await api.getShareableUsers((techPack as any)?._id || '');
            setDesigners(Array.isArray(shareable) ? shareable : []);
          } catch {
            setDesigners([]);
          }
        }
      } catch {
        // ignore fetch errors in UI layer
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation for required Article Information fields that backend expects
    const newErrors: Record<string,string> = {};
    const required = [
      { key: 'name', label: t('form.productName') },
      { key: 'articleCode', label: t('form.articleCode') },
      { key: 'technicalDesignerId', label: t('form.designer') },
      { key: 'supplier', label: t('form.articleInfo.supplier') },
      { key: 'fabricDescription', label: t('form.articleInfo.fabricDescription') },
      { key: 'productDescription', label: t('form.articleInfo.productDescription') },
      { key: 'season', label: t('form.season') }
    ];
    required.forEach(r => {
      // @ts-ignore
      if (!formData[r.key] || String((formData as any)[r.key]).trim() === '') {
        newErrors[r.key] = t('validation.fieldRequired', { field: r.label });
      }
    });

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    // Fire-and-forget library saves (fastest path) — use any() wrapper for optional API methods
    if (isApiConfigured()) {
      const tasks: Array<Promise<any>> = [];
      if (saveMaterialsToLibrary) {
        for (const m of formData.materials) {
          if ((m.name && m.name.trim()) || (m.specifications && m.specifications.trim())) {
            const payload: any = { ...m };
            payload.id = payload.id || Date.now().toString() + Math.random().toString(16).slice(2);
            const fn = (api as any).createMaterial;
            if (fn) tasks.push(fn(payload).catch(() => undefined));
          }
        }
      }
      if (saveMeasurementsToLibrary) {
        if (formData.measurements && formData.measurements.length > 0) {
          const templatePayload = {
            id: Date.now().toString(),
            name: `${formData.name || 'Untitled'} - measurements`,
            points: formData.measurements.map(me => ({ point: me.point, tolerance: me.tolerance }))
          };
          const fn = (api as any).createMeasurementTemplate;
          if (fn) tasks.push(fn(templatePayload).catch(() => undefined));
        }
      }
      if (saveColorwaysToLibrary) {
        for (const c of formData.colorways) {
          if (c.name || (c.colors && c.colors.length > 0)) {
            const payload: any = { ...c };
            payload.id = payload.id || Date.now().toString() + Math.random().toString(16).slice(2);
            const fn = (api as any).createColorway;
            if (fn) tasks.push(fn(payload).catch(() => undefined));
          }
        }
      }
      // Run without blocking save, but await to avoid unhandled rejections
      try { await Promise.all(tasks); } catch { /* ignored */ }
    }

    // Map formData into the expected payload shape if parent expects it; cast to any to avoid strict typing mismatch
    onSave(formData as unknown as any);
  };

  const addMaterial = () => {
    const newMaterial: Material = {
      id: `m${Date.now()}`,
      name: '',
      composition: '',
      supplier: '',
      color: '',
      consumption: '',
      specifications: '',
      position: '',
      quantity: undefined,
      unit: '',
      technicalNotes: '',
      subMaterials: []
    };
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, newMaterial]
    }));
  };

  const addMaterialFromLibrary = () => {
    if (!selectedMaterialId) return;
    const lib = materialsLibrary.find(m => m.id === selectedMaterialId);
    if (!lib) return;
    const newMaterial: Material = {
      id: `m${Date.now()}`,
      name: lib.name || '',
      composition: lib.composition || '',
      supplier: lib.supplier || '',
      color: lib.color || '',
      consumption: lib.consumption || '',
      specifications: lib.specifications || '',
      position: lib.position || '',
      quantity: lib.quantity || undefined,
      unit: lib.unit || '',
      technicalNotes: lib.technicalNotes || '',
      subMaterials: Array.isArray(lib.subMaterials) ? lib.subMaterials : []
    } as Material;
    setFormData(prev => ({ ...prev, materials: [...prev.materials, newMaterial] }));
    setSelectedMaterialId('');
  };

  const updateMaterial = (index: number, field: keyof Material, value: string) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.map((material, i) => 
        i === index ? { ...material, [field]: value } : material
      )
    }));
  };

  const removeMaterial = (index: number) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  const addMeasurement = () => {
    const newMeasurement: Measurement = {
      id: `meas${Date.now()}`,
      point: '',
      tolerance: '',
      sizes: { XS: '', S: '', M: '', L: '', XL: '' }
    };
    setFormData(prev => ({
      ...prev,
      measurements: [...prev.measurements, newMeasurement]
    }));
  };

  const addMeasurementsFromTemplate = () => {
    if (!selectedTemplateId) return;
    const tpl = measurementTemplates.find(t => t.id === selectedTemplateId);
    if (!tpl) return;
    const rows: Measurement[] = (tpl.points || []).map((p: any) => ({
      id: `meas${Date.now()}${Math.random().toString(16).slice(2)}`,
      point: p.point || '',
      tolerance: p.tolerance || '',
      sizes: { XS: '', S: '', M: '', L: '', XL: '' }
    }));
    setFormData(prev => ({ ...prev, measurements: [...prev.measurements, ...rows] }));
    setSelectedTemplateId('');
  };

  const updateMeasurement = (index: number, field: keyof Measurement, value: any) => {
    setFormData(prev => ({
      ...prev,
      measurements: prev.measurements.map((measurement, i) => 
        i === index ? { ...measurement, [field]: value } : measurement
      )
    }));
  };

  const removeMeasurement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      measurements: prev.measurements.filter((_, i) => i !== index)
    }));
  };

  const addColorway = () => {
    const newColorway: Colorway = {
      id: `cw${Date.now()}`,
      name: '',
      colors: [{ part: '', color: '', pantone: '' }]
    };
    setFormData(prev => ({
      ...prev,
      colorways: [...prev.colorways, newColorway]
    }));
  };

  const addColorwayFromLibrary = () => {
    if (!selectedColorwayId) return;
    const lib = colorwaysLibrary.find(c => c.id === selectedColorwayId);
    if (!lib) return;
    const newColorway: Colorway = {
      id: `cw${Date.now()}`,
      name: lib.name || '',
      colors: Array.isArray(lib.colors) ? lib.colors : []
    };
    setFormData(prev => ({ ...prev, colorways: [...prev.colorways, newColorway] }));
    setSelectedColorwayId('');
  };

  const updateColorway = (index: number, field: keyof Colorway, value: any) => {
    setFormData(prev => ({
      ...prev,
      colorways: prev.colorways.map((colorway, i) => 
        i === index ? { ...colorway, [field]: value } : colorway
      )
    }));
  };

  const removeColorway = (index: number) => {
    setFormData(prev => ({
      ...prev,
      colorways: prev.colorways.filter((_, i) => i !== index)
    }));
  };

  const addConstructionDetail = () => {
    setFormData(prev => ({
      ...prev,
      constructionDetails: [...prev.constructionDetails, '']
    }));
  };

  const updateConstructionDetail = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      constructionDetails: prev.constructionDetails.map((detail, i) => 
        i === index ? value : detail
      )
    }));
  };

  const removeConstructionDetail = (index: number) => {
    setFormData(prev => ({
      ...prev,
      constructionDetails: prev.constructionDetails.filter((_, i) => i !== index)
    }));
  };

  const tabs = [
    { id: 'basic', label: t('form.basicInfo') },
    { id: 'materials', label: t('form.materials') },
    { id: 'measurements', label: t('form.measurements') },
    { id: 'colorways', label: t('form.colorways') },
    { id: 'construction', label: t('form.construction') }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {techPack ? t('form.editTechPackTitle') : t('form.createNewTechPackTitle')}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('form.productName')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('form.category')} *
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="Shirts">Shirts</option>
                      <option value="Outerwear">Outerwear</option>
                      <option value="Dresses">Dresses</option>
                      <option value="Pants">Pants</option>
                      <option value="Accessories">Accessories</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('form.brand')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.brand}
                      onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('form.articleCode')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.articleCode}
                      readOnly={!!techPack}
                      onChange={(e) => setFormData(prev => ({ ...prev, articleCode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    {errors.articleCode && <div className="text-red-600 text-sm mt-1">{errors.articleCode}</div>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('form.designer')} *
                    </label>
                    <select
                      required
                      value={formData.technicalDesignerId}
                      onChange={(e) => {
                        const selected = e.target.value;
                        const selUser = designers.find((d: any) => (d._id || d.id) === selected) as any;
                        setFormData(prev => ({ ...prev, technicalDesignerId: selected, designerDisplay: selUser ? (selUser.firstName ? `${selUser.firstName} ${selUser.lastName}` : selUser.name || selUser.email) : '' }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="">-- Select Designer --</option>
                      {designers.map(d => (
                        <option key={(d._id || d.id)} value={(d._id || d.id)}>{d.firstName ? `${d.firstName} ${d.lastName}` : d.name || d.email}</option>
                      ))}
                    </select>
                    {errors.technicalDesignerId && <div className="text-red-600 text-sm mt-1">{errors.technicalDesignerId}</div>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('form.season')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.season}
                      onChange={(e) => setFormData(prev => ({ ...prev, season: e.target.value }))}
                      placeholder={t('form.season.placeholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    {errors.season && <div className="text-red-600 text-sm mt-1">{errors.season}</div>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('form.status')}
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="Draft">Draft</option>
                      <option value="In Review">In Review</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                  {/* Full width fields for supplier and descriptions */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Supplier *</label>
                    <input
                      type="text"
                      required
                      value={formData.supplier}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    {errors.supplier && <div className="text-red-600 text-sm mt-1">{errors.supplier}</div>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fabric Description *</label>
                    <textarea
                      required
                      value={formData.fabricDescription}
                      onChange={(e) => setFormData(prev => ({ ...prev, fabricDescription: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent min-h-[80px]"
                    />
                    {errors.fabricDescription && <div className="text-red-600 text-sm mt-1">{errors.fabricDescription}</div>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product Description *</label>
                    <textarea
                      required
                      value={formData.productDescription}
                      onChange={(e) => setFormData(prev => ({ ...prev, productDescription: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent min-h-[80px]"
                    />
                    {errors.productDescription && <div className="text-red-600 text-sm mt-1">{errors.productDescription}</div>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'materials' && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <h3 className="text-lg font-medium text-gray-900">{t('materials.bom')}</h3>
                  <div className="flex flex-col md:flex-row gap-3 md:items-center">
                    {isApiConfigured() && (
                      <div className="flex items-center gap-2">
                        <select
                          className="border rounded px-3 py-2"
                          value={selectedMaterialId}
                          onChange={e => setSelectedMaterialId(e.target.value)}
                        >
                          <option value="">{t('materials.addFromLibrary')}</option>
                          {materialsLibrary.map(m => (
                            <option key={m.id} value={m.id}>{m.name || m.specifications || m.id}</option>
                          ))}
                        </select>
                        <button type="button" className="px-3 py-2 border rounded" onClick={addMaterialFromLibrary}>{t('actions.add')}</button>
                      </div>
                    )}
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={saveMaterialsToLibrary} onChange={e => setSaveMaterialsToLibrary(e.target.checked)} />
                      {t('form.saveMaterialsToLibrary')}
                    </label>
                    <button
                      type="button"
                      onClick={addMaterial}
                      className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('materials.addRow')}
                    </button>
                  </div>
                </div>
                <div className="overflow-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">{t('materials.header.stt')}</th>
                        <th className="px-3 py-2 text-left">{t('materials.header.specifications')}</th>
                        <th className="px-3 py-2 text-left">{t('materials.header.position')}</th>
                        <th className="px-3 py-2 text-left">{t('materials.header.quantity')}</th>
                        <th className="px-3 py-2 text-left">{t('materials.header.unit')}</th>
                        <th className="px-3 py-2 text-left">{t('materials.header.notes')}</th>
                        <th className="px-3 py-2 text-left">{t('materials.header.submaterials')}</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.materials.map((material, index) => (
                        <tr key={material.id} className="border-t">
                          <td className="px-3 py-2 align-top w-16">{index + 1}</td>
                          <td className="px-3 py-2 align-top min-w-[220px]">
                            <input
                              type="text"
                              placeholder={t('materials.placeholder.specifications')}
                              value={material.specifications || ''}
                              onChange={(e) => updateMaterial(index, 'specifications', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded"
                            />
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <input
                                type="text"
                                placeholder={t('materials.placeholder.name')}
                                value={material.name}
                                onChange={(e) => updateMaterial(index, 'name', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded"
                              />
                              <input
                                type="text"
                                placeholder={t('materials.placeholder.composition')}
                                value={material.composition}
                                onChange={(e) => updateMaterial(index, 'composition', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded"
                              />
                              <input
                                type="text"
                                placeholder={t('materials.placeholder.supplier')}
                                value={material.supplier}
                                onChange={(e) => updateMaterial(index, 'supplier', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded"
                              />
                              <input
                                type="text"
                                placeholder={t('materials.placeholder.color')}
                                value={material.color}
                                onChange={(e) => updateMaterial(index, 'color', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded"
                              />
                              <input
                                type="text"
                                placeholder={t('materials.placeholder.consumption')}
                                value={material.consumption}
                                onChange={(e) => updateMaterial(index, 'consumption', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded"
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top min-w-[140px]">
                            <input
                              type="text"
                              placeholder={t('materials.placeholder.position')}
                              value={material.position || ''}
                              onChange={(e) => updateMaterial(index, 'position', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-3 py-2 align-top w-36">
                            <input
                              type="number"
                              placeholder={t('materials.placeholder.qty')}
                              value={material.quantity ?? ''}
                              onChange={(e) => updateMaterial(index, 'quantity', e.target.value === '' ? '' as unknown as any : Number(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-3 py-2 align-top w-36">
                            <input
                              type="text"
                              placeholder={t('materials.placeholder.unit')}
                              value={material.unit || ''}
                              onChange={(e) => updateMaterial(index, 'unit', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-3 py-2 align-top min-w-[200px]">
                            <textarea
                              placeholder={t('materials.placeholder.notes')}
                              value={material.technicalNotes || ''}
                              onChange={(e) => updateMaterial(index, 'technicalNotes', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded min-h-[44px]"
                            />
                          </td>
                          <td className="px-3 py-2 align-top min-w-[260px]">
                            <div className="space-y-2">
                              {(material.subMaterials || []).map((sm, smIdx) => (
                                <div key={sm.id} className="grid grid-cols-3 gap-2">
                                  <input
                                    type="text"
                                    placeholder={t('materials.placeholder.specifications')}
                                    value={sm.specifications}
                                    onChange={(e) => {
                                      const next = [...(material.subMaterials || [])];
                                      next[smIdx] = { ...sm, specifications: e.target.value };
                                      updateMaterial(index, 'subMaterials', next as unknown as any);
                                    }}
                                    className="px-3 py-2 border border-gray-300 rounded"
                                  />
                                  <input
                                    type="number"
                                    placeholder={t('materials.placeholder.qty')}
                                    value={sm.quantity ?? ''}
                                    onChange={(e) => {
                                      const next = [...(material.subMaterials || [])];
                                      next[smIdx] = { ...sm, quantity: e.target.value === '' ? undefined : Number(e.target.value) };
                                      updateMaterial(index, 'subMaterials', next as unknown as any);
                                    }}
                                    className="px-3 py-2 border border-gray-300 rounded"
                                  />
                                  <input
                                    type="text"
                                    placeholder={t('materials.placeholder.unit')}
                                    value={sm.unit || ''}
                                    onChange={(e) => {
                                      const next = [...(material.subMaterials || [])];
                                      next[smIdx] = { ...sm, unit: e.target.value };
                                      updateMaterial(index, 'subMaterials', next as unknown as any);
                                    }}
                                    className="px-3 py-2 border border-gray-300 rounded"
                                  />
                                </div>
                              ))}
                              <button
                                type="button"
                                className="px-3 py-1 border rounded"
                                onClick={() => {
                                  const next = [...(material.subMaterials || [])];
                                  next.push({ id: `sm${Date.now()}`, specifications: '', quantity: undefined, unit: '' });
                                  updateMaterial(index, 'subMaterials', next as unknown as any);
                                }}
                              >
                                {t('materials.addSubMaterial')}
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top w-24 text-right">
                            <button
                              type="button"
                              onClick={() => removeMaterial(index)}
                              className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              {t('actions.remove')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'measurements' && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <h3 className="text-lg font-medium text-gray-900">{t('form.measurements')}</h3>
                  <div className="flex flex-col md:flex-row gap-3 md:items-center">
                    {isApiConfigured() && (
                      <div className="flex items-center gap-2">
                        <select
                          className="border rounded px-3 py-2"
                          value={selectedTemplateId}
                          onChange={e => setSelectedTemplateId(e.target.value)}
                        >
                          <option value="">{t('materials.applyTemplate')}</option>
                          {measurementTemplates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <button type="button" className="px-3 py-2 border rounded" onClick={addMeasurementsFromTemplate}>{t('actions.apply')}</button>
                      </div>
                    )}
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={saveMeasurementsToLibrary} onChange={e => setSaveMeasurementsToLibrary(e.target.checked)} />
                      {t('form.saveMeasurementsToLibrary')}
                    </label>
                    <button
                      type="button"
                      onClick={addMeasurement}
                      className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('measurements.add')}
                    </button>
                  </div>
                </div>
                {formData.measurements.map((measurement, index) => (
                  <div key={measurement.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <input
                        type="text"
                        placeholder={t('measurements.header.point')}
                        value={measurement.point}
                        onChange={(e) => updateMeasurement(index, 'point', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder={t('measurements.header.tolerance')}
                        value={measurement.tolerance}
                        onChange={(e) => updateMeasurement(index, 'tolerance', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      {Object.entries(measurement.sizes).map(([size, value]) => (
                        <div key={size}>
                          <label className="block text-xs font-medium text-gray-700 mb-1">{size}</label>
                          <input
                            type="text"
                            placeholder={t('measurements.placeholder.size')}
                            value={value}
                            onChange={(e) => updateMeasurement(index, 'sizes', { ...measurement.sizes, [size]: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMeasurement(index)}
                      className="px-3 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'colorways' && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <h3 className="text-lg font-medium text-gray-900">{t('form.colorways')}</h3>
                  <div className="flex flex-col md:flex-row gap-3 md:items-center">
                    {isApiConfigured() && (
                      <div className="flex items-center gap-2">
                        <select
                          className="border rounded px-3 py-2"
                          value={selectedColorwayId}
                          onChange={e => setSelectedColorwayId(e.target.value)}
                        >
                          <option value="">{t('materials.addFromLibrary')}</option>
                          {colorwaysLibrary.map(c => (
                            <option key={c.id} value={c.id}>{c.name || c.id}</option>
                          ))}
                        </select>
                        <button type="button" className="px-3 py-2 border rounded" onClick={addColorwayFromLibrary}>{t('actions.add')}</button>
                      </div>
                    )}
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={saveColorwaysToLibrary} onChange={e => setSaveColorwaysToLibrary(e.target.checked)} />
                      {t('form.saveColorwaysToLibrary')}
                    </label>
                    <button
                      type="button"
                      onClick={addColorway}
                      className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('colorways.add')}
                    </button>
                  </div>
                </div>
                {formData.colorways.map((colorway, index) => (
                  <div key={colorway.id} className="border border-gray-200 rounded-lg p-4">
                    <input
                      type="text"
                      placeholder={t('colorways.placeholder.name')}
                      value={colorway.name}
                      onChange={(e) => updateColorway(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-4"
                    />
                    {colorway.colors.map((color, colorIndex) => (
                      <div key={colorIndex} className="grid grid-cols-3 gap-2 mb-2">
                        <input
                          type="text"
                          placeholder={t('colorways.placeholder.part')}
                          value={color.part}
                          onChange={(e) => {
                            const newColors = [...colorway.colors];
                            newColors[colorIndex] = { ...color, part: e.target.value };
                            updateColorway(index, 'colors', newColors);
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder={t('colorways.placeholder.color')}
                          value={color.color}
                          onChange={(e) => {
                            const newColors = [...colorway.colors];
                            newColors[colorIndex] = { ...color, color: e.target.value };
                            updateColorway(index, 'colors', newColors);
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder={t('colorways.placeholder.pantone')}
                          value={color.pantone || ''}
                          onChange={(e) => {
                            const newColors = [...colorway.colors];
                            newColors[colorIndex] = { ...color, pantone: e.target.value };
                            updateColorway(index, 'colors', newColors);
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => removeColorway(index)}
                      className="px-3 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors text-sm"
                    >
                      {t('actions.removeColorway')}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'construction' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">{t('form.construction')}</h3>
                  <button
                    type="button"
                    onClick={addConstructionDetail}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Detail
                  </button>
                </div>
                {formData.constructionDetails.map((detail, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Construction detail"
                      value={detail}
                      onChange={(e) => updateConstructionDetail(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => removeConstructionDetail(index)}
                      className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      {t('actions.remove')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-6 border-t border-gray-200">
            <div className="flex gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={saveMaterialsToLibrary} onChange={e => setSaveMaterialsToLibrary(e.target.checked)} />
                {t('form.saveMaterialsToLibrary.footer')}
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={saveMeasurementsToLibrary} onChange={e => setSaveMeasurementsToLibrary(e.target.checked)} />
                {t('form.saveMeasurementsToLibrary.footer')}
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={saveColorwaysToLibrary} onChange={e => setSaveColorwaysToLibrary(e.target.checked)} />
                {t('form.saveColorwaysToLibrary.footer')}
              </label>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {techPack ? t('form.updateTechPack') : t('form.createTechPack')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};