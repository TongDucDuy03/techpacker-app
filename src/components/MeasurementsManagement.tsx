import React, { useEffect, useState } from 'react';
import { api, isApiConfigured } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { SIZE_PRESET_OPTIONS, getPresetById } from '../constants/sizePresets';

interface MeasurementTemplate {
  id: string;
  name: string;
  points: { point: string; tolerance?: string }[];
  sizeRange?: string[];
}

export function MeasurementsManagement() {
  const { t } = useI18n();
  const [items, setItems] = useState<MeasurementTemplate[]>([]);
  const [form, setForm] = useState<MeasurementTemplate>({ id: '', name: '', points: [], sizeRange: [] });
  const [newPoint, setNewPoint] = useState<{ point: string; tolerance?: string }>({ point: '' });
  const [newSize, setNewSize] = useState('');
  const [presetId, setPresetId] = useState(SIZE_PRESET_OPTIONS[0]?.id || 'standard_us_alpha');

  useEffect(() => {
    if (!isApiConfigured()) return;
    (async () => {
      const data = await api.listMeasurementTemplates();
      setItems(data);
    })();
  }, []);

  const addPoint = () => {
    if (!newPoint.point) return;
    setForm({ ...form, points: [...form.points, newPoint] });
    setNewPoint({ point: '' });
  };

  const handleAddSize = () => {
    const trimmed = newSize.trim();
    if (!trimmed) return;
    const existing = form.sizeRange || [];
    const exists = existing.some(size => size.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setNewSize('');
      return;
    }
    setForm({ ...form, sizeRange: [...existing, trimmed] });
    setNewSize('');
  };

  const handleRemoveSize = (size: string) => {
    setForm({
      ...form,
      sizeRange: (form.sizeRange || []).filter(item => item !== size),
    });
  };

  const handleApplyPreset = () => {
    const preset = getPresetById(presetId);
    if (!preset) return;
    setForm({
      ...form,
      sizeRange: [...preset.sizes],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = form.id || Date.now().toString();
    const payload = { ...form, id };
    if (form.id) {
      await api.updateMeasurementTemplate(form.id, payload);
      setItems(prev => prev.map(i => i.id === form.id ? payload : i));
    } else {
      await api.createMeasurementTemplate(payload);
      setItems(prev => [payload, ...prev]);
    }
    setForm({ id: '', name: '', points: [], sizeRange: [] });
  };

  const handleEdit = (t: MeasurementTemplate) => setForm({ ...t, sizeRange: t.sizeRange || [] });
  const handleDelete = async (id: string) => {
    await api.deleteMeasurementTemplate(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleDuplicate = async (template: MeasurementTemplate) => {
    const duplicated: MeasurementTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} Copy`,
      sizeRange: template.sizeRange ? [...template.sizeRange] : [],
      points: template.points ? template.points.map(point => ({ ...point })) : [],
    };
    await api.createMeasurementTemplate(duplicated);
    setItems(prev => [duplicated, ...prev]);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('measmgmt.title')}</h3>
      {!isApiConfigured() && (
        <p className="text-sm text-gray-500 mb-4">{t('measmgmt.hint')}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <input className="border rounded px-3 py-2 w-full" placeholder={t('measmgmt.form.templateName')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <div className="flex gap-2">
          <input className="border rounded px-3 py-2 flex-1" placeholder={t('measmgmt.form.point')} value={newPoint.point} onChange={e => setNewPoint({ ...newPoint, point: e.target.value })} />
          <input className="border rounded px-3 py-2 flex-1" placeholder={t('measmgmt.form.tolerance')} value={newPoint.tolerance || ''} onChange={e => setNewPoint({ ...newPoint, tolerance: e.target.value })} />
          <button type="button" className="px-3 py-2 border rounded" onClick={addPoint}>{t('measmgmt.btn.addPoint')}</button>
        </div>
        <div className="border rounded px-3 py-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Size Range</span>
            <select
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
              className="px-3 py-1 text-sm border rounded-md"
            >
              {SIZE_PRESET_OPTIONS.map(preset => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="px-3 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded"
              onClick={handleApplyPreset}
            >
              Apply Preset
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(form.sizeRange || []).length === 0 && (
              <span className="text-xs text-gray-500">No sizes configured.</span>
            )}
            {(form.sizeRange || []).map(size => (
              <span key={size} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                {size}
                <button type="button" onClick={() => handleRemoveSize(size)} aria-label={`Remove size ${size}`} className="text-gray-500 hover:text-gray-700">
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="border rounded px-3 py-2 text-sm flex-1"
              placeholder="Add size e.g., 4, 6, 8, 3XL"
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
            />
            <button type="button" className="px-3 py-2 text-sm border rounded" onClick={handleAddSize}>
              Add Size
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-600">{t('measmgmt.pointsCount').replace('{n}', String(form.points.length))}</div>
        <button className="bg-blue-600 text-white rounded px-4 py-2">{form.id ? t('measmgmt.btn.update') : t('measmgmt.btn.create')}</button>
      </form>
      <div className="divide-y">
        {items.map(tpl => (
          <div key={tpl.id} className="py-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{tpl.name}</div>
              <div className="flex gap-2">
                <button className="px-3 py-1 border rounded text-indigo-600" onClick={() => handleDuplicate(tpl)}>Duplicate</button>
                <button className="px-3 py-1 border rounded" onClick={() => handleEdit(tpl)}>{t('common.edit')}</button>
                <button className="px-3 py-1 border rounded text-red-600" onClick={() => handleDelete(tpl.id)}>{t('common.delete')}</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {tpl.sizeRange && tpl.sizeRange.length > 0 ? (
                tpl.sizeRange.map(size => (
                  <span key={`${tpl.id}-${size}`} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                    {size}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400">No size range configured</span>
              )}
            </div>
            <ul className="list-disc ml-5 text-sm text-gray-700">
              {tpl.points.map((p, idx) => (
                <li key={idx}>{p.point}{p.tolerance ? ` (${p.tolerance})` : ''}</li>
              ))}
            </ul>
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-gray-500">{t('measmgmt.empty')}</div>}
      </div>
    </div>
  );
}


