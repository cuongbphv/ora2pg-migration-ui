/**
 * API Service for Oracle to PostgreSQL Migration
 * 
 * This service provides methods to interact with the Spring Boot backend API.
 * To use this service, update the components to call these methods instead of using mock data.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8095/api';

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

  // Pg2Pg Pipelines
  async getPipelines() {
    return this.request('/pg2pg/pipelines');
  }

  async getPipeline(id: string) {
    return this.request(`/pg2pg/pipelines/${id}`);
  }

  async createPipeline(name: string, description?: string) {
    return this.request('/pg2pg/pipelines', {
      method: 'POST',
      body: JSON.stringify({ name, description: description || '' }),
    });
  }

  async updatePipeline(pipeline: any) {
    return this.request(`/pg2pg/pipelines/${pipeline.id}`, {
      method: 'PUT',
      body: JSON.stringify(pipeline),
    });
  }

  async deletePipeline(id: string) {
    return this.request(`/pg2pg/pipelines/${id}`, {
      method: 'DELETE',
    });
  }

  async addStepToPipeline(pipelineId: string, step: any) {
    return this.request(`/pg2pg/pipelines/${pipelineId}/steps`, {
      method: 'POST',
      body: JSON.stringify(step),
    });
  }

  async updateStep(stepId: string, step: any) {
    return this.request(`/pg2pg/pipelines/steps/${stepId}`, {
      method: 'PUT',
      body: JSON.stringify(step),
    });
  }

  async deleteStep(stepId: string) {
    return this.request(`/pg2pg/pipelines/steps/${stepId}`, {
      method: 'DELETE',
    });
  }

  async savePipelineConnection(pipelineId: string, type: 'source' | 'target', connection: any) {
    return this.request(`/pg2pg/pipelines/${pipelineId}/connections/${type}`, {
      method: 'POST',
      body: JSON.stringify(connection),
    });
  }

  async startPipeline(pipelineId: string) {
    return this.request(`/pg2pg/pipelines/${pipelineId}/start`, {
      method: 'POST',
    });
  }

  async stopPipeline(pipelineId: string) {
    return this.request(`/pg2pg/pipelines/${pipelineId}/stop`, {
      method: 'POST',
    });
  }

  async getPipelineLogs(pipelineId: string, executionId?: string) {
    const query = executionId ? `?executionId=${encodeURIComponent(executionId)}` : '';
    return this.request(`/pg2pg/pipelines/${pipelineId}/logs${query}`);
  }

  async getPipelineExecutions(pipelineId: string) {
    return this.request(`/pg2pg/pipelines/${pipelineId}/executions`);
  }

  async importJsonMapping(pipelineId: string, file: File) {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);
    
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Don't set Content-Type - browser will set it with boundary for FormData
    
    const response = await fetch(`${API_BASE_URL}/pg2pg/pipelines/${pipelineId}/import-json`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        return { error: 'Authentication required' };
      }
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      return { error: error.message || error.error || 'Request failed' };
    }

    const data = await response.json();
    return { data };
  }

  async importJsonMappingFromBody(pipelineId: string, jsonContent: string) {
    return this.request(`/pg2pg/pipelines/${pipelineId}/import-json-body`, {
      method: 'POST',
      body: jsonContent,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Data Type Mapping Rules
  async getDataTypeRules() {
    return this.request('/data-type-rules');
  }

  async getCustomDataTypeRules() {
    return this.request('/data-type-rules/custom');
  }

  async getDefaultDataTypeRules() {
    return this.request('/data-type-rules/defaults');
  }

  async createDataTypeRule(rule: any) {
    return this.request('/data-type-rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
  }

  async updateDataTypeRule(id: string, rule: any) {
    return this.request(`/data-type-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(rule),
    });
  }

  async deleteDataTypeRule(id: string) {
    return this.request(`/data-type-rules/${id}`, {
      method: 'DELETE',
    });
  }

  // Migration Log Export
  async exportMigrationLogs(projectId: string, format: 'csv' | 'excel' = 'excel') {
    const token = this.getToken();
    const endpoint = format === 'csv' 
      ? `/migration/logs/${projectId}/export/csv`
      : `/migration/logs/${projectId}/export/excel`;
    
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        return { error: 'Authentication required' };
      }
      const error = await response.json().catch(() => ({ error: 'Export failed' }));
      return { error: error.message || error.error || 'Export failed' };
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration_logs_${projectId}.${format === 'csv' ? 'csv' : 'xlsx'}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return { data: true };
  }

  // Data Validation
  async compareRowCounts(projectId: string, tableNames?: string[]) {
    return this.request('/validation/row-count/' + projectId, {
      method: 'POST',
      body: JSON.stringify({ tableNames: tableNames || null }),
    });
  }

  async compareChecksums(projectId: string, options?: {
    tableNames?: string[];
    algorithm?: string;
    columnsToInclude?: string[];
  }) {
    return this.request('/validation/checksum/' + projectId, {
      method: 'POST',
      body: JSON.stringify({
        tableNames: options?.tableNames || null,
        algorithm: options?.algorithm || 'MD5',
        columnsToInclude: options?.columnsToInclude || null,
      }),
    });
  }

  async performDryRun(projectId: string, tableNames?: string[]) {
    return this.request('/validation/dry-run/' + projectId, {
      method: 'POST',
      body: JSON.stringify({ tableNames: tableNames || null }),
    });
  }

  async runAllValidations(projectId: string, options?: {
    tableNames?: string[];
    algorithm?: string;
    columnsToInclude?: string[];
    includeDryRun?: boolean;
  }) {
    return this.request('/validation/all/' + projectId, {
      method: 'POST',
      body: JSON.stringify({
        tableNames: options?.tableNames || null,
        checksumAlgorithm: options?.algorithm || 'MD5',
        columnsToInclude: options?.columnsToInclude || null,
        includeDryRun: options?.includeDryRun !== false,
      }),
    });
  }
}

export const apiService = new ApiService();

