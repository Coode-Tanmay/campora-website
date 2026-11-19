import { createClient } from '@supabase/supabase-js';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { randomBytes } from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { INITIAL_ORDERS, SERVICES_DATA } from './src/data/mockData';
import { CamporaOrder, AuthUser, OrderStatus, PaymentStatus, DeliverableFile, TimelineStep } from './src/types';

dotenv.config();

const app = express();
// Render sits behind a trusted reverse proxy; use the forwarded client address for throttling.
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT) || 3000;

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Configure the server-side Supabase secret key.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PRIVATE_STORAGE_BUCKET = 'campora-private';
const ALLOWED_UPLOAD_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'image/jpeg',
  'image/png',
]);

function parseUploadDataUrl(dataUrl: unknown, maxBytes = 5 * 1024 * 1024): { buffer: Buffer; contentType: string } {
  if (typeof dataUrl !== 'string') throw new Error('A file is required.');
  const match = dataUrl.match(/^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw new Error('The uploaded file format is invalid.');
  const contentType = match[1].toLowerCase();
  if (!ALLOWED_UPLOAD_TYPES.has(contentType)) throw new Error('This file type is not supported.');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > maxBytes) throw new Error('The file exceeds the allowed upload size.');
  return { buffer, contentType };
}

async function uploadPrivateDataUrl(folder: string, fileName: string, dataUrl: unknown, maxBytes = 5 * 1024 * 1024): Promise<{ storagePath: string; contentType: string; size: number }> {
  const parsed = parseUploadDataUrl(dataUrl, maxBytes);
  const safeName = path.basename(String(fileName || 'upload')).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) || 'upload';
  const storagePath = folder + '/' + randomBytes(12).toString('hex') + '-' + safeName;
  const { error } = await supabase.storage.from(PRIVATE_STORAGE_BUCKET).upload(storagePath, parsed.buffer, {
    contentType: parsed.contentType,
    upsert: false,
  });
  if (error) throw new Error('Unable to store uploaded file securely: ' + error.message);
  return { storagePath, contentType: parsed.contentType, size: parsed.buffer.length };
}

async function persistIncomingAttachment(file: any, folder: string): Promise<any> {
  if (!file || typeof file !== 'object' || typeof file.dataUrl !== 'string') {
    throw new Error('One of the selected files is missing its upload data. Please select it again.');
  }
  const stored = await uploadPrivateDataUrl(folder, file.name, file.dataUrl);
  return {
    id: typeof file.id === 'string' ? file.id.slice(0, 100) : randomBytes(8).toString('hex'),
    name: path.basename(String(file.name || 'Attachment')).slice(0, 150),
    size: (stored.size / (1024 * 1024)).toFixed(2) + ' MB',
    type: stored.contentType,
    uploadedAt: new Date().toISOString(),
    storagePath: stored.storagePath,
  };
}

async function createPrivateSignedUrl(storagePath?: string): Promise<string | undefined> {
  if (!storagePath) return undefined;
  const { data, error } = await supabase.storage.from(PRIVATE_STORAGE_BUCKET).createSignedUrl(storagePath, 300);
  if (error || !data?.signedUrl) throw new Error('Unable to create a secure file link.');
  return data.signedUrl;
}

async function withSignedFileLinks(order: CamporaOrder): Promise<CamporaOrder> {
  const safeOrder = JSON.parse(JSON.stringify(order)) as CamporaOrder;
  if (safeOrder.collegeTemplateFile?.storagePath) {
    safeOrder.collegeTemplateFile.downloadUrl = await createPrivateSignedUrl(safeOrder.collegeTemplateFile.storagePath);
  }
  for (const file of safeOrder.referenceFiles || []) {
    if (file.storagePath) file.downloadUrl = await createPrivateSignedUrl(file.storagePath);
  }
  for (const file of safeOrder.deliverables || []) {
    if (file.storagePath) file.downloadUrl = await createPrivateSignedUrl(file.storagePath);
  }
  if (safeOrder.paymentDetails?.screenshotStoragePath) {
    safeOrder.paymentDetails.screenshotUrl = await createPrivateSignedUrl(safeOrder.paymentDetails.screenshotStoragePath);
  }
  return safeOrder;
}

// Fail closed: never run with default or hard-coded production credentials.
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('Missing or weak JWT_SECRET. Set a random secret of at least 32 characters in your local environment.');
}
if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  throw new Error('Missing ADMIN_USERNAME or ADMIN_PASSWORD. Configure both in your local environment.');
}

// Middlewares
app.disable('x-powered-by');
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Lightweight per-process throttling for sensitive endpoints. The API is currently a
// single Render service; move this store to Redis/Postgres before adding multiple instances.
type RateLimitEntry = { count: number; resetAt: number };
const rateLimitEntries = new Map<string, RateLimitEntry>();
const rateLimitCleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitEntries) {
    if (entry.resetAt <= now) rateLimitEntries.delete(key);
  }
}, 60_000);
rateLimitCleanup.unref();

function rateLimit(scope: string, maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const key = scope + ':' + clientIp;
    const now = Date.now();
    const current = rateLimitEntries.get(key);
    if (!current || current.resetAt <= now) {
      rateLimitEntries.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    current.count += 1;
    if (current.count > maxRequests) {
      res.setHeader('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
      res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });
      return;
    }
    next();
  };
}

// Reject cross-origin browser mutations. The frontend and API share the canonical APP_URL
// through the Vercel rewrite, so state-changing requests must originate from that origin.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    next();
    return;
  }
  const origin = req.get('origin');
  if (process.env.NODE_ENV === 'production') {
    try {
      if (!origin || new URL(origin).origin !== getRequestOrigin(req)) {
        res.status(403).json({ error: 'Request origin could not be verified.' });
        return;
      }
    } catch {
      res.status(403).json({ error: 'Request origin could not be verified.' });
      return;
    }
  }
  next();
});

// Database-backed application state. The server keeps a short-lived in-process cache,
// but every mutation is persisted to Supabase before the API reports success.
let ordersStore: CamporaOrder[] = [];
interface StoredUser extends AuthUser { passwordHash?: string; }
let usersStore: StoredUser[] = [];
let stateWriteQueue: Promise<unknown> = Promise.resolve();

async function loadPersistentState(): Promise<void> {
  const [ordersResult, customersResult] = await Promise.all([
    supabase.from('campora_orders').select('payload').order('created_at', { ascending: false }),
    supabase.from('campora_customers').select('payload').order('created_at', { ascending: true }),
  ]);
  if (ordersResult.error) throw new Error(`Unable to load CAMPORA orders: ${ordersResult.error.message}`);
  if (customersResult.error) throw new Error(`Unable to load CAMPORA customers: ${customersResult.error.message}`);

  if ((ordersResult.data?.length || 0) > 0 || (customersResult.data?.length || 0) > 0) {
    ordersStore = (ordersResult.data || []).map((row: any) => row.payload as CamporaOrder);
    usersStore = (customersResult.data || []).map((row: any) => row.payload as StoredUser);
    return;
  }

  // One-time compatibility fallback: migrate any existing JSONB state into the
  // indexed tables before serving requests. Keep the old row as a rollback mirror.
  const { data, error } = await supabase
    .from('campora_app_state')
    .select('orders, users')
    .eq('id', 'primary')
    .maybeSingle();
  if (error) throw new Error(`Unable to load legacy CAMPORA state: ${error.message}`);
  if (data) {
    ordersStore = Array.isArray(data.orders) ? data.orders as CamporaOrder[] : [];
    usersStore = Array.isArray(data.users) ? data.users as StoredUser[] : [];
  } else {
    // Start with no fake customers or sample orders in production.
    ordersStore = process.env.NODE_ENV === 'production' ? [] : JSON.parse(JSON.stringify(INITIAL_ORDERS));
    usersStore = [];
  }
  await persistState();
}

async function persistState(): Promise<void> {
  const now = new Date().toISOString();
  const snapshot = {
    id: 'primary',
    orders: ordersStore,
    users: usersStore,
    updated_at: now,
  };
  const customerRows = usersStore.map((user) => ({
    id: user.id,
    email: user.email.toLowerCase(),
    full_name: user.name || '',
    role: user.role || 'customer',
    payload: user,
    updated_at: now,
  }));
  const orderRows = ordersStore.map((order) => ({
    id: order.id,
    customer_id: order.customerId,
    order_number: order.id,
    service_id: order.serviceId || null,
    service_name: order.serviceName || '',
    status: order.status || 'new_order',
    payment_status: order.paymentStatus || 'pending',
    final_amount: Number.isFinite(Number(order.finalPrice ?? order.total)) ? Number(order.finalPrice ?? order.total) : 0,
    payload: order,
    updated_at: now,
  }));

  // Serialize writes; the indexed tables are the source of truth and the JSONB row
  // remains a compatibility backup until the relational migration is fully proven.
  stateWriteQueue = stateWriteQueue.catch(() => undefined).then(async () => {
    if (customerRows.length) {
      const { error } = await supabase.from('campora_customers').upsert(customerRows, { onConflict: 'id' });
      if (error) throw new Error(`Unable to save CAMPORA customers: ${error.message}`);
    }
    if (orderRows.length) {
      const { error } = await supabase.from('campora_orders').upsert(orderRows, { onConflict: 'id' });
      if (error) throw new Error(`Unable to save CAMPORA orders: ${error.message}`);
    }
    const { error } = await supabase.from('campora_app_state').upsert(snapshot, { onConflict: 'id' });
    if (error) throw new Error(`Unable to save CAMPORA compatibility state: ${error.message}`);
  });
  await stateWriteQueue;
}

// Helper: Extract & Verify JWT
interface RequestWithUser extends Request {
  user?: AuthUser;
}

const authenticateToken = (req: RequestWithUser, res: Response, next: NextFunction): void => {
  const token = req.cookies?.campora_session || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
  } catch (err) {
    // Token invalid or expired
    req.user = undefined;
  }
  next();
};

const requireAuth = (req: RequestWithUser, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  next();
};

const requireAdmin = (req: RequestWithUser, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required. Please log in as administrator.' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Access Denied — Administrator access required.' });
    return;
  }
  next();
};

app.use(authenticateToken);

// ==========================================
// AUTHENTICATION & OAUTH HELPERS
// ==========================================

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getRequestOrigin(_req: Request): string {
  const configuredUrl = process.env.APP_URL?.trim();
  if (configuredUrl && configuredUrl !== 'MY_APP_URL') {
    const parsed = new URL(configuredUrl);
    if (parsed.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      throw new Error('APP_URL must use HTTPS in production.');
    }
    return parsed.origin;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('APP_URL must be configured to the canonical public CAMPORA website origin.');
  }
  return 'http://localhost:3000';
}

function createOAuthState(provider: 'google' | 'microsoft', origin: string): string {
  return jwt.sign(
    { provider, origin, nonce: randomBytes(32).toString('hex') },
    JWT_SECRET,
    { expiresIn: '10m', issuer: 'campora', audience: 'campora-oauth' },
  );
}

function verifyOAuthState(
  state: unknown,
  cookieState: unknown,
  provider: 'google' | 'microsoft',
  expectedOrigin: string,
): string {
  if (typeof state !== 'string' || !state || typeof cookieState !== 'string' || !cookieState || state !== cookieState) {
    throw new Error('OAuth state validation failed. Please restart sign-in.');
  }
  const payload = jwt.verify(state, JWT_SECRET, {
    issuer: 'campora',
    audience: 'campora-oauth',
  }) as jwt.JwtPayload & { provider?: string; origin?: string; nonce?: string };
  if (payload.provider !== provider || payload.origin !== expectedOrigin || !payload.nonce) {
    throw new Error('OAuth state validation failed. Please restart sign-in.');
  }
  return payload.origin;
}

// Check OAuth Configuration Status
app.get('/api/auth/oauth-config', (req: Request, res: Response) => {
  const origin = getRequestOrigin(req);
  res.json({
    googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.trim() !== ''),
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleRedirectUri: `${origin}/auth/callback/google`,
    microsoftConfigured: Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_ID.trim() !== ''),
    microsoftClientId: process.env.MICROSOFT_CLIENT_ID || '',
    microsoftRedirectUri: `${origin}/auth/callback/microsoft`,
    appUrl: origin,
  });
});

// Current User Session
app.get('/api/auth/me', (req: RequestWithUser, res: Response) => {
  if (!req.user) {
    res.status(401).json({ authenticated: false, user: null });
    return;
  }
  res.json({ authenticated: true, user: req.user });
});

// Generate Official Google OAuth 2.0 Authorization URL
app.get('/api/auth/google/url', rateLimit('google-oauth-start', 20, 15 * 60 * 1000), (req: Request, res: Response) => {
  const origin = getRequestOrigin(req);
  const redirectUri = `${origin}/auth/callback/google`;
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();

  if (!googleClientId) {
    res.json({
      configured: false,
      provider: 'google',
      error: 'Google OAuth Client ID is not configured in server environment.',
      redirectUri,
      requiredEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
      instructions: {
        title: 'Google OAuth 2.0 Setup Guide',
        consoleUrl: 'https://console.cloud.google.com/apis/credentials',
        redirectUri,
        scopes: ['openid', 'email', 'profile'],
      },
    });
    return;
  }

  const statePayload = createOAuthState('google', origin);
  res.cookie('campora_google_oauth_state', statePayload, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 10 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account', // Mandatory: shows Google real account chooser
    access_type: 'offline',
    include_granted_scopes: 'true',
    state: statePayload,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  res.json({
    configured: true,
    provider: 'google',
    url: authUrl,
    redirectUri,
  });
});

// Generate Official Microsoft OAuth 2.0 Authorization URL
app.get('/api/auth/microsoft/url', rateLimit('microsoft-oauth-start', 20, 15 * 60 * 1000), (req: Request, res: Response) => {
  const origin = getRequestOrigin(req);
  const redirectUri = `${origin}/auth/callback/microsoft`;
  const msClientId = process.env.MICROSOFT_CLIENT_ID?.trim();

  if (!msClientId) {
    res.json({
      configured: false,
      provider: 'microsoft',
      error: 'Microsoft OAuth Client ID is not configured in server environment.',
      redirectUri,
      requiredEnvVars: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
      instructions: {
        title: 'Microsoft Azure / Entra OAuth Setup Guide',
        consoleUrl: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
        redirectUri,
        scopes: ['openid', 'email', 'profile', 'User.Read'],
      },
    });
    return;
  }

  const statePayload = createOAuthState('microsoft', origin);
  res.cookie('campora_microsoft_oauth_state', statePayload, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 10 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: msClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile User.Read',
    prompt: 'select_account',
    state: statePayload,
  });

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;

  res.json({
    configured: true,
    provider: 'microsoft',
    url: authUrl,
    redirectUri,
  });
});

// ==========================================
// OAUTH CALLBACK HANDLERS (Popups & Redirects)
// ==========================================

// Google OAuth 2.0 Callback
app.get(['/auth/callback/google', '/auth/callback/google/', '/auth/callback', '/auth/callback/'], async (req: Request, res: Response) => {
  // Handle cancellation or OAuth error
  if (req.query.error) {
    const errorDesc = (req.query.error_description || req.query.error || 'Google login cancelled by user') as string;
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CAMPORA - Google Sign In Cancelled</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="background:#0B0B0B;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;">
          <div style="background:#171717;border:1px solid #333;border-radius:16px;padding:32px;max-width:400px;">
            <div style="width:48px;height:48px;border-radius:50%;background:rgba(239,68,68,0.15);color:#ef4444;display:inline-flex;align-items:center;justify-content:center;margin:0 auto 16px auto;font-size:20px;">✕</div>
            <h3 style="color:#fff;margin:0 0 8px 0;font-size:18px;">Sign In Cancelled</h3>
            <p style="color:#a1a1aa;font-size:13px;margin:0 0 16px 0;">${escapeHtml(errorDesc)}</p>
            <p style="color:#71717a;font-size:12px;">This window will close automatically...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(errorDesc)} }, window.location.origin);
              setTimeout(() => { window.close(); }, 800);
            } else {
              setTimeout(() => { window.location.href = '/login'; }, 1500);
            }
          </script>
        </body>
      </html>
    `);
    return;
  }

  const code = req.query.code as string;
  if (!code) {
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>CAMPORA - Authorization Code Missing</title></head>
        <body style="background:#0B0B0B;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="background:#171717;border:1px solid #ef4444;border-radius:16px;padding:32px;text-align:center;">
            <h3 style="color:#ef4444;margin:0 0 8px 0;">Authentication Error</h3>
            <p style="color:#a1a1aa;font-size:13px;">No authorization code returned from Google.</p>
          </div>
        </body>
      </html>
    `);
    return;
  }

  try {
    const origin = verifyOAuthState(req.query.state, req.cookies?.campora_google_oauth_state, 'google', getRequestOrigin(req));
    res.clearCookie('campora_google_oauth_state', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    const redirectUri = `${origin}/auth/callback/google`;

    // 1. Exchange authorization code for Google access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange authorization code with Google.');
    }

    // 2. Fetch authenticated Google user profile (Name, Email, Profile Picture)
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await profileResponse.json();
    if (!profile.email || profile.email_verified !== true) {
      throw new Error('Google account did not return a verified email address.');
    }

    const email = profile.email.toLowerCase().trim();
    let user = usersStore.find((u) => u.email.toLowerCase() === email);

    if (!user) {
      // Create new customer account with role 'customer'
      const newCustomer: StoredUser = {
        id: 'cust-' + randomBytes(16).toString('hex'),
        name: profile.name || email.split('@')[0],
        email: email,
        avatar: profile.picture,
        role: 'customer', // STRICT ENFORCEMENT: Never admin
        authProvider: 'google',
        createdAt: new Date().toISOString().split('T')[0],
      };
      usersStore.push(newCustomer);
      await persistState();
      user = newCustomer;
    } else {
      if (profile.picture) user.avatar = profile.picture;
      if (profile.name && (!user.name || user.name === email.split('@')[0])) {
        user.name = profile.name;
      }
      user.authProvider = 'google';
    }

    // Strictly enforce customer role for Google authentication
    await persistState();
    const customerPayload: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: 'customer',
      whatsapp: user.whatsapp,
      college: user.college,
      authProvider: 'google',
      createdAt: user.createdAt,
    };

    const token = jwt.sign(customerPayload, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('campora_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CAMPORA - Google Sign In Complete</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="background:#0B0B0B;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;">
          <div style="background:#171717;border:1px solid #D4A72C;border-radius:20px;padding:36px 28px;max-width:400px;box-shadow:0 20px 40px rgba(0,0,0,0.8);">
            ${customerPayload.avatar ? `<img src="${escapeHtml(customerPayload.avatar)}" alt="Profile" style="width:64px;height:64px;border-radius:50%;margin:0 auto 16px auto;border:2px solid #D4A72C;object-fit:cover;display:block;" />` : `<div style="width:56px;height:56px;border-radius:50%;background:rgba(212,167,44,0.15);color:#D4A72C;display:inline-flex;align-items:center;justify-content:center;margin:0 auto 16px auto;font-size:24px;font-weight:bold;">${escapeHtml(customerPayload.name.charAt(0).toUpperCase())}</div>`}
            <h2 style="color:#fff;margin:0 0 6px 0;font-size:20px;font-weight:700;">Welcome, ${escapeHtml(customerPayload.name)}!</h2>
            <p style="color:#a1a1aa;font-size:13px;margin:0 0 20px 0;">Google account verified:<br><strong style="color:#D4A72C;font-size:12px;">${escapeHtml(customerPayload.email)}</strong></p>
            <div style="display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;background:#222;color:#35C759;font-size:12px;font-weight:600;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#35C759;"></span>
              Authenticated • Opening Dashboard...
            </div>
          </div>
          <script>
            const authPayload = ${JSON.stringify({ type: 'OAUTH_AUTH_SUCCESS', user: customerPayload })};
            if (window.opener) {
              window.opener.postMessage(authPayload, window.location.origin);
              setTimeout(() => { window.close(); }, 500);
            } else {
              setTimeout(() => { window.location.href = '/dashboard'; }, 800);
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>CAMPORA - Google Sign In Error</title></head>
        <body style="background:#0B0B0B;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;">
          <div style="background:#171717;border:1px solid #ef4444;border-radius:16px;padding:32px;max-width:420px;">
            <h3 style="color:#ef4444;margin:0 0 12px 0;">Authentication Error</h3>
            <p style="color:#a1a1aa;font-size:13px;line-height:1.5;">${escapeHtml(err.message || 'Google OAuth verification failed.')}</p>
            <p style="color:#71717a;font-size:12px;margin-top:16px;">This window will close shortly.</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(err.message || 'Google OAuth verification failed.')} }, window.location.origin);
              setTimeout(() => { window.close(); }, 2500);
            } else {
              setTimeout(() => { window.location.href = '/dashboard'; }, 3000);
            }
          </script>
        </body>
      </html>
    `);
  }
});

// Microsoft OAuth Callback
app.get(['/auth/callback/microsoft', '/auth/callback/microsoft/'], async (req: Request, res: Response) => {
  if (req.query.error) {
    const errorDesc = (req.query.error_description || req.query.error || 'Microsoft login cancelled by user') as string;
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>CAMPORA - Microsoft Sign In Cancelled</title></head>
        <body style="background:#0B0B0B;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;">
          <div style="background:#171717;border:1px solid #333;border-radius:16px;padding:32px;max-width:400px;">
            <h3 style="color:#fff;margin:0 0 8px 0;">Sign In Cancelled</h3>
            <p style="color:#a1a1aa;font-size:13px;">${escapeHtml(errorDesc)}</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(errorDesc)} }, window.location.origin);
              setTimeout(() => { window.close(); }, 800);
            } else {
              setTimeout(() => { window.location.href = '/login'; }, 1500);
            }
          </script>
        </body>
      </html>
    `);
    return;
  }

  const code = req.query.code as string;
  if (!code) {
    res.status(400).send('Missing authorization code from Microsoft.');
    return;
  }

  try {
    const origin = verifyOAuthState(req.query.state, req.cookies?.campora_microsoft_oauth_state, 'microsoft', getRequestOrigin(req));
    res.clearCookie('campora_microsoft_oauth_state', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    const redirectUri = `${origin}/auth/callback/microsoft`;

    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.MICROSOFT_CLIENT_ID || '',
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange authorization code with Microsoft.');
    }

    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await profileResponse.json();
    const email = (profile.mail || profile.userPrincipalName || '').toLowerCase().trim();
    if (!email) {
      throw new Error('Microsoft account did not return a valid email address.');
    }

    let user = usersStore.find((u) => u.email.toLowerCase() === email);

    if (!user) {
      const newCustomer: StoredUser = {
        id: 'cust-' + randomBytes(16).toString('hex'),
        name: profile.displayName || email.split('@')[0],
        email: email,
        role: 'customer',
        authProvider: 'microsoft',
        createdAt: new Date().toISOString().split('T')[0],
      };
      usersStore.push(newCustomer);
      await persistState();
      user = newCustomer;
    } else {
      if (profile.displayName && (!user.name || user.name === email.split('@')[0])) {
        user.name = profile.displayName;
      }
      user.authProvider = 'microsoft';
    }

    await persistState();
    const customerPayload: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: 'customer',
      whatsapp: user.whatsapp,
      college: user.college,
      authProvider: 'microsoft',
      createdAt: user.createdAt,
    };

    const token = jwt.sign(customerPayload, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('campora_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>CAMPORA - Microsoft Sign In Complete</title></head>
        <body style="background:#0B0B0B;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;">
          <div style="background:#171717;border:1px solid #D4A72C;border-radius:20px;padding:36px 28px;max-width:400px;">
            <h2 style="color:#fff;margin:0 0 6px 0;font-size:20px;">Welcome, ${escapeHtml(customerPayload.name)}!</h2>
            <p style="color:#a1a1aa;font-size:13px;margin:0 0 20px 0;">Signed in via Microsoft (${escapeHtml(customerPayload.email)})</p>
          </div>
          <script>
            const authPayload = ${JSON.stringify({ type: 'OAUTH_AUTH_SUCCESS', user: customerPayload })};
            if (window.opener) {
              window.opener.postMessage(authPayload, window.location.origin);
              setTimeout(() => { window.close(); }, 500);
            } else {
              setTimeout(() => { window.location.href = '/dashboard'; }, 800);
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>CAMPORA - Microsoft Sign In Error</title></head>
        <body style="background:#0B0B0B;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;">
          <div style="background:#171717;border:1px solid #ef4444;border-radius:16px;padding:32px;max-width:420px;">
            <h3 style="color:#ef4444;margin:0 0 12px 0;">Authentication Error</h3>
            <p style="color:#a1a1aa;font-size:13px;">${escapeHtml(err.message || 'Microsoft OAuth verification failed.')}</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(err.message || 'Microsoft OAuth verification failed.')} }, window.location.origin);
              setTimeout(() => { window.close(); }, 2500);
            }
          </script>
        </body>
      </html>
    `);
  }
});

// Admin Login (Strictly separate from Customer Google Auth)
app.post('/api/auth/admin/login', rateLimit('admin-login', 5, 15 * 60 * 1000), async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  // Server-side validation against protected credentials
  if (username.trim() === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const adminUser: AuthUser = {
      id: 'admin-tanmay-1',
      name: 'Tanmay (CAMPORA Admin)',
      email: 'tanmay@campora.in',
      role: 'admin',
      authProvider: 'email',
    };

    const token = jwt.sign(adminUser, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('campora_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Admin authentication successful.',
      user: adminUser,
    });
    return;
  }

  res.status(401).json({ error: 'Invalid administrator credentials. Please check username and password.' });
});

// Email/password sign-in is disabled until verified email delivery and account recovery are configured.
// All current customer accounts use provider OAuth; do not create unverified email identities.
app.post('/api/auth/customer/login', rateLimit('customer-login', 10, 15 * 60 * 1000), (_req: Request, res: Response) => {
  res.status(410).json({
    error: 'Email/password sign-in is not available yet. Please continue with your verified Google or Microsoft account.',
  });
});

// This endpoint is intentionally disabled. OAuth identities must be established only
// by the provider callback after validating the authorization code and provider profile.
app.post('/api/auth/customer/oauth', (_req: Request, res: Response) => {
  res.status(410).json({ error: 'Direct OAuth sign-in is disabled. Start sign-in through the official provider authorization flow.' });
});

// Logout
app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('campora_session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

// ==========================================
// CUSTOMER-FACING ORDER & ACCOUNT ROUTES
// ==========================================

// Get authenticated customer's own orders ONLY
app.get('/api/customer/orders', requireAuth, async (req: RequestWithUser, res: Response) => {
  const user = req.user!;
  
  // Filter exclusively for this customer
  const userOrders = await Promise.all(ordersStore
    .filter((o) => o.customerId === user.id)
    .map(async (o) => {
      // Strip private admin notes before returning to customer.
      const { adminNotes, ...customerSafeOrder } = await withSignedFileLinks(o);
      return customerSafeOrder;
    }));

  res.json({ orders: userOrders });
});

// Get single order with strict ownership authorization
app.get('/api/customer/orders/:id', requireAuth, async (req: RequestWithUser, res: Response) => {
  const user = req.user!;
  const orderId = req.params.id;

  const order = ordersStore.find((o) => o.id.toLowerCase() === orderId.toLowerCase());

  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  // Strict ownership check: Only owner customer or admin can access
  if (user.role !== 'admin' && order.customerId !== user.id) {
    res.status(403).json({ error: 'Access Denied: You do not have permission to view this order.' });
    return;
  }

  const signedOrder = await withSignedFileLinks(order);
  const { adminNotes, ...customerSafeOrder } = signedOrder;
  res.json({ order: user.role === 'admin' ? signedOrder : customerSafeOrder });
});

// Create customer order. Price, discount and eligibility are always calculated server-side.
app.post('/api/customer/orders', requireAuth, async (req: RequestWithUser, res: Response) => {
  const user = req.user!;
  if (user.role !== 'customer') {
    res.status(403).json({ error: 'Only customer accounts can place orders.' });
    return;
  }

  const data = req.body || {};
  if (!data.customerName?.trim() || !data.whatsappNumber?.trim() || !data.topic?.trim() || !data.serviceId) {
    res.status(400).json({ error: 'Please complete your name, WhatsApp number, service and topic.' });
    return;
  }

  const service = SERVICES_DATA.find((item) => item.id === data.serviceId);
  if (!service) {
    res.status(400).json({ error: 'Please select a valid CAMPORA service.' });
    return;
  }

  const pagesOrSlides = Number(data.pagesOrSlides);
  if (!Number.isInteger(pagesOrSlides) || pagesOrSlides < 1 || pagesOrSlides > 200) {
    res.status(400).json({ error: 'Please provide a valid page or slide count.' });
    return;
  }

  const isPackage = service.id === 'internship-package';
  const requiresReview = service.pricingType === 'variable'
    || Boolean(service.maxIncludedPages && pagesOrSlides > service.maxIncludedPages)
    || Boolean(data.hasCollegeTemplate);

  const subtotal = Number(service.price) || 0;
  const requestedCode = typeof data.couponCode === 'string' ? data.couponCode.trim().toUpperCase() : '';
  let discount = 0;
  let couponCode: string | undefined;

  if (!isPackage && subtotal >= 250) {
    if (requestedCode === 'CAMPORA100' || requestedCode === 'CAMPORA123') {
      discount = 100;
      couponCode = requestedCode;
    } else if (requestedCode === 'ALEX20CMP') {
      discount = Math.round(subtotal * 0.2);
      couponCode = requestedCode;
    }
  }

  // Variable-price services and oversized work are quoted by the admin.
  if (requiresReview || isPackage) {
    discount = 0;
    couponCode = undefined;
  }

  const total = Math.max(0, subtotal - discount);
  const now = new Date().toISOString();
  const orderId = `CMP-${Date.now().toString().slice(-8)}`;

  let savedTemplateFile: any = undefined;
  let savedReferenceFiles: any[] = [];
  try {
    if (data.hasCollegeTemplate) {
      savedTemplateFile = await persistIncomingAttachment(data.collegeTemplateFile, 'orders/' + orderId + '/customer');
    }
    const incomingReferences = Array.isArray(data.referenceFiles) ? data.referenceFiles : [];
    if (incomingReferences.length > 10) throw new Error('You can attach a maximum of 10 reference files.');
    savedReferenceFiles = await Promise.all(incomingReferences.map((file: any) =>
      persistIncomingAttachment(file, 'orders/' + orderId + '/customer')
    ));
  } catch (uploadError: any) {
    res.status(400).json({ error: uploadError.message || 'Unable to upload order attachments.' });
    return;
  }

  const newOrder: CamporaOrder = {
    id: orderId,
    customerId: user.id,
    customerName: data.customerName.trim(),
    customerEmail: user.email,
    whatsappNumber: data.whatsappNumber.trim(),
    college: data.college?.trim() || user.college || 'Not provided',
    serviceId: service.id,
    serviceName: service.title,
    isPackage,
    pricingType: service.pricingType,
    topic: data.topic.trim(),
    pagesOrSlides,
    deadline: typeof data.deadline === 'string' ? data.deadline : 'Standard (24-48 hrs)',
    instructions: typeof data.instructions === 'string' ? data.instructions.slice(0, 10000) : '',
    hasCollegeTemplate: Boolean(data.hasCollegeTemplate),
    collegeTemplateFile: savedTemplateFile,
    templateInstructions: typeof data.templateInstructions === 'string' ? data.templateInstructions.slice(0, 5000) : undefined,
    referenceFiles: savedReferenceFiles,
    subtotal,
    finalPrice: total,
    discount,
    discountEligible: !isPackage && !requiresReview,
    couponCode,
    total,
    quoteStatus: requiresReview ? 'pending' : 'not_required',
    paymentStatus: requiresReview ? 'awaiting_quote' : 'pending',
    status: requiresReview ? 'requirements_review' : 'new_order',
    requiresReview,
    reviewReason: requiresReview ? 'Order requires review before payment.' : undefined,
    progressPercent: 10,
    createdAt: now,
    updatedAt: now,
    estimatedDelivery: 'To be confirmed',
    timeline: [
      { id: 't1', title: 'Order Submitted', description: 'Your order has been received by CAMPORA', timestamp: now, status: 'completed' },
      { id: 't2', title: 'Requirements Review', description: 'CAMPORA is reviewing your order details', timestamp: now, status: 'current' },
      { id: 't3', title: 'Payment', description: requiresReview ? 'Payment details will be available after review' : 'Awaiting payment', status: 'pending' },
      { id: 't4', title: 'Work In Progress', description: 'Work begins after payment verification', status: 'pending' },
      { id: 't5', title: 'Quality Review & Delivery', description: 'Your completed files will appear here', status: 'pending' },
    ],
    deliverables: [],
  };

  ordersStore.unshift(newOrder);
  await persistState();
  res.status(201).json({ success: true, order: newOrder });
});

// Customer submits UPI payment proof. A screenshot is optional, but never marks payment as paid.
app.post('/api/customer/orders/:id/payment', rateLimit('payment-proof', 8, 15 * 60 * 1000), requireAuth, async (req: RequestWithUser, res: Response) => {
  const user = req.user!;
  const orderId = req.params.id;
  const { utrNumber, screenshotUrl, screenshotName, screenshotSize } = req.body || {};

  const orderIndex = ordersStore.findIndex((o) => o.id.toLowerCase() === orderId.toLowerCase());
  if (orderIndex === -1) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const order = ordersStore[orderIndex];
  if (user.role !== 'customer' || order.customerId !== user.id) {
    res.status(403).json({ error: 'You cannot submit payment for this order.' });
    return;
  }

  if (order.paymentStatus === 'awaiting_quote' || order.status === 'requirements_review' || order.status === 'cancelled' || order.status === 'rejected' || order.status === 'completed') {
    res.status(409).json({ error: 'This order is not ready to accept payment. Wait for the CAMPORA team to confirm the quote or order status.' });
    return;
  }
  if (!['pending', 'rejected'].includes(order.paymentStatus)) {
    res.status(409).json({ error: 'Payment proof has already been submitted or the payment is confirmed.' });
    return;
  }

  const cleanUtr = typeof utrNumber === 'string' ? utrNumber.trim().replace(/\s+/g, '') : '';
  if (!/^[A-Za-z0-9-]{8,32}$/.test(cleanUtr)) {
    res.status(400).json({ error: 'Please provide a valid UPI reference / UTR number.' });
    return;
  }

  const duplicateUtr = ordersStore.some((candidate) => candidate.id !== order.id && candidate.paymentDetails?.utrNumber?.toLowerCase() === cleanUtr.toLowerCase());
  if (duplicateUtr) {
    res.status(409).json({ error: 'This UPI reference number has already been submitted for another order.' });
    return;
  }

  let screenshotStoragePath: string | undefined;
  if (typeof screenshotUrl === 'string' && screenshotUrl.trim()) {
    if (!/^data:image\/(png|jpeg|jpg);base64,[A-Za-z0-9+/=]+$/.test(screenshotUrl) || screenshotUrl.length > 700000) {
      res.status(400).json({ error: 'Payment screenshot must be a PNG or JPG image under 500 KB.' });
      return;
    }
    try {
      const storedScreenshot = await uploadPrivateDataUrl('orders/' + order.id + '/payments', screenshotName || 'payment-proof.png', screenshotUrl, 500 * 1024);
      screenshotStoragePath = storedScreenshot.storagePath;
    } catch (uploadError: any) {
      res.status(400).json({ error: uploadError.message || 'Unable to store payment screenshot securely.' });
      return;
    }
  }

  const payableAmount = order.finalPrice ?? order.total;
  const now = new Date().toISOString();
  const updatedTimeline: TimelineStep[] = order.timeline.map((step) => {
    if (step.id === 't3' || step.title.toLowerCase().includes('payment')) {
      return {
        ...step,
        title: 'Payment Verification Pending',
        description: 'Payment reference submitted. CAMPORA is checking the transaction.',
        status: 'current' as const,
        timestamp: now,
      };
    }
    return step;
  });

  const updatedOrder: CamporaOrder = {
    ...order,
    paymentStatus: 'verification_pending',
    status: 'verification_pending',
    paymentDetails: {
      upiId: 'tanmayvbhagat-1@oksbi',
      utrNumber: cleanUtr,
      screenshotStoragePath,
      screenshotName: screenshotStoragePath ? (typeof screenshotName === 'string' ? screenshotName.slice(0, 180) : 'Payment_Proof.png') : undefined,
      screenshotSize: screenshotStoragePath && typeof screenshotSize === 'string' ? screenshotSize.slice(0, 40) : undefined,
      submittedAt: now,
      amountPaid: payableAmount,
    },
    timeline: updatedTimeline,
    updatedAt: now,
  };

  ordersStore[orderIndex] = updatedOrder;
  await persistState();

  const { adminNotes, ...customerSafeOrder } = updatedOrder;
  res.json({ success: true, message: 'Payment proof submitted. Admin verification is pending.', order: await withSignedFileLinks(customerSafeOrder as CamporaOrder) });
});

// Customer profile & stats
app.get('/api/customer/profile', requireAuth, (req: RequestWithUser, res: Response) => {
  const user = req.user!;
  if (user.role !== 'customer') {
    res.status(403).json({ error: 'Customer profile access is required.' });
    return;
  }
  const userOrders = ordersStore.filter((o) => o.customerId === user.id);
  
  const totalSpent = userOrders.filter((o) => o.paymentStatus === 'paid').reduce((sum, o) => sum + (o.finalPrice || o.total), 0);
  const activeOrders = userOrders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');

  res.json({
    user,
    stats: {
      totalOrders: userOrders.length,
      activeOrders: activeOrders.length,
      completedOrders: userOrders.filter((o) => o.status === 'completed').length,
      totalSpent,
      referralCode: `CAMPORA-${user.name.split(' ')[0].toUpperCase() || 'STUDENT'}20`,
      creditsEarned: 100,
      creditBalance: 100,
    },
  });
});

// ==========================================
// ADMIN DASHBOARD & MANAGEMENT ROUTES (PROTECTED)
// ==========================================

// Dashboard Overview Metrics
app.get('/api/admin/overview', requireAdmin, async (_req: RequestWithUser, res: Response) => {
  const totalOrders = ordersStore.length;
  const newOrders = ordersStore.filter((o) => o.status === 'new_order').length;
  const pendingApproval = ordersStore.filter((o) => o.status === 'new_order' || o.status === 'under_review' || o.status === 'requirements_review').length;
  const verificationPending = ordersStore.filter((o) => o.paymentStatus === 'verification_pending' || o.status === 'verification_pending').length;
  const paidOrders = ordersStore.filter((o) => o.paymentStatus === 'paid').length;
  const inProgress = ordersStore.filter((o) => o.status === 'in_progress').length;
  const completedOrders = ordersStore.filter((o) => o.status === 'completed').length;
  const cancelledOrders = ordersStore.filter((o) => o.status === 'cancelled').length;
  const totalRevenue = ordersStore.filter((o) => o.paymentStatus === 'paid').reduce((sum, o) => sum + (o.finalPrice || o.total), 0);

  res.json({
    overview: {
      totalOrders,
      newOrders,
      pendingApproval,
      verificationPending,
      paidOrders,
      inProgress,
      completedOrders,
      cancelledOrders,
      totalRevenue,
    },
    recentOrders: await Promise.all(ordersStore.slice(0, 10).map(withSignedFileLinks)),
  });
});

// Admin All Orders with query filters
app.get('/api/admin/orders', requireAdmin, async (req: RequestWithUser, res: Response) => {
  const { status, paymentStatus, search, sort } = req.query as {
    status?: string;
    paymentStatus?: string;
    search?: string;
    sort?: string;
  };

  let filtered = [...ordersStore];

  if (status && status !== 'all') {
    filtered = filtered.filter((o) => o.status === status);
  }

  if (paymentStatus && paymentStatus !== 'all') {
    filtered = filtered.filter((o) => o.paymentStatus === paymentStatus);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.whatsappNumber.toLowerCase().includes(q) ||
        o.topic.toLowerCase().includes(q) ||
        o.college.toLowerCase().includes(q)
    );
  }

  if (sort === 'oldest') {
    filtered.reverse();
  }

  res.json({ orders: await Promise.all(filtered.map(withSignedFileLinks)), total: filtered.length });
});

// Admin Order Status Update (Approve, Reject, Cancel, In Progress, Review, Completed)
app.patch('/api/admin/orders/:id/status', requireAdmin, async (req: RequestWithUser, res: Response) => {
  const orderId = req.params.id;
  const { status, rejectionReason, cancellationReason } = req.body as {
    status: OrderStatus;
    rejectionReason?: string;
    cancellationReason?: string;
  };

  const orderIndex = ordersStore.findIndex((o) => o.id.toLowerCase() === orderId.toLowerCase());
  if (orderIndex === -1) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const order = ordersStore[orderIndex];
  const allowedStatuses: OrderStatus[] = ['new_order', 'under_review', 'approved', 'payment_pending', 'verification_pending', 'payment_confirmed', 'in_progress', 'review', 'completed', 'cancelled', 'rejected', 'requirements_review', 'quote_sent'];
  if (!allowedStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid order status.' });
    return;
  }
  if (['in_progress', 'review', 'completed'].includes(status) && order.paymentStatus !== 'paid') {
    res.status(409).json({ error: 'Work cannot move forward until payment has been verified.' });
    return;
  }
  const now = new Date().toISOString();

  let updatedTimeline = [...order.timeline];

  if (status === 'approved') {
    updatedTimeline = updatedTimeline.map((step) => {
      if (step.id === 't2' || step.title.toLowerCase().includes('review') || step.title.toLowerCase().includes('approval')) {
        return { ...step, title: 'Requirements Approved', description: 'Approved by CAMPORA Admin Desk. Ready for payment.', status: 'completed' as const, timestamp: now };
      }
      if (step.id === 't3' || step.title.toLowerCase().includes('payment')) {
        return { ...step, status: 'current' as const };
      }
      return step;
    });
  } else if (status === 'rejected') {
    if (!rejectionReason || !rejectionReason.trim()) {
      res.status(400).json({ error: 'Rejection reason is required.' });
      return;
    }
    updatedTimeline.push({
      id: `rej-${Date.now()}`,
      title: 'Order Rejected',
      description: `Reason: ${rejectionReason.trim()}`,
      timestamp: now,
      status: 'completed',
    });
  } else if (status === 'cancelled') {
    if (!cancellationReason || !cancellationReason.trim()) {
      res.status(400).json({ error: 'Cancellation reason is required.' });
      return;
    }
    updatedTimeline.push({
      id: `canc-${Date.now()}`,
      title: 'Order Cancelled by Admin',
      description: `Reason: ${cancellationReason.trim()}`,
      timestamp: now,
      status: 'completed',
    });
  }

  const updatedOrder: CamporaOrder = {
    ...order,
    status,
    rejectionReason: status === 'rejected' ? rejectionReason?.trim() : order.rejectionReason,
    cancellationReason: status === 'cancelled' ? cancellationReason?.trim() : order.cancellationReason,
    cancelledBy: status === 'cancelled' ? 'Admin' : order.cancelledBy,
    cancelledAt: status === 'cancelled' ? now : order.cancelledAt,
    paymentStatus: status === 'approved' && order.paymentStatus === 'awaiting_quote' ? 'pending' : order.paymentStatus,
    timeline: updatedTimeline,
    updatedAt: now,
  };

  ordersStore[orderIndex] = updatedOrder;
  await persistState();
  res.json({ success: true, order: updatedOrder });
});

// Admin Payment Verification (Confirm or Reject)
app.patch('/api/admin/orders/:id/payment', requireAdmin, async (req: RequestWithUser, res: Response) => {
  const orderId = req.params.id;
  const { action, rejectionReason } = req.body as { action: 'confirm' | 'reject'; rejectionReason?: string };

  const orderIndex = ordersStore.findIndex((o) => o.id.toLowerCase() === orderId.toLowerCase());
  if (orderIndex === -1) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const order = ordersStore[orderIndex];
  if (action === 'confirm' && (order.paymentStatus !== 'verification_pending' || !order.paymentDetails?.utrNumber)) {
    res.status(409).json({ error: 'A submitted payment reference must be verified before confirming payment.' });
    return;
  }
  if (action === 'reject' && order.paymentStatus !== 'verification_pending') {
    res.status(409).json({ error: 'There is no submitted payment proof to reject.' });
    return;
  }

  const payableAmount = order.finalPrice ?? order.total;
  const now = new Date().toISOString();

  if (action === 'confirm') {
    const utr = order.paymentDetails?.utrNumber || 'MANUAL-ADMIN-CONFIRMED';
    const updatedTimeline: TimelineStep[] = order.timeline.map((step) => {
      if (step.id === 't3' || step.title.toLowerCase().includes('payment')) {
        return {
          ...step,
          title: 'Payment Confirmed',
          description: `₹${payableAmount} verified in SBI account (UTR: ${utr}).`,
          status: 'completed' as const,
          timestamp: now,
        };
      }
      if (step.id === 't4' || step.title.toLowerCase().includes('progress')) {
        return { ...step, status: 'current' as const };
      }
      return step;
    });

    const updatedOrder: CamporaOrder = {
      ...order,
      paymentStatus: 'paid',
      status: 'in_progress',
      progressPercent: Math.max(order.progressPercent, 50),
      paymentDetails: {
        ...(order.paymentDetails || { upiId: 'tanmayvbhagat-1@oksbi' }),
        upiId: 'tanmayvbhagat-1@oksbi',
        amountPaid: payableAmount,
        verifiedAt: now,
        verifiedBy: 'CAMPORA Lead Admin',
      },
      timeline: updatedTimeline,
      updatedAt: 'Just now',
    };

    ordersStore[orderIndex] = updatedOrder;
    await persistState();
    res.json({ success: true, message: `Payment verified for ₹${payableAmount}. Order is now in progress.`, order: updatedOrder });
    return;
  }

  if (action === 'reject') {
    const reason = rejectionReason?.trim();
    if (!reason) {
      res.status(400).json({ error: 'A reason is required when rejecting payment proof.' });
      return;
    }
    const updatedTimeline: TimelineStep[] = order.timeline.map((step) => {
      if (step.id === 't3' || step.title.toLowerCase().includes('payment')) {
        return {
          ...step,
          title: 'Payment Verification Issue',
          description: reason,
          status: 'current' as const,
          timestamp: now,
        };
      }
      return step;
    });

    const updatedOrder: CamporaOrder = {
      ...order,
      paymentStatus: 'rejected',
      paymentDetails: {
        ...(order.paymentDetails || { upiId: 'tanmayvbhagat-1@oksbi' }),
        rejectionReason: reason,
      },
      timeline: updatedTimeline,
      updatedAt: 'Just now',
    };

    ordersStore[orderIndex] = updatedOrder;
    await persistState();
    res.json({ success: true, message: 'Payment marked as rejected.', order: updatedOrder });
    return;
  }

  res.status(400).json({ error: 'Invalid payment verification action.' });
});

// Admin Upload Completed Deliverable
app.post('/api/admin/orders/:id/deliverables', requireAdmin, async (req: RequestWithUser, res: Response) => {
  const orderId = req.params.id;
  const { title, fileType, fileData, fileName } = req.body || {};

  const orderIndex = ordersStore.findIndex((o) => o.id.toLowerCase() === orderId.toLowerCase());
  if (orderIndex === -1) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const order = ordersStore[orderIndex];
  if (order.paymentStatus !== 'paid') {
    res.status(409).json({ error: 'A deliverable cannot be marked complete until payment is verified.' });
    return;
  }

  let storedFile: { storagePath: string; contentType: string; size: number };
  try {
    storedFile = await uploadPrivateDataUrl('orders/' + order.id + '/deliverables', fileName || title || 'completed-work', fileData);
  } catch (uploadError: any) {
    res.status(400).json({ error: uploadError.message || 'Unable to upload completed work.' });
    return;
  }

  const now = new Date().toISOString();
  const safeTitle = typeof title === 'string' && title.trim()
    ? title.trim().slice(0, 180)
    : path.basename(String(fileName || 'Completed_Deliverable')).slice(0, 180);
  const newDeliverable: DeliverableFile = {
    id: 'del-' + randomBytes(8).toString('hex'),
    title: safeTitle,
    fileType: (typeof fileType === 'string' ? fileType : storedFile.contentType).toUpperCase(),
    fileSize: (storedFile.size / (1024 * 1024)).toFixed(2) + ' MB',
    uploadedAt: now,
    storagePath: storedFile.storagePath,
  };

  const updatedDeliverables = [...(order.deliverables || []), newDeliverable];
  const updatedTimeline: TimelineStep[] = order.timeline.map((step) => {
    if (step.id === 't5' || step.title.toLowerCase().includes('delivery') || step.title.toLowerCase().includes('completed')) {
      return {
        ...step,
        title: 'Completed & Delivered',
        description: 'Deliverable uploaded: ' + newDeliverable.title,
        status: 'completed' as const,
        timestamp: now,
      };
    }
    return step;
  });

  const updatedOrder: CamporaOrder = {
    ...order,
    status: 'completed',
    progressPercent: 100,
    deliverables: updatedDeliverables,
    timeline: updatedTimeline,
    updatedAt: now,
  };

  ordersStore[orderIndex] = updatedOrder;
  await persistState();
  res.json({ success: true, message: 'Completed deliverable uploaded successfully.', order: await withSignedFileLinks(updatedOrder) });
});

// Admin Private Notes
app.patch('/api/admin/orders/:id/notes', requireAdmin, async (req: RequestWithUser, res: Response) => {
  const orderId = req.params.id;
  const { adminNotes } = req.body;

  const orderIndex = ordersStore.findIndex((o) => o.id.toLowerCase() === orderId.toLowerCase());
  if (orderIndex === -1) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  ordersStore[orderIndex].adminNotes = adminNotes || '';
  ordersStore[orderIndex].updatedAt = new Date().toISOString();
  await persistState();

  res.json({ success: true, order: ordersStore[orderIndex] });
});

// Admin List All Customers
app.get('/api/admin/customers', requireAdmin, (_req: RequestWithUser, res: Response) => {
  const customerMap = new Map<string, any>();

  ordersStore.forEach((ord) => {
    const key = ord.customerEmail.toLowerCase();
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        id: ord.customerId,
        name: ord.customerName,
        email: ord.customerEmail,
        whatsapp: ord.whatsappNumber,
        college: ord.college,
        ordersCount: 0,
        totalSpend: 0,
        orders: [],
      });
    }

    const c = customerMap.get(key);
    c.ordersCount += 1;
    if (ord.paymentStatus === 'paid') {
      c.totalSpend += ord.finalPrice || ord.total;
    }
    c.orders.push({
      id: ord.id,
      serviceName: ord.serviceName,
      status: ord.status,
      paymentStatus: ord.paymentStatus,
      total: ord.finalPrice || ord.total,
      createdAt: ord.createdAt,
    });
  });

  res.json({ customers: Array.from(customerMap.values()) });
});

// Admin File Repository Aggregator
app.get('/api/admin/files', requireAdmin, async (_req: RequestWithUser, res: Response) => {
  const files: any[] = [];

  for (const ord of ordersStore) {
    if (ord.collegeTemplateFile) {
      files.push({
        id: ord.collegeTemplateFile.id,
        orderId: ord.id,
        customerName: ord.customerName,
        name: ord.collegeTemplateFile.name,
        type: 'College Template',
        fileType: ord.collegeTemplateFile.type,
        size: ord.collegeTemplateFile.size,
        uploadedAt: ord.collegeTemplateFile.uploadedAt || ord.createdAt,
        downloadUrl: ord.collegeTemplateFile.storagePath ? await createPrivateSignedUrl(ord.collegeTemplateFile.storagePath) : undefined,
      });
    }

    if (ord.referenceFiles?.length) {
      for (const rf of ord.referenceFiles) {
        files.push({
          id: rf.id,
          orderId: ord.id,
          customerName: ord.customerName,
          name: rf.name,
          type: 'Reference Material',
          fileType: rf.type,
          size: rf.size,
          uploadedAt: rf.uploadedAt || ord.createdAt,
          downloadUrl: rf.storagePath ? await createPrivateSignedUrl(rf.storagePath) : undefined,
        });
      }
    }

    if (ord.paymentDetails?.screenshotUrl || ord.paymentDetails?.screenshotStoragePath || ord.paymentDetails?.screenshotName) {
      files.push({
        id: `ss-${ord.id}`,
        orderId: ord.id,
        customerName: ord.customerName,
        name: ord.paymentDetails.screenshotName || 'Payment_Screenshot.png',
        type: 'Payment Proof',
        fileType: 'image/png',
        size: ord.paymentDetails.screenshotSize || '350 KB',
        uploadedAt: ord.paymentDetails.submittedAt || ord.updatedAt,
        previewUrl: ord.paymentDetails.screenshotStoragePath ? await createPrivateSignedUrl(ord.paymentDetails.screenshotStoragePath) : ord.paymentDetails.screenshotUrl,
      });
    }

    if (ord.deliverables?.length) {
      for (const del of ord.deliverables) {
        files.push({
          id: del.id,
          orderId: ord.id,
          customerName: ord.customerName,
          name: del.title,
          type: 'Completed Deliverable',
          fileType: del.fileType,
          size: del.fileSize,
          uploadedAt: del.uploadedAt,
          downloadUrl: del.storagePath ? await createPrivateSignedUrl(del.storagePath) : del.downloadUrl,
        });
      }
    }
  }

  res.json({ files });
});

// ==========================================
// VITE MIDDLEWARE & STATIC SERVING
// ==========================================
async function startServer() {
  await loadPersistentState();
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CAMPORA Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
