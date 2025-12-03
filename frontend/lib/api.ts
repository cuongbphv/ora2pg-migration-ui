/**
 * API Service for Oracle to PostgreSQL Migration
 * 
 * This service provides methods to interact with the Spring Boot backend API.
 * To use this service, update the components to call these methods instead of using mock data.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090/api';

export interface ApiResponse<T> {
  data?: T | any;
  error?: string;
}

class ApiService {
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = this.getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers,
        ...options,
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          return { error: 'Authentication required' };
        }
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        return { error: error.error || `HTTP ${response.status}` };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  // Auth
  async login(credentials: { email: string; password: string }) {
    return this.request<{ token: string; email: string; name: string; role: string; id: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(data: { email: string; password: string; name: string; role?: string }) {
    return this.request<{ token: string; email: string; name: string; role: string; id: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Projects
  async getProjects() {
    return this.request('/projects');
  }

  async getProject(id: string) {
    return this.request(`/projects/${id}`);
  }

  async createProject(name: string, description: string) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async updateProject(project: any) {
    return this.request(`/projects/${project.id}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    });
  }

  async deleteProject(id: string) {
    return this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async saveConnection(projectId: string, type: 'source' | 'target', connection: any) {
    return this.request(`/projects/${projectId}/connections/${type}`, {
      method: 'POST',
      body: JSON.stringify(connection),
    });
  }

  async saveTableMappings(projectId: string, tableMappings: any[]) {
    return this.request(`/projects/${projectId}/table-mappings`, {
      method: 'PUT',
      body: JSON.stringify(tableMappings),
    });
  }

  // Connections
  async testConnection(connection: any) {
    return this.request('/connections/test', {
      method: 'POST',
      body: JSON.stringify(connection),
    });
  }

  // Database
  async discoverTables(connection: any, schema: string, tableNameFilter?: string) {
    return this.request('/database/discover-tables', {
      method: 'POST',
      body: JSON.stringify({ connection, schema, tableNameFilter }),
    });
  }

  async autoMapTables(sourceTables: any[], targetSchema: string) {
    return this.request('/database/auto-map', {
      method: 'POST',
      body: JSON.stringify({ sourceTables, targetSchema }),
    });
  }

  // Migration
  async startMigration(projectId: string, settings?: any) {
    return this.request(`/migration/start/${projectId}`, {
      method: 'POST',
      body: settings ? JSON.stringify(settings) : undefined,
    });
  }

  async getMigrationProgress(projectId: string) {
    return this.request(`/migration/progress/${projectId}`);
  }

  async pauseMigration(projectId: string) {
    return this.request(`/migration/pause/${projectId}`, {
      method: 'POST',
    });
  }

  async resumeMigration(projectId: string) {
    return this.request(`/migration/resume/${projectId}`, {
      method: 'POST',
    });
  }

  // Settings
  async getSettings() {
    return this.request('/settings');
  }

  async updateSettings(settings: any) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }
}

export const apiService = new ApiService();

