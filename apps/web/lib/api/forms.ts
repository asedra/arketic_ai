/**
 * Forms API client for Adaptive Cards Designer
 */

import { API_BASE_URL } from '@/lib/config';

// Types
export interface FormData {
  id?: string;
  title: string;
  description?: string;
  adaptive_card_json: any;
  elements_json?: any;
  visibility?: 'private' | 'organization' | 'public';
  allow_anonymous?: boolean;
  submit_message?: string;
  redirect_url?: string;
  email_notifications?: string[];
  webhook_url?: string;
  max_submissions?: number;
  expires_at?: string;
  tags?: string[];
  category?: string;
  status?: 'draft' | 'published' | 'archived' | 'deleted';
  is_template?: boolean;
  submission_count?: number;
  view_count?: number;
  version?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  published_at?: string;
  is_expired?: boolean;
  is_submission_allowed?: boolean;
}

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  adaptive_card_json: any;
  elements_json?: any;
  category: string;
  tags?: string[];
  is_public: boolean;
  is_featured: boolean;
  usage_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FormListResponse {
  items: FormData[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface FormTemplateListResponse {
  items: FormTemplate[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  data: Record<string, any>;
  submitter_user_id?: string;
  is_processed: boolean;
  processing_error?: string;
  submitted_at: string;
  processed_at?: string;
}

// API Client Class
export class FormsApiClient {
  private baseUrl: string;
  private getHeaders: () => Record<string, string>;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/v1`;
    this.getHeaders = () => {
      const token = localStorage.getItem('auth_token');
      return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      };
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  // Forms CRUD operations
  async createForm(formData: Omit<FormData, 'id' | 'created_at' | 'updated_at'>): Promise<FormData> {
    const response = await fetch(`${this.baseUrl}/forms`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(formData),
    });
    return this.handleResponse<FormData>(response);
  }

  async getForms(params?: {
    page?: number;
    size?: number;
    status?: string;
    visibility?: string;
    is_template?: boolean;
    category?: string;
    search?: string;
    tags?: string[];
    created_by?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }): Promise<FormListResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v));
          } else {
            queryParams.append(key, String(value));
          }
        }
      });
    }

    const response = await fetch(`${this.baseUrl}/forms?${queryParams}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<FormListResponse>(response);
  }

  async getForm(formId: string): Promise<FormData> {
    const response = await fetch(`${this.baseUrl}/forms/${formId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<FormData>(response);
  }

  async updateForm(formId: string, formData: Partial<FormData>): Promise<FormData> {
    const response = await fetch(`${this.baseUrl}/forms/${formId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(formData),
    });
    return this.handleResponse<FormData>(response);
  }

  async deleteForm(formId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/forms/${formId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ success: boolean; message: string }>(response);
  }

  // Form Templates
  async createTemplate(templateData: Omit<FormTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>): Promise<FormTemplate> {
    const response = await fetch(`${this.baseUrl}/forms/templates`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(templateData),
    });
    return this.handleResponse<FormTemplate>(response);
  }

  async getTemplates(params?: {
    page?: number;
    size?: number;
    category?: string;
    is_featured?: boolean;
    search?: string;
    tags?: string[];
    sort?: string;
    order?: 'asc' | 'desc';
  }): Promise<FormTemplateListResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v));
          } else {
            queryParams.append(key, String(value));
          }
        }
      });
    }

    const response = await fetch(`${this.baseUrl}/forms/templates?${queryParams}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<FormTemplateListResponse>(response);
  }

  async getTemplate(templateId: string): Promise<FormTemplate> {
    const response = await fetch(`${this.baseUrl}/forms/templates/${templateId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<FormTemplate>(response);
  }

  async createFormFromTemplate(templateId: string, title: string): Promise<FormData> {
    const response = await fetch(`${this.baseUrl}/forms/templates/${templateId}/use?title=${encodeURIComponent(title)}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<FormData>(response);
  }

  // Form Submissions
  async submitForm(formId: string, data: Record<string, any>): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/forms/${formId}/submit`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ data }),
    });
    return this.handleResponse<{ success: boolean; message: string }>(response);
  }

  async getFormSubmissions(formId: string, page = 1, size = 10): Promise<{
    items: FormSubmission[];
    total: number;
    page: number;
    size: number;
    pages: number;
  }> {
    const response = await fetch(`${this.baseUrl}/forms/${formId}/submissions?page=${page}&size=${size}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{
      items: FormSubmission[];
      total: number;
      page: number;
      size: number;
      pages: number;
    }>(response);
  }

  // Form Versions
  async getFormVersions(formId: string, page = 1, size = 10): Promise<{
    items: any[];
    total: number;
    page: number;
    size: number;
    pages: number;
  }> {
    const response = await fetch(`${this.baseUrl}/forms/${formId}/versions?page=${page}&size=${size}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{
      items: any[];
      total: number;
      page: number;
      size: number;
      pages: number;
    }>(response);
  }

  // Form Sharing
  async shareForm(formId: string, shareData: {
    user_email: string;
    permission: 'view' | 'edit' | 'admin';
    can_reshare?: boolean;
    message?: string;
    expires_at?: string;
  }): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/forms/${formId}/share`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(shareData),
    });
    return this.handleResponse<{ success: boolean; message: string }>(response);
  }
}

// Singleton instance
export const formsApi = new FormsApiClient();

// Hook for easier usage in components
export function useFormsApi() {
  return formsApi;
}