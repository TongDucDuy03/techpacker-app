import { Activity, TechPack } from '../types';

const baseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

export function isApiConfigured(): boolean {
  return Boolean(baseUrl);
}

async function http<T>(path: string, options?: RequestInit): Promise<T> {
  if (!baseUrl) throw new Error('API not configured');
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export const api = {
  // Techpacks
  listTechPacks: () => http<TechPack[]>('/techpacks'),
  createTechPack: (tp: TechPack) => http<TechPack>('/techpacks', { method: 'POST', body: JSON.stringify(tp) }),
  updateTechPack: (id: string, tp: Partial<TechPack>) => http<TechPack>(`/techpacks/${id}`, { method: 'PUT', body: JSON.stringify(tp) }),
  deleteTechPack: (id: string) => fetch(`${baseUrl}/techpacks/${id}`, { method: 'DELETE' }).then(() => undefined),

  // Activities
  listActivities: () => http<Activity[]>('/activities'),
  createActivity: (a: Activity) => http<Activity>('/activities', { method: 'POST', body: JSON.stringify(a) }),

  // Materials
  listMaterials: () => http<any[]>('/materials'),
  createMaterial: (m: any) => http<any>('/materials', { method: 'POST', body: JSON.stringify(m) }),
  updateMaterial: (id: string, m: any) => http<any>(`/materials/${id}`, { method: 'PUT', body: JSON.stringify(m) }),
  deleteMaterial: (id: string) => fetch(`${baseUrl}/materials/${id}`, { method: 'DELETE' }).then(() => undefined),

  // Measurement Templates
  listMeasurementTemplates: () => http<any[]>('/measurement-templates'),
  createMeasurementTemplate: (mt: any) => http<any>('/measurement-templates', { method: 'POST', body: JSON.stringify(mt) }),
  updateMeasurementTemplate: (id: string, mt: any) => http<any>(`/measurement-templates/${id}`, { method: 'PUT', body: JSON.stringify(mt) }),
  deleteMeasurementTemplate: (id: string) => fetch(`${baseUrl}/measurement-templates/${id}`, { method: 'DELETE' }).then(() => undefined),

  // Colorways
  listColorways: () => http<any[]>('/colorways'),
  createColorway: (c: any) => http<any>('/colorways', { method: 'POST', body: JSON.stringify(c) }),
  updateColorway: (id: string, c: any) => http<any>(`/colorways/${id}`, { method: 'PUT', body: JSON.stringify(c) }),
  deleteColorway: (id: string) => fetch(`${baseUrl}/colorways/${id}`, { method: 'DELETE' }).then(() => undefined),
};


