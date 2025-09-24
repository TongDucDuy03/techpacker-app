import React, { useEffect, useState } from 'react';
import { api, isApiConfigured } from '../lib/api';
import { useI18n } from '../lib/i18n';

interface MeasurementTemplate {
  id: string;
  name: string;
  points: { point: string; tolerance?: string }[];
}

export function MeasurementsManagement() {
  const { t } = useI18n();
  const [items, setItems] = useState<MeasurementTemplate[]>([]);
  const [form, setForm] = useState<MeasurementTemplate>({ id: '', name: '', points: [] });
  const [newPoint, setNewPoint] = useState<{ point: string; tolerance?: string }>({ point: '' });

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
    setForm({ id: '', name: '', points: [] });
  };

  const handleEdit = (t: MeasurementTemplate) => setForm(t);
  const handleDelete = async (id: string) => {
    await api.deleteMeasurementTemplate(id);
    setItems(prev => prev.filter(i => i.id !== id));
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
        <div className="text-sm text-gray-600">{t('measmgmt.pointsCount').replace('{n}', String(form.points.length))}</div>
        <button className="bg-blue-600 text-white rounded px-4 py-2">{form.id ? t('measmgmt.btn.update') : t('measmgmt.btn.create')}</button>
      </form>
      <div className="divide-y">
        {items.map(tpl => (
          <div key={tpl.id} className="py-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{tpl.name}</div>
              <div className="flex gap-2">
                <button className="px-3 py-1 border rounded" onClick={() => handleEdit(tpl)}>{t('common.edit')}</button>
                <button className="px-3 py-1 border rounded text-red-600" onClick={() => handleDelete(tpl.id)}>{t('common.delete')}</button>
              </div>
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


