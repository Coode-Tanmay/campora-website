import { CamporaOrder, AuthUser, OrderStatus, PaymentStatus, OrderFileUploadPayload } from '../types';

const API_BASE = '/api';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };


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
    return res;
  },

  async customerLogin(data: { email: string; password?: string; name?: string; whatsapp?: string; college?: string; referralCode?: string }): Promise<{ success: boolean; user?: AuthUser; token?: string; verificationRequired?: boolean; error?: string }> {
    const res = await fetchJson<{ success: boolean; user?: AuthUser; token?: string; verificationRequired?: boolean; error?: string }>(`${API_BASE}/auth/customer/login`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string; emailDeliveryAvailable?: boolean }> {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/auth/customer/password-reset/request`, { method: 'POST', body: JSON.stringify({ email }) });
  },

  async customerOAuth(data: { provider: 'google' | 'microsoft'; email: string; name?: string; college?: string; whatsapp?: string; avatar?: string }): Promise<{ success: boolean; user: AuthUser; token: string }> {
    const res = await fetchJson<{ success: boolean; user: AuthUser; token: string }>(`${API_BASE}/auth/customer/oauth`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  async logout(): Promise<void> {
    await fetchJson(`${API_BASE}/auth/logout`, { method: 'POST' }).catch(() => {});
  },

  async getCustomerNotifications(): Promise<{ notifications: Array<{ id: string; orderId: string; title: string; message: string; timestamp: string; read: boolean }> }> {
    return fetchJson(`${API_BASE}/customer/notifications`);
  },

  async markCustomerNotificationsRead(ids: string[]): Promise<{ success: boolean }> {
    return fetchJson(`${API_BASE}/customer/notifications/read`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },

  // Customer Orders (Strictly user-scoped)
  async getCustomerOrders(): Promise<{ orders: CamporaOrder[] }> {
    return fetchJson<{ orders: CamporaOrder[] }>(`${API_BASE}/customer/orders`);
  },

  async getCustomerOrderById(id: string): Promise<{ order: CamporaOrder }> {
    return fetchJson<{ order: CamporaOrder }>(`${API_BASE}/customer/orders/${id}`);
  },

  async createOrder(orderData: Partial<CamporaOrder>, uploadFiles: OrderFileUploadPayload[] = []): Promise<{ success: boolean; order: CamporaOrder }> {
    return fetchJson<{ success: boolean; order: CamporaOrder }>(`${API_BASE}/customer/orders`, {
      method: 'POST',
      body: JSON.stringify({ ...orderData, uploadFiles }),
    });
  },

  async cancelCustomerOrder(orderId: string): Promise<{ success: boolean; order: CamporaOrder }> {
    return fetchJson<{ success: boolean; order: CamporaOrder }>(`${API_BASE}/customer/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async submitPaymentProof(orderId: string, payload: { utrNumber?: string; screenshotUrl: string; screenshotName?: string; screenshotSize?: string }): Promise<{ success: boolean; order: CamporaOrder; message: string }> {
    return fetchJson<{ success: boolean; order: CamporaOrder; message: string }>(`${API_BASE}/customer/orders/${orderId}/payment`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getRazorpayConfig(): Promise<{ enabled: boolean; keyId: string | null; currency: 'INR' }> {
    return fetchJson<{ enabled: boolean; keyId: string | null; currency: 'INR' }>(`${API_BASE}/payments/razorpay/config`);
  },

  async createRazorpayOrder(orderId: string): Promise<{ keyId: string; orderId: string; amount: number; currency: 'INR'; camporaOrderId: string }> {
    return fetchJson<{ keyId: string; orderId: string; amount: number; currency: 'INR'; camporaOrderId: string }>(`${API_BASE}/customer/orders/${encodeURIComponent(orderId)}/razorpay/order`, { method: 'POST', body: JSON.stringify({}) });
  },

  async verifyRazorpayPayment(orderId: string, response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }): Promise<{ success: boolean; pending?: boolean; message: string; order?: CamporaOrder }> {
    return fetchJson<{ success: boolean; pending?: boolean; message: string; order?: CamporaOrder }>(`${API_BASE}/customer/orders/${encodeURIComponent(orderId)}/razorpay/verify`, { method: 'POST', body: JSON.stringify(response) });
  },

  async getCustomerCart(): Promise<{ items: CamporaOrder[] }> { return fetchJson(`${API_BASE}/customer/cart`); },
  async addCartItem(orderId: string): Promise<{ success: boolean }> { return fetchJson(`${API_BASE}/customer/cart/items/${encodeURIComponent(orderId)}`, { method: 'POST', body: JSON.stringify({}) }); },
  async removeCartItem(orderId: string): Promise<{ success: boolean }> { return fetchJson(`${API_BASE}/customer/cart/items/${encodeURIComponent(orderId)}`, { method: 'DELETE' }); },
  async getWallet(): Promise<{ balance: number; referralCode: string; referralUsage: number; referralLimit: number; successfulReferrals: number; ledger: any[] }> { return fetchJson(`${API_BASE}/customer/wallet`); },
  async createCombinedCheckout(cashToRedeem: number): Promise<{ success: boolean; checkout: { id: string; orderIds: string[]; subtotal: number; cashRedeemed: number; amountDue: number } }> {
    return fetchJson(`${API_BASE}/customer/cart/checkout`, { method: 'POST', body: JSON.stringify({ cashToRedeem }) });
  },
  async getActiveCombinedCheckout(): Promise<{ checkout: { id: string; orderIds: string[]; subtotal: number; cashRedeemed: number; amountDue: number; paymentStatus: string; utrNumber?: string } | null }> { return fetchJson(`${API_BASE}/customer/cart/checkout/active`); },
  async submitCombinedPayment(checkoutId: string, payload: { utrNumber?: string; screenshotUrl: string; screenshotName?: string }): Promise<{ success: boolean; message: string }> {
    return fetchJson(`${API_BASE}/customer/cart/checkout/${encodeURIComponent(checkoutId)}/payment`, { method: 'POST', body: JSON.stringify(payload) });
  },
  async getAdminCheckoutBatches(): Promise<{ batches: any[] }> { return fetchJson(`${API_BASE}/admin/checkout-batches`); },
  async verifyCombinedPayment(checkoutId: string, action: 'confirm' | 'reject', rejectionReason?: string): Promise<{ success: boolean; message: string }> {
    return fetchJson(`${API_BASE}/admin/checkout-batches/${encodeURIComponent(checkoutId)}/payment`, { method: 'PATCH', body: JSON.stringify({ action, rejectionReason }) });
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

  async setOrderQuote(orderId: string, amount: number): Promise<{ success: boolean; order: CamporaOrder; message: string }> {
    return fetchJson<{ success: boolean; order: CamporaOrder; message: string }>(`${API_BASE}/admin/orders/${encodeURIComponent(orderId)}/quote`, {
      method: 'PATCH',
      body: JSON.stringify({ amount }),
    });
  },

  async verifyPayment(orderId: string, action: 'confirm' | 'reject', rejectionReason?: string): Promise<{ success: boolean; order: CamporaOrder; message: string }> {
    return fetchJson<{ success: boolean; order: CamporaOrder; message: string }>(`${API_BASE}/admin/orders/${orderId}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ action, rejectionReason }),
    });
  },

  async uploadDeliverable(orderId: string, deliverable: { title: string; file: File }): Promise<{ success: boolean; order: CamporaOrder }> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read the selected deliverable file.'));
      reader.onload = () => typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Could not read the selected deliverable file.'));
      reader.readAsDataURL(deliverable.file);
    });

    return fetchJson<{ success: boolean; order: CamporaOrder }>(`${API_BASE}/admin/orders/${orderId}/deliverables`, {
      method: 'POST',
      body: JSON.stringify({
        title: deliverable.title,
        fileName: deliverable.file.name,
        dataUrl,
      }),
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

  async exportAdminBackup(): Promise<{ exportedAt: string; note: string; orders: CamporaOrder[] }> {
    return fetchJson<{ exportedAt: string; note: string; orders: CamporaOrder[] }>(`${API_BASE}/admin/backup`);
  },

  async getAdminFiles(): Promise<{ files: any[] }> {
    return fetchJson<{ files: any[] }>(`${API_BASE}/admin/files`);
  },
};
