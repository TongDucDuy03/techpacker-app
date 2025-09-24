import React, { useEffect, useState } from 'react';
import { api, isApiConfigured } from '../lib/api';

interface MaterialItem {
  id: string;
  name: string;
  composition?: string;
  supplier?: string;
  color?: string;
  consumption?: string;
}

export function MaterialsLibrary() {
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [form, setForm] = useState<MaterialItem>({ id: '', name: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isApiConfigured()) return;
    (async () => {
      setLoading(true);
      try {
        const data = await api.listMaterials();
        setItems(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    const id = form.id || Date.now().toString();
    const payload = { ...form, id };
    if (form.id) {
      await api.updateMaterial(form.id, payload);
      setItems(prev => prev.map(i => i.id === form.id ? payload : i));
    } else {
      await api.createMaterial(payload);
      setItems(prev => [payload, ...prev]);
    }
    setForm({ id: '', name: '' });
  };

  const handleEdit = (m: MaterialItem) => setForm(m);

  const handleDelete = async (id: string) => {
    await api.deleteMaterial(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Materials Library</h3>
      {!isApiConfigured() && (
        <p className="text-sm text-gray-500 mb-4">Set VITE_API_BASE_URL to enable Mongo-backed library.</p>
      )}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <input className="border rounded px-3 py-2" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input className="border rounded px-3 py-2" placeholder="Composition" value={form.composition || ''} onChange={e => setForm({ ...form, composition: e.target.value })} />
        <input className="border rounded px-3 py-2" placeholder="Supplier" value={form.supplier || ''} onChange={e => setForm({ ...form, supplier: e.target.value })} />
        <input className="border rounded px-3 py-2" placeholder="Color" value={form.color || ''} onChange={e => setForm({ ...form, color: e.target.value })} />
        <input className="border rounded px-3 py-2" placeholder="Consumption" value={form.consumption || ''} onChange={e => setForm({ ...form, consumption: e.target.value })} />
        <button className="bg-blue-600 text-white rounded px-4 py-2" disabled={loading}>
          {form.id ? 'Update' : 'Add'}
        </button>
      </form>
      <div className="divide-y">
        {items.map(i => (
          <div key={i.id} className="py-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{i.name}</div>
              <div className="text-sm text-gray-600">{[i.composition, i.supplier, i.color, i.consumption].filter(Boolean).join(' • ')}</div>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => handleEdit(i)}>Edit</button>
              <button className="px-3 py-1 border rounded text-red-600" onClick={() => handleDelete(i.id)}>Delete</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-gray-500">No materials yet.</div>}
      </div>
    </div>
  );
}


