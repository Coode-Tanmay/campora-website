const GOOGLE_APPS_SCRIPT_URL = process.env.GMAIL_APPS_SCRIPT_URL;
const GOOGLE_APPS_SCRIPT_TOKEN = process.env.GMAIL_APPS_SCRIPT_TOKEN;
const APP_URL = (process.env.APP_URL || 'https://campora-website.vercel.app').replace(/\/$/, '');
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

function escapeHtml(value: unknown): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, (character) => entities[character]);
}

function emailLayout(title: string, preheader: string, body: string): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"></head>
  <body style="margin:0;background:#0b0b0b;color:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b0b0b;padding:32px 12px"><tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#141414;border:1px solid #292929;border-radius:18px;overflow:hidden">
        <tr><td style="height:4px;background:#d4a72c"></td></tr>
        <tr><td style="padding:30px 32px 12px"><div style="font-size:13px;font-weight:800;letter-spacing:4px;color:#d4a72c">CAMPORA</div><h1 style="font-size:24px;line-height:1.3;margin:18px 0 0;color:#fff">${escapeHtml(title)}</h1></td></tr>
        <tr><td style="padding:12px 32px 30px;font-size:15px;line-height:1.7;color:#d4d4d8">${body}
          <p style="margin:28px 0 0;color:#a1a1aa;font-size:12px">Need help? Contact <a href="mailto:camporasupport@gmail.com" style="color:#d4a72c">camporasupport@gmail.com</a>.</p>
        </td></tr>
        <tr><td style="border-top:1px solid #292929;padding:18px 32px;color:#71717a;font-size:11px;line-height:1.6">CAMPORA · Academic services<br>This is an automated service email about your CAMPORA account or order.</td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (GOOGLE_APPS_SCRIPT_URL && GOOGLE_APPS_SCRIPT_TOKEN) {
    try {
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: GOOGLE_APPS_SCRIPT_TOKEN, to, subject, html }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json().catch(() => null) as { success?: boolean; error?: string } | null;
      if (response.ok && result?.success === true) return true;
      console.error('Google Apps Script mail relay rejected the message:', result?.error || `HTTP ${response.status}`);
    } catch (error) {
      console.error('Google Apps Script mail relay failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey && FROM_EMAIL) {
    try {
      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
      });
      if (!response.ok) {
        const detail = await response.text();
        console.error('Resend fallback rejected a transactional email:', response.status, detail.slice(0, 500));
        return false;
      }
      return true;
    } catch (error) {
      console.error('Resend fallback delivery failed:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  console.warn('Transactional email skipped: configure the Google Apps Script relay or a verified Resend sender.');
  return false;
}
export async function sendVerificationEmail(to: string, name: string, token: string): Promise<boolean> {
  const url = `${APP_URL}/api/auth/customer/verify-email?token=${encodeURIComponent(token)}`;
  const body = `<p>Hi ${escapeHtml(name)},</p><p>Welcome to CAMPORA. Please verify your email address to activate your account.</p><p style="margin:28px 0"><a href="${url}" style="display:inline-block;background:#d4a72c;color:#111;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:8px">Verify email address</a></p><p style="font-size:12px;color:#a1a1aa">This link expires in 24 hours. If you did not create this account, you can ignore this email.</p>`;
  return sendEmail(to, 'Verify your CAMPORA email address', emailLayout('Verify your email', 'One quick step to activate your CAMPORA account.', body));
}

export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<boolean> {
  const url = `${APP_URL}/api/auth/customer/reset-password-page?token=${encodeURIComponent(token)}`;
  const body = `<p>Hi ${escapeHtml(name)},</p><p>We received a request to reset the password for your CAMPORA account.</p><p style="margin:28px 0"><a href="${url}" style="display:inline-block;background:#d4a72c;color:#111;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:8px">Reset password</a></p><p style="font-size:12px;color:#a1a1aa">This link expires in 30 minutes. If you did not request a reset, ignore this email; your password will remain unchanged.</p>`;
  return sendEmail(to, 'Reset your CAMPORA password', emailLayout('Reset your password', 'A secure password reset was requested for your account.', body));
}

export async function sendOrderConfirmationEmail(to: string, name: string, orderId: string, service: string): Promise<boolean> {
  const body = `<p>Hi ${escapeHtml(name)},</p><p>Your order has been received successfully. Our team will review the details and update you as it progresses.</p><div style="margin:22px 0;padding:16px;background:#1d1d1d;border:1px solid #333;border-radius:10px"><div style="font-size:11px;color:#a1a1aa">ORDER NUMBER</div><strong style="color:#d4a72c">${escapeHtml(orderId)}</strong><div style="margin-top:10px;font-size:11px;color:#a1a1aa">SERVICE</div><strong>${escapeHtml(service)}</strong></div><p>You can sign in to CAMPORA to track your order.</p><p><a href="${APP_URL}" style="color:#d4a72c">Open CAMPORA</a></p>`;
  return sendEmail(to, `CAMPORA order received · ${orderId}`, emailLayout('We received your order', 'Your CAMPORA order has been submitted.', body));
}

export async function sendPaymentUpdateEmail(to: string, name: string, orderId: string, status: 'received' | 'confirmed' | 'rejected'): Promise<boolean> {
  const content = status === 'received'
    ? 'Your payment reference has been received. Our team will verify it and update your order.'
    : status === 'confirmed'
      ? 'Your payment has been verified. Your order can now move forward.'
      : 'Your submitted payment proof could not be verified. Please sign in and review the payment instructions or contact support.';
  const title = status === 'received' ? 'Payment proof received' : status === 'confirmed' ? 'Payment confirmed' : 'Payment needs attention';
  const body = `<p>Hi ${escapeHtml(name)},</p><p>${content}</p><p style="margin:22px 0;padding:14px;background:#1d1d1d;border:1px solid #333;border-radius:10px">Order: <strong style="color:#d4a72c">${escapeHtml(orderId)}</strong></p><p><a href="${APP_URL}" style="color:#d4a72c">Open CAMPORA</a></p>`;
  return sendEmail(to, `CAMPORA · ${title} · ${orderId}`, emailLayout(title, content, body));
}

export async function sendOrderStatusEmail(to: string, name: string, orderId: string, status: string, detail?: string): Promise<boolean> {
  const labels: Record<string, string> = { approved: 'Your order is approved', rejected: 'An update about your order', cancelled: 'Your order was cancelled', in_progress: 'Your work is in progress', completed: 'Your order is complete' };
  const title = labels[status] || 'Your order has been updated';
  const body = `<p>Hi ${escapeHtml(name)},</p><p>Your CAMPORA order <strong style="color:#d4a72c">${escapeHtml(orderId)}</strong> is now: <strong>${escapeHtml(status.replace(/_/g, ' '))}</strong>.</p>${detail ? `<p>${escapeHtml(detail)}</p>` : ''}<p><a href="${APP_URL}" style="color:#d4a72c">Sign in to view your order</a></p>`;
  return sendEmail(to, `CAMPORA · ${title} · ${orderId}`, emailLayout(title, 'There is a new update to your CAMPORA order.', body));
}

export async function sendDeliveryEmail(to: string, name: string, orderId: string): Promise<boolean> {
  const body = `<p>Hi ${escapeHtml(name)},</p><p>Your CAMPORA order <strong style="color:#d4a72c">${escapeHtml(orderId)}</strong> has been marked complete and your deliverables are available in your customer portal.</p><p><a href="${APP_URL}" style="display:inline-block;background:#d4a72c;color:#111;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:8px">View my deliverables</a></p>`;
  return sendEmail(to, `Your CAMPORA order is ready · ${orderId}`, emailLayout('Your work is ready', 'Your completed CAMPORA deliverables are available.', body));
}
