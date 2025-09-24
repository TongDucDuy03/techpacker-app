import React, { useEffect, useState } from 'react';
import { api, isApiConfigured } from '../lib/api';
import { useI18n } from '../lib/i18n';

interface ColorwayItem {
  id: string;
  name: string;
  colors: { part: string; color: string; pantone?: string }[];
}

export function ColorwaysManagement() {
  const { t } = useI18n();
  const [items, setItems] = useState<ColorwayItem[]>([]);
  const [form, setForm] = useState<ColorwayItem>({ id: '', name: '', colors: [] });
  const [newColor, setNewColor] = useState<{ part: string; color: string; pantone?: string }>({ part: '', color: '' });

  useEffect(() => {
    if (!isApiConfigured()) return;
    (async () => {
      const data = await api.listColorways();
      setItems(data);
    })();
  }, []);

  const addColor = () => {
    if (!newColor.part || !newColor.color) return;
    setForm({ ...form, colors: [...form.colors, newColor] });
    setNewColor({ part: '', color: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = form.id || Date.now().toString();
    const payload = { ...form, id };
    if (form.id) {
      await api.updateColorway(form.id, payload);
      setItems(prev => prev.map(i => i.id === form.id ? payload : i));
    } else {
      await api.createColorway(payload);
      setItems(prev => [payload, ...prev]);
    }
    setForm({ id: '', name: '', colors: [] });
  };

  const handleEdit = (c: ColorwayItem) => setForm(c);
  const handleDelete = async (id: string) => {
    await api.deleteColorway(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('colormgmt.title')}</h3>
      {!isApiConfigured() && (
        <p className="text-sm text-gray-500 mb-4">{t('colormgmt.hint')}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <input className="border rounded px-3 py-2 w-full" placeholder={t('colormgmt.form.name')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <div className="flex gap-2">
          <input className="border rounded px-3 py-2 flex-1" placeholder={t('colormgmt.form.part')} value={newColor.part} onChange={e => setNewColor({ ...newColor, part: e.target.value })} />
          <input className="border rounded px-3 py-2 flex-1" placeholder={t('colormgmt.form.color')} value={newColor.color} onChange={e => setNewColor({ ...newColor, color: e.target.value })} />
          <input className="border rounded px-3 py-2 flex-1" placeholder={t('colormgmt.form.pantone')} value={newColor.pantone || ''} onChange={e => setNewColor({ ...newColor, pantone: e.target.value })} />
          <button type="button" className="px-3 py-2 border rounded" onClick={addColor}>{t('colormgmt.btn.addColor')}</button>
        </div>
        <div className="text-sm text-gray-600">{t('colormgmt.colorsCount').replace('{n}', String(form.colors.length))}</div>
        <button className="bg-blue-600 text-white rounded px-4 py-2">{form.id ? t('colormgmt.btn.update') : t('colormgmt.btn.create')}</button>
      </form>
      <div className="divide-y">
        {items.map(cw => (
          <div key={cw.id} className="py-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{cw.name}</div>
              <div className="flex gap-2">
                <button className="px-3 py-1 border rounded" onClick={() => handleEdit(cw)}>{t('common.edit')}</button>
                <button className="px-3 py-1 border rounded text-red-600" onClick={() => handleDelete(cw.id)}>{t('common.delete')}</button>
              </div>
            </div>
            <ul className="list-disc ml-5 text-sm text-gray-700">
              {cw.colors.map((p, idx) => (
                <li key={idx}>{p.part}: {p.color}{p.pantone ? ` (${p.pantone})` : ''}</li>
              ))}
            </ul>
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-gray-500">{t('colormgmt.empty')}</div>}
      </div>
    </div>
  );
}


