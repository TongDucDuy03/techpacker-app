import { TechPack, TechPackListResponse, CreateTechPackInput, BulkOperationPayload } from '../types/techpack';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api';

export function isApiConfigured(): boolean {
  return !!API_BASE_URL;
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: 'Network error' }));
      const details = Array.isArray(errorBody?.details)
        ? `: ${errorBody.details
            .map((d: any) => [d.field, d.message].filter(Boolean).join(' - '))
            .join('; ')}`
        : '';
      const message = `${errorBody?.error || `HTTP ${response.status}`}${details}`;
      throw new Error(message);
    }

    return response.json();
  }

  // List tech packs with filtering and pagination
  async listTechPacks(params: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    designer?: string;
  } = {}): Promise<TechPackListResponse> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    return this.request<TechPackListResponse>(
      `/techpacks${queryString ? `?${queryString}` : ''}`
    );
  }

  // Create new tech pack
  async createTechPack(data: CreateTechPackInput): Promise<TechPack> {
    return this.request<TechPack>('/techpacks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get tech pack details
  async getTechPack(id: string): Promise<TechPack> {
    return this.request<TechPack>(`/techpacks/${id}`);
  }

  // Update tech pack
  async updateTechPack(id: string, data: Partial<TechPack>): Promise<TechPack> {
    return this.request<TechPack>(`/techpacks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Soft delete tech pack
  async deleteTechPack(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/techpacks/${id}`, {
      method: 'DELETE',
    });
  }

  // Duplicate tech pack
  async duplicateTechPack(id: string, keepVersion = false): Promise<TechPack> {
    return this.request<TechPack>(`/techpacks/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ keepVersion }),
    });
  }

  // Bulk operations
  async bulkOperations(data: BulkOperationPayload): Promise<{ message: string; modifiedCount: number }> {
    return this.request<{ message: string; modifiedCount: number }>('/techpacks/bulk', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();


