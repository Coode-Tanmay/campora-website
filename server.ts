import { createClient } from '@supabase/supabase-js';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { INITIAL_ORDERS } from './src/data/mockData';
import { CamporaOrder, AuthUser, OrderStatus, PaymentStatus, DeliverableFile, TimelineStep } from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

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

// Fail closed: never run with default or hard-coded production credentials.
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('Missing or weak JWT_SECRET. Set a random secret of at least 32 characters in your local environment.');
}
if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  throw new Error('Missing ADMIN_USERNAME or ADMIN_PASSWORD. Configure both in your local environment.');
}

// Middlewares
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(cookieParser());

// Database-backed application state. The server keeps a short-lived in-process cache,
// but every mutation is persisted to Supabase before the API reports success.
let ordersStore: CamporaOrder[] = [];
interface StoredUser extends AuthUser { passwordHash?: string; }
let usersStore: StoredUser[] = [];
let stateWriteQueue: Promise<unknown> = Promise.resolve();

async function loadPersistentState(): Promise<void> {
  const { data, error } = await supabase
    .from('campora_app_state')
    .select('orders, users')
    .eq('id', 'primary')
    .maybeSingle();
  if (error) throw new Error(`Unable to load CAMPORA data from Supabase: ${error.message}`);
  if (data) {
    ordersStore = Array.isArray(data.orders) ? data.orders as CamporaOrder[] : [];
    usersStore = Array.isArray(data.users) ? data.users as StoredUser[] : [];
    return;
  }
  // Start with no fake customers or sample orders in production.
  ordersStore = process.env.NODE_ENV === 'production' ? [] : JSON.parse(JSON.stringify(INITIAL_ORDERS));
  usersStore = [];
  await persistState();
}

async function persistState(): Promise<void> {
  const snapshot = {
    id: 'primary',
    orders: ordersStore,
    users: usersStore,
    updated_at: new Date().toISOString(),
  };
  // Serialize writes so concurrent requests cannot complete out of order.
  stateWriteQueue = stateWriteQueue.then(async () => {
    const { error } = await supabase.from('campora_app_state').upsert(snapshot, { onConflict: 'id' });
    if (error) throw new Error(`Unable to save CAMPORA data to Supabase: ${error.message}`);
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
    { provider, origin },
    JWT_SECRET,
    { expiresIn: '10m', issuer: 'campora', audience: 'campora-oauth' },
  );
}

function verifyOAuthState(state: unknown, provider: 'google' | 'microsoft', expectedOrigin: string): string {
  if (typeof state !== 'string' || !state) {
    throw new Error('OAuth state is missing. Please restart sign-in.');
  }
  const payload = jwt.verify(state, JWT_SECRET, {
    issuer: 'campora',
    audience: 'campora-oauth',
  }) as jwt.JwtPayload & { provider?: string; origin?: string };
  if (payload.provider !== provider || payload.origin !== expectedOrigin) {
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
app.get('/api/auth/google/url', (req: Request, res: Response) => {
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
app.get('/api/auth/microsoft/url', (req: Request, res: Response) => {
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
    const origin = verifyOAuthState(req.query.state, 'google', getRequestOrigin(req));
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
    if (!profile.email) {
      throw new Error('Google account did not return a verified email address.');
    }

    const email = profile.email.toLowerCase().trim();
    let user = usersStore.find((u) => u.email.toLowerCase() === email);

    if (!user) {
      // Create new customer account with role 'customer'
      const newCustomer: StoredUser = {
        id: `cust-${Date.now()}`,
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
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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
    const origin = verifyOAuthState(req.query.state, 'microsoft', getRequestOrigin(req));
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
        id: `cust-${Date.now()}`,
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
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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
app.post('/api/auth/admin/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  // Server-side validation against protected credentials
  if (username.trim() === ADMIN_USERNAME && password.trim() === ADMIN_PASSWORD) {
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
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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

// Customer Email/Password Login & Register
app.post('/api/auth/customer/login', async (req: Request, res: Response) => {
  const { email, password, name, whatsapp, college } = req.body;

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    res.status(400).json({ error: 'A valid email and password are required.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must contain at least 8 characters.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  let user = usersStore.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    if (!name?.trim()) {
      res.status(400).json({ error: 'Name is required when creating a customer account.' });
      return;
    }
    const newCustomer: StoredUser = {
      id: `cust-${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'customer',
      whatsapp: whatsapp?.trim() || '',
      college: college?.trim() || '',
      authProvider: 'email',
      createdAt: new Date().toISOString(),
    };
    usersStore.push(newCustomer);
    user = newCustomer;
  } else {
    if (!user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    if (name && !user.name) user.name = name.trim();
    if (whatsapp && !user.whatsapp) user.whatsapp = whatsapp.trim();
    if (college && !user.college) user.college = college.trim();
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
    authProvider: 'email',
    createdAt: user.createdAt,
  };

  const token = jwt.sign(customerPayload, JWT_SECRET, { expiresIn: '7d' });

  res.cookie('campora_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    user: customerPayload,
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
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

// ==========================================
// CUSTOMER-FACING ORDER & ACCOUNT ROUTES
// ==========================================

// Get authenticated customer's own orders ONLY
app.get('/api/customer/orders', requireAuth, (req: RequestWithUser, res: Response) => {
  const user = req.user!;
  
  // Filter exclusively for this customer
  const userOrders = ordersStore
    .filter((o) => o.customerId === user.id || o.customerEmail.toLowerCase() === user.email.toLowerCase())
    .map((o) => {
      // Strip private admin notes before returning to customer
      const { adminNotes, ...customerSafeOrder } = o;
      return customerSafeOrder;
    });

  res.json({ orders: userOrders });
});

// Get single order with strict ownership authorization
app.get('/api/customer/orders/:id', requireAuth, (req: RequestWithUser, res: Response) => {
  const user = req.user!;
  const orderId = req.params.id;

  const order = ordersStore.find((o) => o.id.toLowerCase() === orderId.toLowerCase());

  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  // Strict ownership check: Only owner customer or admin can access
  if (user.role !== 'admin' && order.customerId !== user.id && order.customerEmail.toLowerCase() !== user.email.toLowerCase()) {
    res.status(403).json({ error: 'Access Denied: You do not have permission to view this order.' });
    return;
  }

  const { adminNotes, ...customerSafeOrder } = order;
  res.json({ order: user.role === 'admin' ? order : customerSafeOrder });
});

// Create new customer order with backend package discount enforcement
app.post('/api/customer/orders', requireAuth, async (req: RequestWithUser, res: Response) => {
  const user = req.user;
  const data = req.body;

  if (!data.customerName || !data.whatsappNumber || !data.topic || !data.serviceId) {
    res.status(400).json({ error: 'Missing required order fields.' });
    return;
  }

  const isPackage = Boolean(data.isPackage || data.serviceId === 'internship-package');
  let subtotal = Number(data.subtotal) || (isPackage ? 499 : 250);
  let discount = Number(data.discount) || 0;
  let couponCode = data.couponCode;

  // STRICT PACKAGE DISCOUNT RULE ENFORCEMENT ON BACKEND:
  // Complete Internship Package (₹499) is NOT eligible for discount codes.
  if (isPackage) {
    discount = 0;
    couponCode = undefined;
    subtotal = 499;
  }

  const total = Math.max(0, subtotal - discount);

  const orderId = `CMP-${Math.floor(1000 + Math.random() * 9000)}`;
  const nowStr = 'Just now';

  const newOrder: CamporaOrder = {
    id: orderId,
    customerId: user?.id || `guest-${Date.now()}`,
    customerName: data.customerName.trim(),
    customerEmail: data.customerEmail?.trim() || user?.email || `${data.customerName.toLowerCase().replace(/\s+/g, '')}@student.edu`,
    whatsappNumber: data.whatsappNumber.trim(),
    college: data.college?.trim() || 'University Student',
    serviceId: data.serviceId,
    serviceName: data.serviceName || 'Academic Service',
    isPackage,
    pricingType: data.pricingType || (data.serviceId === 'urgent-ppt' ? 'variable' : 'fixed'),
    topic: data.topic.trim(),
    pagesOrSlides: Number(data.pagesOrSlides) || 15,
    deadline: data.deadline || 'Standard (24-48 hrs)',
    instructions: data.instructions || '',
    hasCollegeTemplate: Boolean(data.hasCollegeTemplate),
    collegeTemplateFile: data.collegeTemplateFile,
    templateInstructions: data.templateInstructions,
    referenceFiles: data.referenceFiles || [],
    subtotal,
    finalPrice: subtotal,
    discount,
    discountEligible: !isPackage,
    couponCode,
    total,
    quoteStatus: data.pricingType === 'variable' ? 'pending' : 'not_required',
    paymentStatus: 'pending',
    status: 'new_order',
    requiresReview: data.pricingType === 'variable' || isPackage || Boolean(data.hasCollegeTemplate),
    reviewReason: data.pricingType === 'variable' ? 'Urgent / Variable scope review required.' : 'New order awaiting admin review.',
    progressPercent: 10,
    createdAt: nowStr,
    updatedAt: nowStr,
    estimatedDelivery: data.deadline?.includes('1-3') ? 'In 3 Hours' : 'In 24-48 Hours',
    timeline: [
      { id: 't1', title: 'Order Submitted', description: 'Brief and files received by CAMPORA desk', timestamp: nowStr, status: 'completed' },
      { id: 't2', title: 'Admin Review & Approval', description: 'Lead editor is reviewing academic guidelines', status: 'current' },
      { id: 't3', title: 'Payment Verification', description: 'UPI payment confirmation', status: 'pending' },
      { id: 't4', title: 'Work In Progress', description: 'Designer drafting initial deliverables', status: 'pending' },
      { id: 't5', title: 'Quality Assurance & Delivery', description: 'Final plagiarism check and downloadable delivery', status: 'pending' },
    ],
    deliverables: [],
  };

  ordersStore.unshift(newOrder);

  // If customer is authenticated, also sync to their user profile
  if (user && !usersStore.find((u) => u.id === user.id)) {
    usersStore.push({
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'customer',
      whatsapp: user.whatsapp,
      college: user.college,
    });
  }

  await persistState();
  res.status(201).json({ success: true, order: newOrder });
});

// Customer submits UPI payment proof (UTR and screenshot)
app.post('/api/customer/orders/:id/payment', requireAuth, async (req: RequestWithUser, res: Response) => {
  const user = req.user!;
  const orderId = req.params.id;
  const { utrNumber, screenshotUrl, screenshotName, screenshotSize } = req.body;

  const orderIndex = ordersStore.findIndex((o) => o.id.toLowerCase() === orderId.toLowerCase());
  if (orderIndex === -1) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const order = ordersStore[orderIndex];

  // Ownership check
  if (user.role !== 'admin' && order.customerId !== user.id && order.customerEmail.toLowerCase() !== user.email.toLowerCase()) {
    res.status(403).json({ error: 'Access Denied: You cannot submit payment for another customer order.' });
    return;
  }

  if (!utrNumber || !utrNumber.trim()) {
    res.status(400).json({ error: 'Please provide a valid UPI Reference / UTR Number.' });
    return;
  }

  const payableAmount = order.finalPrice || order.total;

  // IMPORTANT: Uploading a payment screenshot must NOT automatically mark the order as paid.
  // It transitions to 'verification_pending' until Admin verifies.
  const updatedTimeline: TimelineStep[] = order.timeline.map((step) => {
    if (step.id === 't3' || step.title.toLowerCase().includes('payment')) {
      return {
        ...step,
        title: 'Payment Verification Pending',
        description: `Student submitted UTR: ${utrNumber.trim()}. CAMPORA Admin is verifying with SBI statement.`,
        status: 'current' as const,
        timestamp: 'Just now',
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
      utrNumber: utrNumber.trim(),
      screenshotUrl: screenshotUrl || undefined,
      screenshotName: screenshotName || 'Payment_Proof.png',
      screenshotSize: screenshotSize || '320 KB',
      submittedAt: 'Today, Just now',
      amountPaid: payableAmount,
    },
    timeline: updatedTimeline,
    updatedAt: 'Just now',
  };

  ordersStore[orderIndex] = updatedOrder;
  await persistState();

  const { adminNotes, ...customerSafeOrder } = updatedOrder;
  res.json({ success: true, message: 'Payment proof submitted. Admin will verify shortly.', order: customerSafeOrder });
});

// Customer profile & stats
app.get('/api/customer/profile', requireAuth, (req: RequestWithUser, res: Response) => {
  const user = req.user!;
  const userOrders = ordersStore.filter((o) => o.customerId === user.id || o.customerEmail.toLowerCase() === user.email.toLowerCase());
  
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
app.get('/api/admin/overview', requireAdmin, (_req: RequestWithUser, res: Response) => {
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
    recentOrders: ordersStore.slice(0, 10),
  });
});

// Admin All Orders with query filters
app.get('/api/admin/orders', requireAdmin, (req: RequestWithUser, res: Response) => {
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

  res.json({ orders: filtered, total: filtered.length });
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
  const now = 'Just now';

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
  const payableAmount = order.finalPrice || order.total;
  const now = 'Today, Just now';

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
    const reason = rejectionReason?.trim() || 'Payment could not be verified in bank records. Please re-check UTR and receipt.';
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
  const { title, fileType, fileSize, downloadUrl } = req.body;

  const orderIndex = ordersStore.findIndex((o) => o.id.toLowerCase() === orderId.toLowerCase());
  if (orderIndex === -1) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const order = ordersStore[orderIndex];

  const newDeliverable: DeliverableFile = {
    id: `del-${Date.now()}`,
    title: title?.trim() || `${order.serviceName.replace(/\s+/g, '_')}_Final_Deliverable.${fileType?.toLowerCase() || 'pdf'}`,
    fileType: (fileType || 'PDF').toUpperCase(),
    fileSize: fileSize || '2.4 MB',
    uploadedAt: 'Today, Just now',
    downloadUrl: downloadUrl || '#',
  };

  const updatedDeliverables = [...(order.deliverables || []), newDeliverable];

  const updatedTimeline: TimelineStep[] = order.timeline.map((step) => {
    if (step.id === 't5' || step.title.toLowerCase().includes('delivery') || step.title.toLowerCase().includes('completed')) {
      return {
        ...step,
        title: 'Completed & Delivered',
        description: `Deliverable uploaded: ${newDeliverable.title}`,
        status: 'completed' as const,
        timestamp: 'Just now',
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
    updatedAt: 'Just now',
  };

  ordersStore[orderIndex] = updatedOrder;
  await persistState();
  res.json({ success: true, message: 'Completed deliverable uploaded successfully.', order: updatedOrder });
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
app.get('/api/admin/files', requireAdmin, (_req: RequestWithUser, res: Response) => {
  const files: any[] = [];

  ordersStore.forEach((ord) => {
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
      });
    }

    if (ord.referenceFiles?.length) {
      ord.referenceFiles.forEach((rf) => {
        files.push({
          id: rf.id,
          orderId: ord.id,
          customerName: ord.customerName,
          name: rf.name,
          type: 'Reference Material',
          fileType: rf.type,
          size: rf.size,
          uploadedAt: rf.uploadedAt || ord.createdAt,
        });
      });
    }

    if (ord.paymentDetails?.screenshotUrl || ord.paymentDetails?.screenshotName) {
      files.push({
        id: `ss-${ord.id}`,
        orderId: ord.id,
        customerName: ord.customerName,
        name: ord.paymentDetails.screenshotName || 'Payment_Screenshot.png',
        type: 'Payment Proof',
        fileType: 'image/png',
        size: ord.paymentDetails.screenshotSize || '350 KB',
        uploadedAt: ord.paymentDetails.submittedAt || ord.updatedAt,
        previewUrl: ord.paymentDetails.screenshotUrl,
      });
    }

    if (ord.deliverables?.length) {
      ord.deliverables.forEach((del) => {
        files.push({
          id: del.id,
          orderId: ord.id,
          customerName: ord.customerName,
          name: del.title,
          type: 'Completed Deliverable',
          fileType: del.fileType,
          size: del.fileSize,
          uploadedAt: del.uploadedAt,
          downloadUrl: del.downloadUrl,
        });
      });
    }
  });

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
