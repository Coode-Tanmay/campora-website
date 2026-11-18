import { CamporaOrder, AuthUser, OrderStatus, PaymentStatus } from '../types';

const API_BASE = '/api';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('campora_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // for HTTP-only cookies
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error || `Request failed with status ${res.status}`, res.status);
  }

  return data as T;
}

export const api = {
  // Auth
  async checkSession(): Promise<{ authenticated: boolean; user: AuthUser | null }> {
    return fetchJson<{ authenticated: boolean; user: AuthUser | null }>(`${API_BASE}/auth/me`);
  },

  async getOAuthConfig(): Promise<{
    googleConfigured: boolean;
    googleClientId: string;
    googleRedirectUri: string;
    microsoftConfigured: boolean;
    microsoftClientId: string;
    microsoftRedirectUri: string;
    appUrl: string;
  }> {
    return fetchJson<{
      googleConfigured: boolean;
      googleClientId: string;
      googleRedirectUri: string;
      microsoftConfigured: boolean;
      microsoftClientId: string;
      microsoftRedirectUri: string;
      appUrl: string;
    }>(`${API_BASE}/auth/oauth-config?origin=${encodeURIComponent(window.location.origin)}`);
  },

  async getGoogleAuthUrl(): Promise<{
    configured: boolean;
    provider: string;
    url?: string;
    redirectUri: string;
    error?: string;
    requiredEnvVars?: string[];
    instructions?: any;
  }> {
    return fetchJson(`${API_BASE}/auth/google/url?origin=${encodeURIComponent(window.location.origin)}`);
  },

  async getMicrosoftAuthUrl(): Promise<{
    configured: boolean;
    provider: string;
    url?: string;
    redirectUri: string;
    error?: string;
    requiredEnvVars?: string[];
    instructions?: any;
  }> {
    return fetchJson(`${API_BASE}/auth/microsoft/url?origin=${encodeURIComponent(window.location.origin)}`);
  },

  async adminLogin(username: string, password: string): Promise<{ success: boolean; user: AuthUser; token: string }> {
    const res = await fetchJson<{ success: boolean; user: AuthUser; token: string }>(`${API_BASE}/auth/admin/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (res.token) {
      localStorage.setItem('campora_token', res.token);
    }
    return res;
  },

  async customerLogin(data: { email: string; password?: string; name?: string; whatsapp?: string; college?: string }): Promise<{ success: boolean; user: AuthUser; token: string }> {
    const res = await fetchJson<{ success: boolean; user: AuthUser; token: string }>(`${API_BASE}/auth/customer/login`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      localStorage.setItem('campora_token', res.token);
    }
    return res;
  },

  async customerOAuth(data: { provider: 'google' | 'microsoft'; email: string; name?: string; college?: string; whatsapp?: string; avatar?: string }): Promise<{ success: boolean; user: AuthUser; token: string }> {
    const res = await fetchJson<{ success: boolean; user: AuthUser; token: string }>(`${API_BASE}/auth/customer/oauth`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      localStorage.setItem('campora_token', res.token);
    }
    return res;
  },

  async logout(): Promise<void> {
    localStorage.removeItem('campora_token');
    await fetchJson(`${API_BASE}/auth/logout`, { method: 'POST' }).catch(() => {});
  },

  // Customer Orders (Strictly user-scoped)
  async getCustomerOrders(): Promise<{ orders: CamporaOrder[] }> {
    return fetchJson<{ orders: CamporaOrder[] }>(`${API_BASE}/customer/orders`);
  },

  async getCustomerOrderById(id: string): Promise<{ order: CamporaOrder }> {
    return fetchJson<{ order: CamporaOrder }>(`${API_BASE}/customer/orders/${id}`);
  },

  async createOrder(orderData: Partial<CamporaOrder>): Promise<{ success: boolean; order: CamporaOrder }> {
    return fetchJson<{ success: boolean; order: CamporaOrder }>(`${API_BASE}/customer/orders`, {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  async submitPaymentProof(orderId: string, payload: { utrNumber: string; screenshotUrl?: string; screenshotName?: string; screenshotSize?: string }): Promise<{ success: boolean; order: CamporaOrder; message: string }> {
    return fetchJson<{ success: boolean; order: CamporaOrder; message: string }>(`${API_BASE}/customer/orders/${orderId}/payment`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getCustomerProfile(): Promise<{ user: AuthUser; stats: any }> {
    return fetchJson<{ user: AuthUser; stats: any }>(`${API_BASE}/customer/profile`);
  },

  // Admin APIs (Require admin role)
  async getAdminOverview(): Promise<{ overview: any; recentOrders: CamporaOrder[] }> {
    return fetchJson<{ overview: any; recentOrders: CamporaOrder[] }>(`${API_BASE}/admin/overview`);
  },

  async getAdminOrders(params?: { status?: string; paymentStatus?: string; search?: string; sort?: string }): Promise<{ orders: CamporaOrder[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.paymentStatus) searchParams.set('paymentStatus', params.paymentStatus);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sort) searchParams.set('sort', params.sort);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return fetchJson<{ orders: CamporaOrder[]; total: number }>(`${API_BASE}/admin/orders${query}`);
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, rejectionReason?: string, cancellationReason?: string): Promise<{ success: boolean; order: CamporaOrder }> {
    return fetchJson<{ success: boolean; order: CamporaOrder }>(`${API_BASE}/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, rejectionReason, cancellationReason }),
    });
  },

  async verifyPayment(orderId: string, action: 'confirm' | 'reject', rejectionReason?: string): Promise<{ success: boolean; order: CamporaOrder; message: string }> {
    return fetchJson<{ success: boolean; order: CamporaOrder; message: string }>(`${API_BASE}/admin/orders/${orderId}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ action, rejectionReason }),
    });
  },

  async uploadDeliverable(orderId: string, deliverable: { title: string; fileType: string; fileSize: string; downloadUrl?: string }): Promise<{ success: boolean; order: CamporaOrder }> {
    return fetchJson<{ success: boolean; order: CamporaOrder }>(`${API_BASE}/admin/orders/${orderId}/deliverables`, {
      method: 'POST',
      body: JSON.stringify(deliverable),
    });
  },

  async updateAdminNotes(orderId: string, adminNotes: string): Promise<{ success: boolean; order: CamporaOrder }> {
    return fetchJson<{ success: boolean; order: CamporaOrder }>(`${API_BASE}/admin/orders/${orderId}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ adminNotes }),
    });
  },

  async getAdminCustomers(): Promise<{ customers: any[] }> {
    return fetchJson<{ customers: any[] }>(`${API_BASE}/admin/customers`);
  },

  async getAdminFiles(): Promise<{ files: any[] }> {
    return fetchJson<{ files: any[] }>(`${API_BASE}/admin/files`);
  },
};
