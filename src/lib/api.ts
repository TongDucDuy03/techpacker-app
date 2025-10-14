import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { TechPack, TechPackListResponse, CreateTechPackInput, BulkOperationPayload } from '../types/techpack';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

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
      timeout: 10000,
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
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling and token refresh
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
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
    window.location.href = '/login';
  }

  private formatError(error: AxiosError<ApiError>): Error {
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

    return new Error(error.message || 'Network error');
  }

  // Authentication methods
  async login(email: string, password: string): Promise<{ user: any; tokens: any }> {
    const response = await this.axiosInstance.post<ApiResponse<{ user: any; tokens: any }>>('/auth/login', {
      email,
      password,
    });

    const responseData = response.data?.data ?? {};
    const { user, tokens } = responseData;

    if (!user || !tokens?.accessToken || !tokens?.refreshToken) {
      throw new Error('Invalid login response');
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
    const response = await this.axiosInstance.post<ApiResponse<{ user: any; tokens: any }>>('/auth/register', userData);

    const responseData = response.data?.data ?? {};
    const { user, tokens } = responseData;

    if (!user || !tokens?.accessToken || !tokens?.refreshToken) {
      throw new Error('Invalid registration response');
    }

    this.setTokens(tokens.accessToken, tokens.refreshToken);

    return { user, tokens };
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
    const response = await this.axiosInstance.get<ApiResponse<TechPack[]>>('/techpacks', { params });
    const responseData = response.data ?? {};
    const { data = [], pagination } = responseData;

    return {
      data,
      total: pagination?.total || 0,
      page: pagination?.page || 1,
      totalPages: pagination?.totalPages || 1,
    };
  }

  async createTechPack(data: CreateTechPackInput): Promise<TechPack> {
    const response = await this.axiosInstance.post<ApiResponse<TechPack>>('/techpacks', data);
    const techPack = response.data?.data;
    if (!techPack) {
      throw new Error('Invalid create tech pack response');
    }
    return techPack;
  }

  async getTechPack(id: string): Promise<TechPack> {
    const response = await this.axiosInstance.get<ApiResponse<TechPack>>(`/techpacks/${id}`);
    const techPack = response.data?.data;
    if (!techPack) {
      throw new Error('Tech pack not found');
    }
    return techPack;
  }

  async updateTechPack(id: string, data: Partial<TechPack>): Promise<TechPack> {
    const response = await this.axiosInstance.put<ApiResponse<TechPack>>(`/techpacks/${id}`, data);
    const techPack = response.data?.data;
    if (!techPack) {
      throw new Error('Invalid update tech pack response');
    }
    return techPack;
  }

  async patchTechPack(id: string, data: Partial<TechPack>): Promise<TechPack> {
    const response = await this.axiosInstance.patch<ApiResponse<TechPack>>(`/techpacks/${id}`, data);
    const techPack = response.data?.data;
    if (!techPack) {
      throw new Error('Invalid patch tech pack response');
    }
    return techPack;
  }

  async deleteTechPack(id: string): Promise<{ message: string }> {
    const response = await this.axiosInstance.delete<ApiResponse<{ message: string }>>(`/techpacks/${id}`);
    return { message: response.data?.message || 'Tech pack deleted successfully' };
  }

  async duplicateTechPack(id: string, keepVersion = false): Promise<TechPack> {
    const response = await this.axiosInstance.post<ApiResponse<TechPack>>(`/techpacks/${id}/duplicate`, { keepVersion });
    const techPack = response.data?.data;
    if (!techPack) {
      throw new Error('Invalid duplicate tech pack response');
    }
    return techPack;
  }

  async bulkOperations(data: BulkOperationPayload): Promise<{ message: string; modifiedCount: number }> {
    const response = await this.axiosInstance.patch<ApiResponse<{ modifiedCount: number }>>('/techpacks/bulk', data);
    const responseData = response.data ?? {};
    return {
      message: responseData.message || 'Bulk operation completed',
      modifiedCount: responseData.data?.modifiedCount || 0
    };
  }
}

export const api = new ApiClient();


