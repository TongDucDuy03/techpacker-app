// API client configuration
const API_BASE_URL = 'http://localhost:4000';

export const isApiConfigured = (): boolean => {
  return true; // API is now configured
};

export const api = {
  // Tech Pack operations
  listTechPacks: async () => {
    const response = await fetch(`${API_BASE_URL}/techpacks`);
    if (!response.ok) throw new Error('Failed to fetch tech packs');
    return response.json();
  },
  createTechPack: async (techPack: any) => {
    const response = await fetch(`${API_BASE_URL}/techpacks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(techPack)
    });
    if (!response.ok) throw new Error('Failed to create tech pack');
    return response.json();
  },
  updateTechPack: async (id: string, techPack: any) => {
    const response = await fetch(`${API_BASE_URL}/techpacks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(techPack)
    });
    if (!response.ok) throw new Error('Failed to update tech pack');
    return response.json();
  },
  deleteTechPack: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/techpacks/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete tech pack');
    return response.ok;
  },

  // Activity operations
  listActivities: async () => {
    const response = await fetch(`${API_BASE_URL}/activities`);
    if (!response.ok) throw new Error('Failed to fetch activities');
    return response.json();
  },
  createActivity: async (activity: any) => {
    const response = await fetch(`${API_BASE_URL}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activity)
    });
    if (!response.ok) throw new Error('Failed to create activity');
    return response.json();
  },

  // Materials operations
  listMaterials: async () => {
    const response = await fetch(`${API_BASE_URL}/materials`);
    if (!response.ok) throw new Error('Failed to fetch materials');
    return response.json();
  },
  createMaterial: async (material: any) => {
    const response = await fetch(`${API_BASE_URL}/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(material)
    });
    if (!response.ok) throw new Error('Failed to create material');
    return response.json();
  },
  updateMaterial: async (id: string, material: any) => {
    const response = await fetch(`${API_BASE_URL}/materials/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(material)
    });
    if (!response.ok) throw new Error('Failed to update material');
    return response.json();
  },
  deleteMaterial: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/materials/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete material');
    return response.ok;
  },

  // Measurement Templates operations
  listMeasurementTemplates: async () => {
    const response = await fetch(`${API_BASE_URL}/measurement-templates`);
    if (!response.ok) throw new Error('Failed to fetch measurement templates');
    return response.json();
  },
  createMeasurementTemplate: async (template: any) => {
    const response = await fetch(`${API_BASE_URL}/measurement-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    });
    if (!response.ok) throw new Error('Failed to create measurement template');
    return response.json();
  },
  updateMeasurementTemplate: async (id: string, template: any) => {
    const response = await fetch(`${API_BASE_URL}/measurement-templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    });
    if (!response.ok) throw new Error('Failed to update measurement template');
    return response.json();
  },
  deleteMeasurementTemplate: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/measurement-templates/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete measurement template');
    return response.ok;
  },

  // Colorways operations
  listColorways: async () => {
    const response = await fetch(`${API_BASE_URL}/colorways`);
    if (!response.ok) throw new Error('Failed to fetch colorways');
    return response.json();
  },
  createColorway: async (colorway: any) => {
    const response = await fetch(`${API_BASE_URL}/colorways`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(colorway)
    });
    if (!response.ok) throw new Error('Failed to create colorway');
    return response.json();
  },
  updateColorway: async (id: string, colorway: any) => {
    const response = await fetch(`${API_BASE_URL}/colorways/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(colorway)
    });
    if (!response.ok) throw new Error('Failed to update colorway');
    return response.json();
  },
  deleteColorway: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/colorways/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete colorway');
    return response.ok;
  },

  // Revision operations
  listRevisions: async (techPackId: string) => {
    const response = await fetch(`${API_BASE_URL}/techpacks/${techPackId}/revisions`);
    if (!response.ok) throw new Error('Failed to fetch revisions');
    return response.json();
  },
  createRevision: async (techPackId: string, revision: any) => {
    const response = await fetch(`${API_BASE_URL}/techpacks/${techPackId}/revisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(revision)
    });
    if (!response.ok) throw new Error('Failed to create revision');
    return response.json();
  },
  addRevisionComment: async (revisionId: string, comment: any) => {
    const response = await fetch(`${API_BASE_URL}/revisions/${revisionId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment)
    });
    if (!response.ok) throw new Error('Failed to add comment');
    return response.json();
  },
  approveRevision: async (revisionId: string) => {
    const response = await fetch(`${API_BASE_URL}/revisions/${revisionId}/approve`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to approve revision');
    return response.json();
  },
  rejectRevision: async (revisionId: string) => {
    const response = await fetch(`${API_BASE_URL}/revisions/${revisionId}/reject`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to reject revision');
    return response.json();
  }
};