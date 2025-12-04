import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { TechPackListResponse, CreateTechPackInput, ApiTechPack } from '../types/techpack';

// Auto-detect API base URL based on current hostname
const getApiBaseUrl = (): string => {
  // If explicitly set in env, use that
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Auto-detect based on current hostname
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';

  if (isLocalhost) {
    // Running locally - use localhost
    return 'http://localhost:4001/api/v1';
  } else {
    // Running on server - use same hostname with port 4001
    return `http://${hostname}:4001/api/v1`;
  }
};

const API_BASE_URL = getApiBaseUrl();

// Log API base URL for debugging (only in development)
if (import.meta.env.DEV) {
  console.log('🔗 API Base URL:', API_BASE_URL);
  console.log('🌐 Current hostname:', window.location.hostname);
}

export function isApiConfigured(): boolean {
  return !!API_BASE_URL;
}

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ApiError {
  success: false;
  message: string;
  error?: {
    code: string;
    details?: Array<{ field?: string; message: string }>;
  };
}

class ApiClient {
  private axiosInstance: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // Increased to 30s to allow time for 2FA email sending
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling and token refresh
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse | Blob>) => {
        // For blob responses (like PDF), return as-is without processing
        if (response.config.responseType === 'blob' || response.data instanceof Blob) {
          return response;
        }
        return response;
      },
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as any;

        // Don't try to refresh token for login/register requests
        const isAuthRequest = originalRequest?.url?.includes('/auth/login') ||
                             originalRequest?.url?.includes('/auth/register');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            if (newToken && originalRequest) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            this.handleAuthError();
            return Promise.reject(refreshError);
          }
        }

        // For 401 errors on auth requests or when refresh fails
        if (error.response?.status === 401) {
          this.handleAuthError();
        }

        return Promise.reject(this.formatError(error));
      }
    );
  }

  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  private setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.handleAuthError();
      return null;
    }

    this.refreshPromise = this.performTokenRefresh(refreshToken);

    try {
      const newToken = await this.refreshPromise;
      this.refreshPromise = null;
      return newToken;
    } catch (error) {
      this.refreshPromise = null;
      throw error;
    }
  }

  private async performTokenRefresh(refreshToken: string): Promise<string> {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
    const responseData = response.data as ApiResponse<{ accessToken: string }>;
    const { data } = responseData ?? {};

    if (!data?.accessToken) {
      throw new Error('Invalid refresh token response');
    }

    localStorage.setItem('accessToken', data.accessToken);
    return data.accessToken;
  }

  private handleAuthError() {
    this.clearTokens();
    // Only redirect if not already on login page
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  private formatError(error: AxiosError<ApiError>): Error {
    // Handle CORS errors specifically
    if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
      if (error.config?.url?.includes('localhost:4001')) {
        return new Error('Server connection failed. Please ensure the backend server is running on port 4001.');
      }
      return new Error('Network connection failed. Please check your internet connection and server status.');
    }

    if (error.response?.data) {
      const apiError = error.response.data;
      let message = apiError.message || 'An error occurred';

      if (apiError.error?.details?.length) {
        const details = apiError.error.details
          .map(d => d.field ? `${d.field}: ${d.message}` : d.message)
          .join(', ');
        message += ` (${details})`;
      }

      return new Error(message);
    }

    // Handle specific HTTP status codes
    if (error.response?.status === 500) {
      return new Error('Server error occurred. Please try again later or contact support.');
    }

    if (error.response?.status === 0) {
      return new Error('Cannot connect to server. Please check if the server is running.');
    }

    return new Error(error.message || 'Network error');
  }

  // Generic HTTP methods
  async post<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  async get<T = any>(url: string, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.patch<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }

  // Authentication methods
  async login(email: string, password: string): Promise<{ user: any; tokens: any; requires2FA?: boolean; sessionToken?: string }> {
    const payload = { email, password };

    const response = await this.axiosInstance.post<ApiResponse<{ user: any; tokens: any; requires2FA?: boolean; sessionToken?: string }>>(
      '/auth/login',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        transformRequest: [(data) => JSON.stringify(data)],
      }
    );

    const responseData = response.data?.data ?? {};
    const { user, tokens, requires2FA, sessionToken } = responseData;

    // If 2FA is required, return session token without setting tokens
    if (requires2FA && sessionToken) {
      return { user: null, tokens: null, requires2FA: true, sessionToken };
    }

    if (!user || !tokens?.accessToken || !tokens?.refreshToken) {
      throw new Error('Invalid login response');
    }

    this.setTokens(tokens.accessToken, tokens.refreshToken);

    return { user, tokens };
  }

  // 2FA methods
  async send2FACode(sessionToken: string): Promise<void> {
    const response = await this.axiosInstance.post<ApiResponse<{ message: string }>>(
      '/auth/2fa/send',
      { sessionToken }
    );
    return response.data?.data as any;
  }

  async verify2FA(sessionToken: string, code: string): Promise<{ user: any; tokens: any }> {
    const response = await this.axiosInstance.post<ApiResponse<{ user: any; tokens: any }>>(
      '/auth/2fa/verify',
      { sessionToken, code }
    );

    const responseData = response.data?.data ?? {};
    const { user, tokens } = responseData;

    if (!user || !tokens?.accessToken || !tokens?.refreshToken) {
      throw new Error('Invalid 2FA verification response');
    }

    this.setTokens(tokens.accessToken, tokens.refreshToken);

    return { user, tokens };
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    username: string;
    role?: string;
  }): Promise<{ user: any; tokens: any }> {
    // Public registration has been disabled in this deployment. Users must be created by an Admin
    // via the Admin panel. This client-side method is intentionally disabled to avoid accidental
    // calls to a removed endpoint.
    throw new Error('Registration is disabled. Please ask an admin to create an account.');
  }

  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      try {
        await this.axiosInstance.post('/auth/logout', { refreshToken });
      } catch (error) {
        // Ignore logout errors
      }
    }
    this.clearTokens();
  }

  async getProfile(): Promise<any> {
    const response = await this.axiosInstance.get<ApiResponse<{ user: any }>>('/users/profile');
    const user = response.data?.data?.user;
    if (!user) {
      throw new Error('Invalid profile response');
    }
    return user;
  }

  async updateProfile(updates: { firstName?: string; lastName?: string; username?: string }): Promise<any> {
    const response = await this.axiosInstance.put<ApiResponse<{ user: any }>>('/users/profile', updates);
    const user = response.data?.data?.user;
    if (!user) {
      throw new Error('Invalid profile update response');
    }
    return user;
  }

  // Tech Pack methods
  async listTechPacks(params: { page?: number; limit?: number; q?: string; status?: string; designer?: string; } = {}): Promise<TechPackListResponse> {
    console.log('📡 API: listTechPacks called with params:', params);
    const response = await this.axiosInstance.get<ApiResponse<ApiTechPack[]>>('/techpacks', { params });
    console.log('📡 API: Raw response:', response.data);
    const responseData = (response.data ?? {}) as any;
    // Handle both normal and cached response shapes
    // Normal: { success, data: ApiTechPack[], pagination }
    // Cached: { success, data: { data: ApiTechPack[], pagination } }
    let items: ApiTechPack[] = [];
    let pagination: any = undefined;

    if (Array.isArray(responseData.data)) {
      // Normal shape
      items = responseData.data as ApiTechPack[];
      pagination = responseData.pagination;
    } else if (responseData.data && typeof responseData.data === 'object') {
      // Cached shape with nested data
      const nested = responseData.data as any;
      if (Array.isArray(nested.data)) {
        items = nested.data as ApiTechPack[];
        pagination = nested.pagination ?? responseData.pagination;
      }
    }

    const result: TechPackListResponse = {
      data: items,
      total: pagination?.total ?? 0,
      page: pagination?.page ?? 1,
      totalPages: pagination?.totalPages ?? 1,
    };
    return result;
  }

  async createTechPack(data: CreateTechPackInput): Promise<ApiTechPack> {
    const response = await this.axiosInstance.post<ApiResponse<ApiTechPack>>('/techpacks', data);
    const techPack = response.data?.data;
    if (!techPack) {
      throw new Error('Invalid create tech pack response');
    }
    return techPack;
  }

  async cloneTechPack(config: {
    sourceId: string;
    newProductName: string;
    newArticleCode: string;
    season?: string;
    copySections: string[];
  }): Promise<ApiTechPack> {
    const response = await this.axiosInstance.post<ApiResponse<ApiTechPack>>('/techpacks', {
      mode: 'clone',
      ...config
    });
    const techPack = response.data?.data;
    if (!techPack) {
      throw new Error('Invalid clone tech pack response');
    }
    return techPack;
  }

  async getTechPack(id: string): Promise<ApiTechPack> {
    const response = await this.axiosInstance.get<ApiResponse<ApiTechPack>>(`/techpacks/${id}`);
    const raw = response.data?.data as any;
    if (!raw) {
      throw new Error('Tech pack not found');
    }
    // Normalize server snapshots to client shape
    const techPack = {
      ...raw,
      // Ensure arrays exist
      bom: Array.isArray(raw.bom) ? raw.bom : [],
      measurements: Array.isArray(raw.measurements) ? raw.measurements : [],
      // Backend uses howToMeasure; client uses howToMeasures
      howToMeasures: Array.isArray(raw.howToMeasures)
        ? raw.howToMeasures
        : Array.isArray(raw.howToMeasure)
          ? raw.howToMeasure
          : [],
      sampleMeasurementRounds: Array.isArray(raw.sampleMeasurementRounds) ? raw.sampleMeasurementRounds : [],
      colorways: Array.isArray(raw.colorways) ? raw.colorways : []
    } as any;
    if (!techPack) {
      throw new Error('Tech pack not found');
    }
    return techPack;
  }

  async updateTechPack(id: string, data: Partial<ApiTechPack>): Promise<ApiTechPack> {
    const response = await this.axiosInstance.put<ApiResponse<any>>(`/techpacks/${id}`, data);
    // Backend may return one of various shapes; normalize defensively
    const root = response.data ?? {} as any;
    const payload: any = root.data ?? root;
    const techPack = payload.techpack ?? payload.updatedTechPack ?? payload;
    if (!techPack || (techPack && techPack.success !== undefined)) {
      // If we accidentally captured the wrapper, log and throw
      console.error('Invalid update tech pack response received:', response.data);
      throw new Error('Invalid update tech pack response');
    }
    return techPack as ApiTechPack;
  }

  async patchTechPack(id: string, data: Partial<ApiTechPack>): Promise<ApiTechPack> {
    const response = await this.axiosInstance.patch<ApiResponse<any>>(`/techpacks/${id}`, data);
    // Support both legacy and new response shapes
    const payload: any = response.data ?? {};
    const updatedTechPack = payload.updatedTechPack ?? payload.data?.techpack ?? payload.data;
    if (!updatedTechPack) {
      // Invalid response format
      throw new Error('Invalid patch tech pack response');
    }
    return updatedTechPack as ApiTechPack;
  }

  async deleteTechPack(id: string): Promise<{ message: string }> {
    const response = await this.axiosInstance.delete<ApiResponse<{ message: string }>>(`/techpacks/${id}`);
    return { message: response.data?.message || 'Tech pack deleted successfully' };
  }

  async duplicateTechPack(id: string, keepVersion = false): Promise<ApiTechPack> {
    const response = await this.axiosInstance.post<ApiResponse<ApiTechPack>>(`/techpacks/${id}/duplicate`, { keepVersion });
    const techPack = response.data?.data;
    if (!techPack) {
      throw new Error('Invalid duplicate tech pack response');
    }
    return techPack;
  }

  /**
   * Export TechPack as PDF
   * @param id TechPack ID
   * @param options PDF export options (orientation, format)
   * @returns Blob of PDF file
   */
  async exportTechPackPDF(id: string, options?: { orientation?: 'portrait' | 'landscape'; format?: 'A4' | 'Letter' | 'Legal' }): Promise<Blob> {
    const params: any = {};
    if (options?.orientation) params.orientation = options.orientation;
    if (options?.format) params.format = options.format;

    const response = await this.axiosInstance.get(`/techpacks/${id}/pdf`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  }

  async bulkOperations(data: any): Promise<{ message: string; modifiedCount: number }> {
    const response = await this.axiosInstance.patch<ApiResponse<{ modifiedCount: number }>>('/techpacks/bulk', data);
    const responseData: any = response.data ?? {};
    return {
      message: responseData.message || 'Bulk operation completed',
      modifiedCount: responseData.data?.modifiedCount || 0
    };
  }

  // Admin User Management methods
  async getAllUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    users: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const response = await this.axiosInstance.get<ApiResponse<{
      users: any[];
      pagination: any;
    }>>('/admin/users', { params });
    const responseData = response.data?.data ?? {};
    return {
      users: responseData.users || [],
      pagination: responseData.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
    };
  }

  async getUserById(id: string): Promise<any> {
    const response = await this.axiosInstance.get<ApiResponse<{ user: any }>>(`/admin/users/${id}`);
    const user = response.data?.data?.user;
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async createUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<any> {
    const response = await this.axiosInstance.post<ApiResponse<{ user: any }>>('/admin/users', userData);
    const user = response.data?.data?.user;
    if (!user) {
      throw new Error('Invalid create user response');
    }
    return user;
  }

  async updateUser(id: string, userData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  }): Promise<any> {
    const response = await this.axiosInstance.put<ApiResponse<{ user: any }>>(`/admin/users/${id}`, userData);
    const user = response.data?.data?.user;
    if (!user) {
      throw new Error('Invalid update user response');
    }
    return user;
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    const response = await this.axiosInstance.delete<ApiResponse<{}>>(`/admin/users/${id}`);
    return { message: response.data?.message || 'User deleted successfully' };
  }

  async updateUserRole(id: string, role: string): Promise<{ role: string }> {
    const response = await this.axiosInstance.patch<ApiResponse<{ role: string }>>(`/admin/users/${id}/role`, { role });
    const responseData = response.data?.data ?? {};
    return { role: responseData.role || role };
  }

  async updateUserTwoFactor(id: string, enabled: boolean): Promise<{ is2FAEnabled: boolean }> {
    const response = await this.axiosInstance.patch<ApiResponse<{ is2FAEnabled: boolean }>>(
      `/admin/users/${id}/2fa`,
      { enabled }
    );
    const responseData = response.data?.data ?? {};
    return { is2FAEnabled: responseData.is2FAEnabled ?? enabled };
  }

  async resetUserPassword(id: string, newPassword: string): Promise<{ message: string }> {
    const response = await this.axiosInstance.patch<ApiResponse<{}>>(`/admin/users/${id}/password`, { newPassword });
    return { message: response.data?.message || 'Password reset successfully' };
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    roleDistribution: Record<string, number>;
    recentUsers: any[];
  }> {
    const response = await this.axiosInstance.get<ApiResponse<{
      totalUsers: number;
      roleDistribution: Record<string, number>;
      recentUsers: any[];
    }>>('/admin/users/stats');
    const responseData = response.data?.data ?? {};
    return {
      totalUsers: responseData.totalUsers || 0,
      roleDistribution: responseData.roleDistribution || {},
      recentUsers: responseData.recentUsers || []
    };
  }

  // Revision APIs
  getRevisions = (techPackId: string, params?: any): Promise<any> => this.get(`/techpacks/${techPackId}/revisions`, { params });
  getRevision = (revisionId: string): Promise<any> => this.get(`/revisions/${revisionId}`);
  compareRevisions = (techPackId: string, from: string, to: string): Promise<any> => this.get(`/techpacks/${techPackId}/revisions/compare`, { params: { from, to } });

  // Revert API with reason
  revertToRevision = async (techPackId: string, revisionId: string, reason?: string): Promise<ApiResponse<any>> => {
    const response = await this.axiosInstance.post<ApiResponse<any>>(`/revisions/revert/${techPackId}/${revisionId}`, { reason });
    return response.data;
  };

  // Add comment to revision
  addRevisionComment = async (revisionId: string, comment: string): Promise<ApiResponse<any>> => {
    const response = await this.axiosInstance.post<ApiResponse<any>>(`/revisions/${revisionId}/comments`, { comment });
    return response.data;
  };

  // Sharing & Access Control APIs
  async getAccessList(techPackId: string): Promise<any> {
    const response = await this.axiosInstance.get(`/techpacks/${techPackId}/access`);
    return response.data;
  }

  async getShareableUsers(techPackId: string, opts: { includeAdmins?: boolean; includeAll?: boolean } = {}): Promise<any> {
    const params: any = {};
    if (opts.includeAdmins) params.includeAdmins = true;
    if (opts.includeAll) params.includeAll = true;
    const response = await this.axiosInstance.get(`/techpacks/${techPackId}/shareable-users`, { params });
    // Normalize: ensure we always return an array of users regardless of wrapper shape
    const root = response.data ?? {};
    if (Array.isArray(root)) return root;
    if (Array.isArray(root.data)) return root.data;
    // If server returned wrapper { success, data: [...] } or { data: [...] }
    // fallback to empty array to avoid UI crashes
    return [];
  }

  async shareTechPack(techPackId: string, data: { userId: string; role: string }): Promise<any> {
    const response = await this.axiosInstance.put(`/techpacks/${techPackId}/share`, data);
    return response.data;
  }

  async updateShareRole(techPackId: string, userId: string, data: { role: string }): Promise<any> {
    const response = await this.axiosInstance.patch(`/techpacks/${techPackId}/share/${userId}`, data);
    return response.data;
  }

  async revokeShare(techPackId: string, userId: string): Promise<any> {
    const response = await this.axiosInstance.delete(`/techpacks/${techPackId}/share/${userId}`);
    return response.data;
  }

  async getAuditLogs(techPackId: string): Promise<any> {
    const response = await this.axiosInstance.get(`/techpacks/${techPackId}/audit-logs`);
    return response.data;
  }
}

export const api = new ApiClient();