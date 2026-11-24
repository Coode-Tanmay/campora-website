import { createClient } from '@supabase/supabase-js';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { randomBytes, randomInt, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { INITIAL_ORDERS, SERVICES_DATA } from './src/data/mockData';
import { CamporaOrder, AuthUser, OrderStatus, PaymentStatus, DeliverableFile, TimelineStep, OrderAttachment } from './src/types';
import { sendVerificationEmail, sendPasswordResetEmail, sendOrderConfirmationEmail, sendPaymentUpdateEmail, sendOrderStatusEmail, sendDeliveryEmail } from './src/server/email';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Express 4 does not catch errors thrown inside async route handlers. Without this, a single
// malformed request or a failed outbound call (for example to Razorpay) becomes an unhandled
// rejection that terminates the whole Node process. Wrap every route handler so that errors are
// forwarded to the error middleware registered in startServer().
function wrapAsyncHandler(handler: (req: Request, res: Response, next: NextFunction) => unknown) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = handler(req, res, next);
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        (result as Promise<unknown>).catch(next);
      }
    } catch (error) {
      next(error);
    }
  };
}
for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
  const original = (app[method] as (...args: unknown[]) => unknown).bind(app);
  (app as unknown as Record<string, unknown>)[method] = (...args: unknown[]) => {
    // app.get('setting') with a single argument is Express's settings getter; leave it alone.
    if (args.length < 2) return original(...args);
    const [route, ...handlers] = args;
    return original(route, ...handlers.map((handler) => (
      typeof handler === 'function' && handler.length < 4
        ? wrapAsyncHandler(handler as (req: Request, res: Response, next: NextFunction) => unknown)
        : handler
    )));
  };
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason instanceof Error ? reason.message : reason);
});

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
// Enable verification only when at least one complete transactional email sender is configured.
const EMAIL_VERIFICATION_ENABLED = Boolean(
  (process.env.GMAIL_APPS_SCRIPT_URL && process.env.GMAIL_APPS_SCRIPT_TOKEN) ||
  (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL)
);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const RAZORPAY_MODE = process.env.RAZORPAY_MODE === 'test' || process.env.RAZORPAY_MODE === 'live' ? process.env.RAZORPAY_MODE : 'disabled';
const razorpayKeyMatchesMode = RAZORPAY_MODE === 'test'
  ? Boolean(RAZORPAY_KEY_ID?.startsWith('rzp_test_'))
  : RAZORPAY_MODE === 'live' ? Boolean(RAZORPAY_KEY_ID?.startsWith('rzp_live_')) : false;
const RAZORPAY_ENABLED = false; // CAMPORA uses manual UPI only; no gateway fees.

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
app.set('trust proxy', 1); // Trust the Render ingress proxy so req.ip reflects the forwarded client address.
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
const standardJsonParser = express.json({ limit: '2mb' });
app.use((req: Request, res: Response, next: NextFunction) => {
  const isLargeFileUpload = req.method === 'POST' && (
    req.path === '/api/customer/orders'
    || /^\/api\/admin\/orders\/[^/]+\/deliverables$/.test(req.path)
    || req.path === '/api/payments/razorpay/webhook'
  );
  if (isLargeFileUpload) {
    next();
    return;
  }
  standardJsonParser(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Reject cross-origin browser mutations. The frontend and API share the canonical APP_URL
// through the Vercel rewrite, so state-changing requests must originate from that origin.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    next();
    return;
  }
  const origin = req.get('origin');
  if (process.env.NODE_ENV === 'production' && req.path !== '/api/payments/razorpay/webhook') {
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
interface StoredUser extends AuthUser { notificationReadIds?: string[]; passwordHash?: string; emailVerified?: boolean; emailVerificationTokenHash?: string; emailVerificationExpiresAt?: number; passwordResetTokenHash?: string; passwordResetExpiresAt?: number; }
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
  // Recover the queue after a transient failed write so one database error does not
  // permanently block every future order/account mutation in this process.
  stateWriteQueue = stateWriteQueue.catch((previousError) => {
    console.error('Recovering CAMPORA state write queue after a failed write:', previousError instanceof Error ? previousError.message : 'Unknown error');
  }).then(async () => {
    const { error } = await supabase.from('campora_app_state').upsert(snapshot, { onConflict: 'id' });
    if (error) throw new Error(`Unable to save CAMPORA data to Supabase: ${error.message}`);
  });
  await stateWriteQueue;
}


const PRIVATE_FILES_BUCKET = 'campora-private';
const MAX_PRIVATE_FILE_BYTES = 15 * 1024 * 1024;
const MAX_ORDER_UPLOAD_BYTES = 8 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.zip': 'application/zip',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

function parsePrivateUpload(dataUrl: unknown, fileName: unknown): { buffer: Buffer; mimeType: string } {
  if (typeof dataUrl !== 'string' || typeof fileName !== 'string' || !fileName.trim()) {
    throw new Error('A valid file name and file content are required.');
  }

  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new Error('The selected file could not be read. Please choose it again.');

  const extension = path.extname(fileName).toLowerCase();
  const expectedMimeType = MIME_BY_EXTENSION[extension];
  const declaredMimeType = match[1].toLowerCase()
    .replace('image/jpg', 'image/jpeg')
    .replace('application/x-zip-compressed', 'application/zip');
  if (!expectedMimeType || !['application/octet-stream', expectedMimeType].includes(declaredMimeType)) {
    throw new Error('Unsupported file type. Please upload a supported PDF, Office document, ZIP, JPG or PNG file.');
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0 || buffer.length > MAX_PRIVATE_FILE_BYTES) {
    throw new Error('Each file must be 5 MB or smaller.');
  }

  if (expectedMimeType === 'application/pdf' && buffer.subarray(0, 5).toString() !== '%PDF-') {
    throw new Error('The selected PDF file appears to be invalid.');
  }
  if (expectedMimeType === 'image/png' && !buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error('The selected PNG file appears to be invalid.');
  }
  if (expectedMimeType === 'image/jpeg' && !(buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)) {
    throw new Error('The selected JPG file appears to be invalid.');
  }
  if (['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'].includes(expectedMimeType)
    && !(buffer[0] === 0x50 && buffer[1] === 0x4b)) {
    throw new Error('The selected Office or ZIP file appears to be invalid.');
  }
  if (['application/vnd.ms-powerpoint', 'application/msword', 'application/vnd.ms-excel'].includes(expectedMimeType)
    && !buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) {
    throw new Error('The selected legacy Office file appears to be invalid.');
  }
  if (expectedMimeType === 'image/gif' && !['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString())) {
    throw new Error('The selected GIF file appears to be invalid.');
  }
  if (expectedMimeType === 'image/webp' && !(buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP')) {
    throw new Error('The selected WEBP file appears to be invalid.');
  }

  return { buffer, mimeType: expectedMimeType };
}

// Attachment records arrive from the browser. Keep only display fields: storage paths and
// file contents must only ever be set by the server after a validated upload, otherwise a
// customer could point an order at someone else's private file or bloat the stored state.
function sanitizeAttachment(raw: unknown): OrderAttachment | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const item = raw as Record<string, unknown>;
  if (typeof item.id !== 'string' || !item.id || item.id.length > 80) return undefined;
  const text = (value: unknown, max: number, fallback = '') => (typeof value === 'string' ? value.slice(0, max) : fallback);
  return {
    id: item.id,
    name: text(item.name, 180, 'attachment'),
    size: text(item.size, 40),
    type: text(item.type, 120),
  };
}

function generateOrderId(): string {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `CMP-${randomInt(10_000_000, 100_000_000)}`;
    if (!ordersStore.some((order) => order.id === candidate)) return candidate;
  }
  throw new Error('Unable to allocate an order number. Please try again.');
}

async function uploadPrivateFile(
  orderId: string,
  category: string,
  fileName: string,
  file: { buffer: Buffer; mimeType: string },
): Promise<string> {
  const safeName = fileName.replace(/[^a-zA-Z0-9._()-]/g, '_').slice(0, 100) || 'attachment';
  const storagePath = `orders/${orderId}/${category}/${randomBytes(16).toString('hex')}-${safeName}`;
  const { error } = await supabase.storage.from(PRIVATE_FILES_BUCKET).upload(storagePath, file.buffer, {
    contentType: file.mimeType,
    upsert: false,
  });
  if (error) {
    console.error('CAMPORA private file upload failed:', error.message);
    throw new Error('Secure file storage is temporarily unavailable. Please try again.');
  }
  return storagePath;
}

async function removePrivateFiles(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error } = await supabase.storage.from(PRIVATE_FILES_BUCKET).remove(paths);
  if (error) console.error('CAMPORA temporary file cleanup failed:', error.message);
}

async function createPrivateFileUrl(storagePath: string, download = false): Promise<string | undefined> {
  const { data, error } = await supabase.storage.from(PRIVATE_FILES_BUCKET).createSignedUrl(
    storagePath,
    60 * 60,
    download ? { download: true } : undefined,
  );
  if (error || !data?.signedUrl) {
    console.error('CAMPORA signed file URL could not be created:', error?.message || 'No URL returned');
    return undefined;
  }
  return data.signedUrl;
}

function toCustomerSafeOrder(order: CamporaOrder): CamporaOrder {
  const { adminNotes, ...customerOrder } = order;
  return {
    ...customerOrder,
    deliverables: customerOrder.paymentStatus === 'paid' && customerOrder.status === 'completed'
      ? (customerOrder.deliverables || [])
      : [],
  };
}

async function hydrateOrderForResponse(order: CamporaOrder): Promise<CamporaOrder> {
  const hydrated: CamporaOrder = { ...order };

  if (order.collegeTemplateFile) {
    const { storagePath, dataUrl, ...attachment } = order.collegeTemplateFile;
    hydrated.collegeTemplateFile = {
      ...attachment,
      downloadUrl: storagePath ? `/api/customer/orders/${encodeURIComponent(order.id)}/files/${encodeURIComponent(attachment.id)}/download` : undefined,
    };
  }

  hydrated.referenceFiles = await Promise.all((order.referenceFiles || []).map(async (file) => {
    const { storagePath, dataUrl, ...attachment } = file;
    return {
      ...attachment,
      downloadUrl: storagePath ? `/api/customer/orders/${encodeURIComponent(order.id)}/files/${encodeURIComponent(attachment.id)}/download` : undefined,
    };
  }));

  if (order.paymentDetails) {
    const { screenshotPath, ...paymentDetails } = order.paymentDetails;
    hydrated.paymentDetails = {
      ...paymentDetails,
      screenshotUrl: screenshotPath
        ? await createPrivateFileUrl(screenshotPath)
        : paymentDetails.screenshotUrl,
    };
  }

  if (order.deliverables) {
    hydrated.deliverables = await Promise.all(order.deliverables.map(async (deliverable) => {
      const { storagePath, ...file } = deliverable;
      return {
        ...file,
        downloadUrl: storagePath ? `/api/customer/orders/${encodeURIComponent(order.id)}/files/${encodeURIComponent(file.id)}/download` : undefined,
      };
    }));
  }

  return hydrated;
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
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as AuthUser & { aud?: unknown };
    // Only genuine session tokens are accepted. Other tokens signed with the same secret (such as
    // the short-lived OAuth state token, which anyone can request) must never act as a login.
    const isSessionToken = typeof decoded?.id === 'string' && decoded.id.length > 0
      && (decoded.role === 'admin' || decoded.role === 'customer')
      && decoded.aud === undefined;
    req.user = isSessionToken ? decoded : undefined;
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
  // Keep administrator authorization isolated from the customer session cookie.
  // Customer sign-in in another tab must not overwrite the admin desk's authority.
  const adminToken = req.cookies?.campora_admin_session;
  if (!adminToken) {
    res.status(401).json({ error: 'Administrator session expired. Please sign in again.' });
    return;
  }
  try {
    const decoded = jwt.verify(adminToken, JWT_SECRET, { algorithms: ['HS256'] }) as AuthUser & { aud?: unknown };
    if (decoded?.role !== 'admin' || typeof decoded.id !== 'string' || !decoded.id || decoded.aud !== undefined) {
      res.status(403).json({ error: 'Access Denied — Administrator access required.' });
      return;
    }
    req.user = decoded;
  } catch {
    res.status(401).json({ error: 'Administrator session expired. Please sign in again.' });
    return;
  }
  next();
};

app.use(authenticateToken);

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
let rateLimitRequestCount = 0;

function createRateLimiter(options: {
  name: string;
  windowMs: number;
  max: number;
  key: (req: RequestWithUser, ip: string) => string;
  message: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const typedReq = req as RequestWithUser;
    const now = Date.now();
    const ip = typedReq.ip || typedReq.socket.remoteAddress || 'unknown';
    const key = `${options.name}:${options.key(typedReq, ip)}`;
    let entry = rateLimitBuckets.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + options.windowMs };
      rateLimitBuckets.set(key, entry);
    }

    if (entry.count >= options.max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      res.setHeader('RateLimit-Limit', String(options.max));
      res.setHeader('RateLimit-Remaining', '0');
      res.setHeader('RateLimit-Reset', String(retryAfter));
      res.status(429).json({ error: options.message });
      return;
    }

    entry.count += 1;
    res.setHeader('RateLimit-Limit', String(options.max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, options.max - entry.count)));
    res.setHeader('RateLimit-Reset', String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))));

    rateLimitRequestCount += 1;
    if (rateLimitRequestCount % 250 === 0 && rateLimitBuckets.size > 5000) {
      for (const [bucketKey, bucket] of rateLimitBuckets) {
        if (now >= bucket.resetAt) rateLimitBuckets.delete(bucketKey);
      }
    }

    next();
  };
}

// This service currently runs as one Render instance. Move these limits to a shared
// store before enabling multiple backend instances.
const adminLoginLimiter = createRateLimiter({
  name: 'admin-login',
  windowMs: 15 * 60 * 1000,
  max: 5,
  key: (req, ip) => `${ip}:${String(req.body?.username || 'unknown').trim().toLowerCase()}`,
  message: 'Too many administrator sign-in attempts. Please wait 15 minutes and try again.',
});
const emailActionLimiter = createRateLimiter({ name: 'customer-email-actions', windowMs: 60 * 60 * 1000, max: 5, key: (_req, ip) => ip, message: 'Too many email requests. Please wait before trying again.' });
const customerLoginLimiter = createRateLimiter({
  name: 'customer-login',
  windowMs: 15 * 60 * 1000,
  max: 10,
  key: (req, ip) => `${ip}:${String(req.body?.email || 'unknown').trim().toLowerCase()}`,
  message: 'Too many sign-in attempts for this account. Please wait 15 minutes and try again.',
});
const orderCreationLimiter = createRateLimiter({
  name: 'customer-order-create',
  windowMs: 60 * 60 * 1000,
  max: 10,
  key: (req, ip) => req.user?.id || ip,
  message: 'Too many new orders were submitted. Please wait before creating another order.',
});
const paymentProofLimiter = createRateLimiter({
  name: 'customer-payment-proof',
  windowMs: 60 * 60 * 1000,
  max: 5,
  key: (req, ip) => `${req.user?.id || ip}:${req.params.id || 'unknown'}`,
  message: 'Too many payment-proof submissions for this order. Please wait before trying again.',
});
const deliverableUploadLimiter = createRateLimiter({
  name: 'admin-deliverable-upload',
  windowMs: 60 * 60 * 1000,
  max: 30,
  key: (req, ip) => req.user?.id || ip,
  message: 'The hourly deliverable upload limit has been reached. Please try again later.',
});

// Admin-only, non-destructive email template test. Sends clearly marked samples
// to the CAMPORA support inbox; it never creates or changes customer/order/payment data.
app.post('/api/admin/email/test', emailActionLimiter, requireAdmin, async (_req: RequestWithUser, res: Response) => {
  const recipient = 'camporasupport@gmail.com';
  if (!EMAIL_VERIFICATION_ENABLED) {
    res.status(503).json({ success: false, error: 'Transactional email is not configured.' });
    return;
  }
  const sampleOrderId = 'TEST-EMAIL-ONLY';
  const results = await Promise.all([
    sendVerificationEmail(recipient, 'CAMPORA Admin (test)', randomBytes(32).toString('hex'), true),
    sendPasswordResetEmail(recipient, 'CAMPORA Admin (test)', randomBytes(32).toString('hex'), true),
    sendOrderConfirmationEmail(recipient, 'CAMPORA Admin (test)', sampleOrderId, 'Sample academic service', true),
    sendPaymentUpdateEmail(recipient, 'CAMPORA Admin (test)', sampleOrderId, 'received', true),
    sendPaymentUpdateEmail(recipient, 'CAMPORA Admin (test)', sampleOrderId, 'confirmed', true),
    sendPaymentUpdateEmail(recipient, 'CAMPORA Admin (test)', sampleOrderId, 'rejected', true),
    sendOrderStatusEmail(recipient, 'CAMPORA Admin (test)', sampleOrderId, 'approved', 'Sample status update only.', true),
    sendDeliveryEmail(recipient, 'CAMPORA Admin (test)', sampleOrderId, true),
  ]);
  const names = ['account verification', 'password reset', 'order confirmation', 'payment received', 'payment confirmed', 'payment rejected', 'order status update', 'delivery notification'];
  const checks = names.map((name, index) => ({ name, sent: results[index] }));
  res.status(results.every(Boolean) ? 200 : 502).json({
    success: results.every(Boolean),
    recipient,
    checks,
    note: 'Test messages only. No customer, order, or payment records were created or modified.',
  });
});

// Public readiness check used by Render. It verifies both the persistent state table
// and the private file bucket without exposing internal error messages or credentials.
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const [databaseResult, storageResult] = await Promise.all([
      supabase.from('campora_app_state').select('id').eq('id', 'primary').maybeSingle(),
      supabase.storage.getBucket(PRIVATE_FILES_BUCKET),
    ]);
    const databaseHealthy = !databaseResult.error;
    const storageHealthy = !storageResult.error && storageResult.data?.public === false;

    res.setHeader('Cache-Control', 'no-store');
    if (!databaseHealthy || !storageHealthy) {
      res.status(503).json({
        status: 'degraded',
        checks: {
          database: databaseHealthy ? 'ok' : 'unavailable',
          privateStorage: storageHealthy ? 'ok' : 'unavailable',
        },
      });
      return;
    }

    res.json({
      status: 'ok',
      checks: { database: 'ok', privateStorage: 'ok' },
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).json({ status: 'degraded', checks: { database: 'unavailable', privateStorage: 'unavailable' } });
  }
});

// Razorpay webhooks are server-to-server and must be verified against the raw body.
app.post('/api/payments/razorpay/webhook', express.raw({ type: 'application/json', limit: '1mb' }), async (req: Request, res: Response) => {
  if (!RAZORPAY_WEBHOOK_SECRET || !Buffer.isBuffer(req.body)) { res.status(503).json({ error: 'Payment webhook is not configured.' }); return; }
  const signature = req.get('x-razorpay-signature') || '';
  const expected = createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(req.body).digest('hex');
  const suppliedBuffer = Buffer.from(signature, 'utf8'); const expectedBuffer = Buffer.from(expected, 'utf8');
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) { res.status(400).json({ error: 'Invalid webhook signature.' }); return; }
  let event: any;
  try { event = JSON.parse(req.body.toString('utf8')); } catch { res.status(400).json({ error: 'Invalid webhook payload.' }); return; }
  const eventId = req.get('x-razorpay-event-id') || event?.id;
  const payment = event?.payload?.payment?.entity;
  const razorpayOrderId = payment?.order_id || event?.payload?.order?.entity?.id;
  if (!razorpayOrderId || !['payment.captured', 'order.paid', 'payment.failed'].includes(event?.event)) { res.status(200).json({ received: true, ignored: true }); return; }
  const orderIndex = ordersStore.findIndex((order) => order.paymentGateway?.provider === 'razorpay' && order.paymentGateway.orderId === razorpayOrderId);
  if (orderIndex === -1) { res.status(200).json({ received: true, ignored: true }); return; }
  const order = ordersStore[orderIndex]; const gateway = order.paymentGateway!;
  if (eventId && gateway.webhookEventIds?.includes(eventId)) { res.status(200).json({ received: true, duplicate: true }); return; }
  const amount = Number(payment?.amount ?? event?.payload?.order?.entity?.amount_paid ?? 0);
  const expectedAmount = Math.round((order.finalPrice ?? order.total) * 100);
  const currency = payment?.currency || event?.payload?.order?.entity?.currency || 'INR';
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    if (amount !== expectedAmount || currency !== 'INR' || (payment?.status && payment.status !== 'captured')) { res.status(400).json({ error: 'Payment amount or currency does not match this CAMPORA order.' }); return; }
    if (order.paymentStatus !== 'paid') {
      const now = new Date().toISOString();
      const updatedTimeline = order.timeline.map((step) => {
        if (step.id === 't3' || step.title.toLowerCase().includes('payment')) return { ...step, title: 'Payment Confirmed', description: `₹${(order.finalPrice ?? order.total)} captured securely via Razorpay.`, status: 'completed' as const, timestamp: now };
        if (step.id === 't4' || step.title.toLowerCase().includes('progress')) return { ...step, status: 'current' as const };
        return step;
      });
      const updatedOrder: CamporaOrder = { ...order, paymentStatus: 'paid', status: 'in_progress', progressPercent: Math.max(order.progressPercent, 50), paymentGateway: { ...gateway, status: 'captured', paymentId: payment?.id, paidAt: now, webhookEventIds: [...(gateway.webhookEventIds || []), ...(eventId ? [eventId] : [])].slice(-50) }, timeline: updatedTimeline, updatedAt: now };
      ordersStore[orderIndex] = updatedOrder;
      try { await persistState(); } catch (error) { ordersStore[orderIndex] = order; throw error; }
    }
  } else if (event.event === 'payment.failed' && order.paymentStatus !== 'paid') {
    ordersStore[orderIndex] = { ...order, paymentGateway: { ...gateway, status: 'failed', paymentId: payment?.id, webhookEventIds: [...(gateway.webhookEventIds || []), ...(eventId ? [eventId] : [])].slice(-50) }, updatedAt: new Date().toISOString() };
    try { await persistState(); } catch (error) { ordersStore[orderIndex] = order; throw error; }
  }
  res.status(200).json({ received: true });
});

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

// JSON embedded in an HTML script element must escape HTML-significant characters;
// otherwise a provider-controlled profile name or OAuth error could terminate the script.
function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
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
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${serializeForInlineScript(errorDesc)} }, window.location.origin);
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

    if (!profileResponse.ok) {
      throw new Error('Google could not verify this account. Please try again.');
    }
    const profile = await profileResponse.json();
    if (typeof profile.email !== 'string' || profile.email_verified !== true) {
      throw new Error('Google sign-in requires a verified email address.');
    }

    const email = profile.email.toLowerCase().trim();
    let user = usersStore.find((u) => u.email.toLowerCase() === email);

    // Never silently link a Google identity to a password or other-provider account.
    // A same-email account may have been registered before its owner proved email control.
    if (user && (user.authProvider !== 'google' || user.passwordHash || user.role !== 'customer')) {
      throw new Error('A CAMPORA account already exists with this email using another sign-in method. Please use that sign-in method. Automatic account linking is disabled for security.');
    }

    if (!user) {
      const newCustomer: StoredUser = {
        id: `cust-${Date.now()}`,
        name: profile.name || email.split('@')[0],
        email,
        avatar: profile.picture,
        role: 'customer',
        authProvider: 'google',
        emailVerified: true,
        createdAt: new Date().toISOString().split('T')[0],
      };
      usersStore.push(newCustomer);
      user = newCustomer;
    } else {
      if (profile.picture) user.avatar = profile.picture;
      if (profile.name && (!user.name || user.name === email.split('@')[0])) {
        user.name = profile.name;
      }
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
            const authPayload = ${serializeForInlineScript({ type: 'OAUTH_AUTH_SUCCESS', user: customerPayload })};
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
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${serializeForInlineScript(err.message || 'Google OAuth verification failed.')} }, window.location.origin);
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
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${serializeForInlineScript(errorDesc)} }, window.location.origin);
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

    if (!profileResponse.ok) {
      throw new Error('Microsoft could not verify this account. Please try again.');
    }
    const profile = await profileResponse.json();
    // UPN can be a sign-in name rather than a verified mailbox; do not use it as an email fallback.
    const email = typeof profile.mail === 'string' ? profile.mail.toLowerCase().trim() : '';
    if (!email) {
      throw new Error('Microsoft sign-in requires a mailbox email address. This account did not provide one.');
    }

    let user = usersStore.find((u) => u.email.toLowerCase() === email);

    // Never silently link identities from different providers or password accounts.
    if (user && (user.authProvider !== 'microsoft' || user.passwordHash || user.role !== 'customer')) {
      throw new Error('A CAMPORA account already exists with this email using another sign-in method. Please use that sign-in method. Automatic account linking is disabled for security.');
    }

    if (!user) {
      const newCustomer: StoredUser = {
        id: `cust-${Date.now()}`,
        name: profile.displayName || email.split('@')[0],
        email,
        role: 'customer',
        authProvider: 'microsoft',
        emailVerified: true,
        createdAt: new Date().toISOString().split('T')[0],
      };
      usersStore.push(newCustomer);
      user = newCustomer;
    } else if (profile.displayName && (!user.name || user.name === email.split('@')[0])) {
      user.name = profile.displayName;
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
            const authPayload = ${serializeForInlineScript({ type: 'OAUTH_AUTH_SUCCESS', user: customerPayload })};
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
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${serializeForInlineScript(err.message || 'Microsoft OAuth verification failed.')} }, window.location.origin);
              setTimeout(() => { window.close(); }, 2500);
            }
          </script>
        </body>
      </html>
    `);
  }
});

// Admin Login (Strictly separate from Customer Google Auth)
app.post('/api/auth/admin/login', adminLoginLimiter, async (req: Request, res: Response) => {
  const { username, password } = req.body || {};

  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  // Server-side validation against protected credentials, compared in constant time.
  const digest = (value: string) => createHash('sha256').update(value).digest();
  const usernameMatches = timingSafeEqual(digest(username.trim()), digest(ADMIN_USERNAME));
  const passwordMatches = timingSafeEqual(digest(password.trim()), digest(ADMIN_PASSWORD));
  if (usernameMatches && passwordMatches) {
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
    // Separate path-scoped cookie prevents customer sign-in in another tab
    // from replacing the administrator credential used by /api/admin routes.
    res.cookie('campora_admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/admin',
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
app.post('/api/auth/customer/login', customerLoginLimiter, async (req: Request, res: Response) => {
  const { email, password, name, whatsapp, college } = req.body;

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    res.status(400).json({ error: 'A valid email and password are required.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must contain at least 8 characters.' });
    return;
  }
  // bcrypt only uses the first 72 bytes, and hashing huge inputs wastes CPU.
  if (password.length > 128 || email.length > 254) {
    res.status(400).json({ error: 'Email or password is too long.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  let user = usersStore.find((u) => u.email.toLowerCase() === normalizedEmail);
  let verificationToken: string | undefined;

  if (!user) {
    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Name is required when creating a customer account.' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    // Another request may have registered this email while the hash was computing.
    if (usersStore.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      return;
    }
    const newCustomer: StoredUser = {
      id: `cust-${randomBytes(8).toString('hex')}`,
      name: name.trim().slice(0, 100),
      email: normalizedEmail,
      passwordHash,
      role: 'customer',
      whatsapp: whatsapp?.trim() || '',
      college: college?.trim() || '',
      authProvider: 'email',
      createdAt: new Date().toISOString(),
      emailVerified: !EMAIL_VERIFICATION_ENABLED,
    };
    if (EMAIL_VERIFICATION_ENABLED) {
      verificationToken = randomBytes(32).toString('hex');
      newCustomer.emailVerificationTokenHash = createHash('sha256').update(verificationToken).digest('hex');
      newCustomer.emailVerificationExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
    }
    usersStore.push(newCustomer);
    user = newCustomer;
  } else {
    if (!user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    // Existing accounts without this field remain verified; only new registrations require verification.
    if (EMAIL_VERIFICATION_ENABLED && user.emailVerified === false) {
      verificationToken = randomBytes(32).toString('hex');
      user.emailVerificationTokenHash = createHash('sha256').update(verificationToken).digest('hex');
      user.emailVerificationExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
    }
    if (name && !user.name) user.name = name.trim();
    if (whatsapp && !user.whatsapp) user.whatsapp = whatsapp.trim();
    if (college && !user.college) user.college = college.trim();
  }

  await persistState();

  if (EMAIL_VERIFICATION_ENABLED && user.emailVerified === false) {
    const sent = verificationToken ? await sendVerificationEmail(user.email, user.name, verificationToken) : false;
    res.status(sent ? 200 : 503).json({ success: sent, verificationRequired: true, error: sent ? undefined : 'Your account is saved, but the verification email could not be sent. Please try signing in again later or contact support.' });
    return;
  }

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
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    user: customerPayload,
  });
});


const APP_PUBLIC_URL = (process.env.APP_URL || 'https://campora-website.vercel.app').replace(/\/$/, '');
const hashOneTimeToken = (token: string) => createHash('sha256').update(token).digest('hex');

app.get('/api/auth/customer/verify-email', async (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!/^[a-f0-9]{64}$/.test(token)) { res.status(400).send('<h2>Invalid verification link</h2>'); return; }
  const user = usersStore.find((item) => item.emailVerificationTokenHash === hashOneTimeToken(token)
    && typeof item.emailVerificationExpiresAt === 'number' && item.emailVerificationExpiresAt > Date.now());
  if (!user) {
    res.status(400).send('<!doctype html><html><body style="font-family:Arial;background:#0b0b0b;color:white;padding:48px;text-align:center"><h2>This verification link has expired</h2><p>Sign in to CAMPORA to request a fresh link.</p><a style="color:#d4a72c" href="' + APP_PUBLIC_URL + '">Open CAMPORA</a></body></html>');
    return;
  }
  user.emailVerified = true;
  delete user.emailVerificationTokenHash;
  delete user.emailVerificationExpiresAt;
  await persistState();
  res.send('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:Arial;background:#0b0b0b;color:white;padding:48px 20px;text-align:center"><div style="max-width:460px;margin:8vh auto;background:#171717;border:1px solid #d4a72c;border-radius:18px;padding:36px"><h1 style="color:#d4a72c">Email verified</h1><p>Your CAMPORA account is now active. You can sign in securely.</p><a style="display:inline-block;background:#d4a72c;color:#111;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold" href="' + APP_PUBLIC_URL + '">Continue to CAMPORA</a></div></body></html>');
});

app.post('/api/auth/customer/password-reset/request', emailActionLimiter, async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  let emailDeliveryAvailable = EMAIL_VERIFICATION_ENABLED;
  if (emailDeliveryAvailable && email.length <= 254 && email.includes('@')) {
    const user = usersStore.find((item) => item.email.toLowerCase() === email && Boolean(item.passwordHash) && item.role === 'customer');
    if (user) {
      const token = randomBytes(32).toString('hex');
      user.passwordResetTokenHash = hashOneTimeToken(token);
      user.passwordResetExpiresAt = Date.now() + 30 * 60 * 1000;
      await persistState();
      emailDeliveryAvailable = await sendPasswordResetEmail(user.email, user.name, token);
      if (!emailDeliveryAvailable) {
        delete user.passwordResetTokenHash;
        delete user.passwordResetExpiresAt;
        await persistState();
      }
    }
  }
  // Keep the response generic to avoid revealing whether an account exists.
  res.json({
    success: true,
    emailDeliveryAvailable,
    message: 'If an account with that email exists, a password reset link will be sent when email recovery is available.',
  });
});

app.get('/api/auth/customer/reset-password-page', (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!/^[a-f0-9]{64}$/.test(token)) { res.status(400).send('<h2>Invalid reset link</h2>'); return; }
  res.setHeader('Cache-Control', 'no-store');
  res.send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset CAMPORA password</title></head><body style="margin:0;background:#0b0b0b;color:#fff;font-family:Arial;padding:32px 16px"><main style="max-width:440px;margin:8vh auto;background:#171717;border:1px solid #d4a72c;border-radius:18px;padding:30px"><div style="color:#d4a72c;font-weight:bold;letter-spacing:4px">CAMPORA</div><h1>Set a new password</h1><p style="color:#a1a1aa">Choose a strong password with at least 8 characters.</p><form id="reset"><input id="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required placeholder="New password" style="box-sizing:border-box;width:100%;padding:13px;border-radius:8px;background:#0b0b0b;border:1px solid #444;color:white;margin:10px 0"><input id="confirm" type="password" minlength="8" maxlength="128" autocomplete="new-password" required placeholder="Confirm password" style="box-sizing:border-box;width:100%;padding:13px;border-radius:8px;background:#0b0b0b;border:1px solid #444;color:white;margin:10px 0"><button style="width:100%;padding:13px;background:#d4a72c;border:0;border-radius:8px;font-weight:bold;margin-top:10px">Update password</button></form><p id="message" role="status" style="color:#d4d4d8"></p></main><script>document.getElementById('reset').addEventListener('submit',async function(e){e.preventDefault();const p=document.getElementById('password').value;const c=document.getElementById('confirm').value;const m=document.getElementById('message');if(p!==c){m.textContent='Passwords do not match.';return;}const r=await fetch('/api/auth/customer/password-reset/complete',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({token:${JSON.stringify(token)},password:p})});const d=await r.json().catch(()=>({}));m.textContent=r.ok?'Password updated. You can now sign in to CAMPORA.':(d.error||'This reset link is invalid or expired.');document.getElementById('reset').style.display=r.ok?'none':'block';});</script></body></html>`);
});

app.post('/api/auth/customer/password-reset/complete', emailActionLimiter, async (req: Request, res: Response) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!/^[a-f0-9]{64}$/.test(token) || password.length < 8 || password.length > 128) {
    res.status(400).json({ error: 'Provide a valid reset link and a password between 8 and 128 characters.' });
    return;
  }
  const user = usersStore.find((item) => item.passwordResetTokenHash === hashOneTimeToken(token)
    && typeof item.passwordResetExpiresAt === 'number' && item.passwordResetExpiresAt > Date.now());
  if (!user) { res.status(400).json({ error: 'This password reset link is invalid or expired. Please request another one.' }); return; }
  user.passwordHash = await bcrypt.hash(password, 12);
  user.emailVerified = true;
  delete user.passwordResetTokenHash;
  delete user.passwordResetExpiresAt;
  delete user.emailVerificationTokenHash;
  delete user.emailVerificationExpiresAt;
  await persistState();
  res.json({ success: true });
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
  res.clearCookie('campora_admin_session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/admin',
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

// ==========================================
// CUSTOMER-FACING ORDER & ACCOUNT ROUTES
// ==========================================

// Get authenticated customer's own orders ONLY
app.get('/api/customer/orders', requireAuth, async (req: RequestWithUser, res: Response) => {
  const user = req.user!;

  // Filter exclusively for this customer and mint short-lived URLs for private files.
  const userOrders = await Promise.all(ordersStore
    .filter((o) => o.customerId === user.id)
    .map(async (order) => {
      const hydrated = await hydrateOrderForResponse(order);
      return toCustomerSafeOrder(hydrated);
    }));

  res.json({ orders: userOrders });
});

// Customer notification inbox: derive events from owned orders and persist read receipts
// on the existing customer record. Never accept arbitrary order IDs from the client.
const CUSTOMER_NOTIFICATION_ACTIONS: Record<string, string> = {
  approved: 'Requirements approved',
  rejected: 'Order rejected',
  cancelled: 'Order cancelled',
  in_progress: 'Work started',
  review: 'Work in review',
  completed: 'Work completed',
  payment_verified: 'Payment verified',
  payment_rejected: 'Payment needs attention',
  payment_proof_submitted: 'Payment proof received',
  customer_cancelled_refund_requested: 'Refund requested',
  customer_cancelled: 'Order cancelled',
};
function getCustomerNotifications(customerId: string) {
  return ordersStore.filter(order => order.customerId === customerId).flatMap(order => {
    const events = (order.activityHistory || [])
      .filter(event => Boolean(CUSTOMER_NOTIFICATION_ACTIONS[event.action]))
      .map(event => ({
        id: `${order.id}:${event.id}`,
        orderId: order.id,
        title: CUSTOMER_NOTIFICATION_ACTIONS[event.action],
        message: event.description.slice(0, 500),
        timestamp: event.timestamp,
      }));
    // Every order has a stable initial notification, including legacy orders.
    events.push({
      id: `${order.id}:created`,
      orderId: order.id,
      title: 'Order placed',
      message: 'Your order has been received by CAMPORA.',
      timestamp: order.createdAt,
    });
    // Some older orders have no activity history for completion.
    if (order.status === 'completed' && !events.some(event => event.title === 'Work completed')) {
      events.push({
        id: `${order.id}:delivered`,
        orderId: order.id,
        title: 'Work completed',
        message: 'Your order is completed. Downloads are available after payment verification.',
        timestamp: order.updatedAt,
      });
    }
    return events;
  }).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 100);
}
app.get('/api/customer/notifications', requireAuth, (req: RequestWithUser, res: Response) => {
  if (req.user?.role !== 'customer') return res.status(403).json({ error: 'Customer account required.' });
  const user = usersStore.find(u => u.id === req.user!.id);
  if (!user) return res.status(401).json({ error: 'Account not found.' });
  const readIds = new Set(user.notificationReadIds || []);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ notifications: getCustomerNotifications(user.id).map(n => ({ ...n, read: readIds.has(n.id) })) });
});
app.post('/api/customer/notifications/read', requireAuth, async (req: RequestWithUser, res: Response) => {
  if (req.user?.role !== 'customer') return res.status(403).json({ error: 'Customer account required.' });
  const user = usersStore.find(u => u.id === req.user!.id);
  if (!user) return res.status(401).json({ error: 'Account not found.' });
  const validIds = new Set(getCustomerNotifications(user.id).map(n => n.id));
  const submitted = req.body?.ids;
  if (!Array.isArray(submitted) || submitted.length > 100 || submitted.some(id => typeof id !== 'string')) {
    return res.status(400).json({ error: 'Invalid notification selection.' });
  }
  const oldIds = user.notificationReadIds || [];
  user.notificationReadIds = [...new Set([...oldIds, ...submitted.filter(id => validIds.has(id))])].slice(-500);
  try {
    await persistState();
  } catch (error) {
    user.notificationReadIds = oldIds;
    throw error;
  }
  res.json({ success: true });
});

// Razorpay capability is intentionally disabled until explicitly enabled in Render.
app.get('/api/payments/razorpay/config', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ enabled: RAZORPAY_ENABLED, keyId: RAZORPAY_ENABLED ? RAZORPAY_KEY_ID : null, currency: 'INR' });
});

const razorpayPaymentLimiter = createRateLimiter({ name: 'razorpay-order-create', windowMs: 60 * 60 * 1000, max: 10, key: (req, ip) => `${req.user?.id || ip}:${req.params.id || 'unknown'}`, message: 'Too many payment attempts for this order. Please try again later.' });

app.post('/api/customer/orders/:id/razorpay/order', razorpayPaymentLimiter, requireAuth, async (req: RequestWithUser, res: Response) => {
  if (!RAZORPAY_ENABLED || !RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) { res.status(503).json({ error: 'Online payments are not enabled yet.' }); return; }
  const orderIndex = ordersStore.findIndex((order) => order.id.toLowerCase() === req.params.id.toLowerCase());
  if (orderIndex === -1) { res.status(404).json({ error: 'Order not found.' }); return; }
  const order = ordersStore[orderIndex];
  if (req.user!.role !== 'customer' || order.customerId !== req.user!.id) { res.status(403).json({ error: 'You cannot pay for this order.' }); return; }
  if (order.paymentStatus === 'paid' || order.paymentStatus === 'verification_pending' || ['cancelled', 'rejected', 'completed'].includes(order.status) || order.paymentStatus === 'awaiting_quote' || order.status === 'requirements_review') { res.status(409).json({ error: 'This order is not currently eligible for payment.' }); return; }
  if (order.status !== 'approved' && order.status !== 'payment_pending' && order.quoteStatus !== 'accepted') { res.status(409).json({ error: 'Your order must be approved and priced before payment.' }); return; }
  const payableRupees = order.finalPrice ?? order.total; const payablePaise = Math.round(payableRupees * 100);
  if (!Number.isSafeInteger(payablePaise) || payablePaise <= 0) { res.status(400).json({ error: 'The payable amount is invalid.' }); return; }
  if (order.paymentGateway?.provider === 'razorpay' && order.paymentGateway.status !== 'captured' && order.paymentGateway.amount === payablePaise) {
    res.json({ keyId: RAZORPAY_KEY_ID, orderId: order.paymentGateway.orderId, amount: payablePaise, currency: 'INR', camporaOrderId: order.id }); return;
  }
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  const gatewayResponse = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: payablePaise, currency: 'INR', receipt: `${order.id}-${randomBytes(4).toString('hex')}`.slice(0, 40), notes: { campora_order_id: order.id, customer_id: order.customerId } }) });
  const gatewayData: any = await gatewayResponse.json().catch(() => ({}));
  if (!gatewayResponse.ok || !gatewayData.id) { console.error('Razorpay order creation failed:', gatewayData.error?.code || gatewayResponse.status); res.status(502).json({ error: 'Unable to start secure checkout. Please try again.' }); return; }
  const updatedOrder: CamporaOrder = { ...order, paymentGateway: { provider: 'razorpay', orderId: gatewayData.id, status: 'created', amount: gatewayData.amount, currency: 'INR', createdAt: new Date().toISOString() }, updatedAt: new Date().toISOString() };
  ordersStore[orderIndex] = updatedOrder;
  try { await persistState(); } catch (error) { ordersStore[orderIndex] = order; throw error; }
  res.json({ keyId: RAZORPAY_KEY_ID, orderId: gatewayData.id, amount: gatewayData.amount, currency: 'INR', camporaOrderId: order.id });
});

app.post('/api/customer/orders/:id/razorpay/verify', requireAuth, async (req: RequestWithUser, res: Response) => {
  if (!RAZORPAY_ENABLED || !RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) { res.status(503).json({ error: 'Online payments are not enabled.' }); return; }
  const orderIndex = ordersStore.findIndex((order) => order.id.toLowerCase() === req.params.id.toLowerCase());
  if (orderIndex === -1) { res.status(404).json({ error: 'Order not found.' }); return; }
  const order = ordersStore[orderIndex];
  if (req.user!.role !== 'customer' || order.customerId !== req.user!.id) { res.status(403).json({ error: 'You cannot verify payment for this order.' }); return; }
  const { razorpay_payment_id: paymentId, razorpay_order_id: gatewayOrderId, razorpay_signature: signature } = req.body || {};
  if (!paymentId || !gatewayOrderId || !signature || order.paymentGateway?.provider !== 'razorpay' || order.paymentGateway.orderId !== gatewayOrderId) { res.status(400).json({ error: 'Payment response does not match this order.' }); return; }
  const expectedSignature = createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${gatewayOrderId}|${paymentId}`).digest('hex');
  const supplied = Buffer.from(String(signature), 'utf8'); const expected = Buffer.from(expectedSignature, 'utf8');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) { res.status(400).json({ error: 'Payment signature verification failed.' }); return; }
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(String(paymentId))}`, { headers: { Authorization: `Basic ${auth}` } });
  const payment: any = await paymentResponse.json().catch(() => ({}));
  if (!paymentResponse.ok || payment.order_id !== gatewayOrderId || payment.amount !== order.paymentGateway.amount || payment.currency !== 'INR') { res.status(400).json({ error: 'Gateway payment details could not be verified against this order.' }); return; }
  if (payment.status !== 'captured') { res.status(202).json({ success: false, pending: true, message: 'Payment is awaiting capture confirmation. Your order will update automatically once confirmed.' }); return; }
  if (order.paymentStatus !== 'paid') {
    const now = new Date().toISOString();
    const updatedTimeline = order.timeline.map((step) => {
      if (step.id === 't3' || step.title.toLowerCase().includes('payment')) return { ...step, title: 'Payment Confirmed', description: `₹${(order.finalPrice ?? order.total)} captured securely via Razorpay.`, status: 'completed' as const, timestamp: now };
      if (step.id === 't4' || step.title.toLowerCase().includes('progress')) return { ...step, status: 'current' as const };
      return step;
    });
    const updatedOrder: CamporaOrder = { ...order, paymentStatus: 'paid', status: 'in_progress', progressPercent: Math.max(order.progressPercent, 50), paymentGateway: { ...order.paymentGateway, status: 'captured', paymentId, paidAt: now }, timeline: updatedTimeline, updatedAt: now };
    ordersStore[orderIndex] = updatedOrder;
    try { await persistState(); } catch (error) { ordersStore[orderIndex] = order; throw error; }
  }
  res.json({ success: true, message: 'Payment captured and verified.', order: await hydrateOrderForResponse(ordersStore[orderIndex]) });
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

  const hydratedOrder = await hydrateOrderForResponse(order);
  res.json({ order: user.role === 'admin' ? hydratedOrder : toCustomerSafeOrder(hydratedOrder) });
});

// Authenticated download proxy: renews a short-lived private Storage URL on every click.
app.get('/api/customer/orders/:id/files/:fileId/download', requireAuth, async (req: RequestWithUser, res: Response) => {
  const order = ordersStore.find((item) => item.id.toLowerCase() === req.params.id.toLowerCase());
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (req.user!.role !== 'admin' && (req.user!.role !== 'customer' || order.customerId !== req.user!.id)) {
    return res.status(403).json({ error: 'You cannot download files from this order.' });
  }
  const fileId = req.params.fileId;
  const attachment = [
    ...(order.collegeTemplateFile ? [order.collegeTemplateFile] : []),
    ...(order.referenceFiles || []),
    ...(order.deliverables || []),
  ].find((file) => file.id === fileId);
  if (!attachment?.storagePath) return res.status(404).json({ error: 'File not found.' });
  if (req.user!.role !== 'admin' && attachment === (order.deliverables || []).find((file) => file.id === fileId)
    && (order.paymentStatus !== 'paid' || order.status !== 'completed')) {
    return res.status(403).json({ error: 'Completed files are available after payment verification and order completion.' });
  }
  const signedUrl = await createPrivateFileUrl(attachment.storagePath, true);
  if (!signedUrl) return res.status(503).json({ error: 'Secure download is temporarily unavailable. Please try again.' });
  return res.redirect(302, signedUrl);
});

// Create customer order. Price, discount and eligibility are always calculated server-side.
app.post('/api/customer/orders', orderCreationLimiter, requireAuth, express.json({ limit: '12mb' }), async (req: RequestWithUser, res: Response) => {
  const user = req.user!;
  if (user.role !== 'customer') {
    res.status(403).json({ error: 'Only customer accounts can place orders.' });
    return;
  }

  const data = req.body || {};
  const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
  if (!isText(data.customerName) || !isText(data.whatsappNumber) || !isText(data.topic) || !data.serviceId) {
    res.status(400).json({ error: 'Please complete your name, WhatsApp number, service and topic.' });
    return;
  }
  if (data.customerName.length > 100 || data.whatsappNumber.length > 30 || data.topic.length > 300
    || (data.college !== undefined && (typeof data.college !== 'string' || data.college.length > 200))) {
    res.status(400).json({ error: 'One of the fields is too long or invalid. Please shorten it and try again.' });
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
    || Boolean(service.maxIncludedPages && pagesOrSlides > service.maxIncludedPages);

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
  const orderId = generateOrderId();
  const collegeTemplateFile = data.hasCollegeTemplate ? sanitizeAttachment(data.collegeTemplateFile) : undefined;
  const referenceFiles = (Array.isArray(data.referenceFiles) ? data.referenceFiles : [])
    .slice(0, 10)
    .map(sanitizeAttachment)
    .filter((file): file is OrderAttachment => Boolean(file));

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
    collegeTemplateFile,
    templateInstructions: typeof data.templateInstructions === 'string' ? data.templateInstructions.slice(0, 5000) : undefined,
    referenceFiles,
    subtotal,
    finalPrice: total,
    discount,
    discountEligible: !isPackage && !requiresReview,
    couponCode,
    total,
    quoteStatus: requiresReview ? 'pending' : 'not_required',
    paymentStatus: requiresReview ? 'awaiting_quote' : 'pending',
    paymentProofStatus: 'not_submitted',
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

  const uploadFiles = Array.isArray(data.uploadFiles) ? data.uploadFiles : [];
  if (uploadFiles.length > 11) {
    res.status(400).json({ error: 'You can upload one template and up to 10 reference files per order.' });
    return;
  }

  const uploadedPaths: string[] = [];
  let totalUploadBytes = 0;
  let insertedOrder = false;
  try {
    const seenFileIds = new Set<string>();
    for (const upload of uploadFiles) {
      if (!upload || typeof upload.fileId !== 'string' || typeof upload.category !== 'string') {
        throw new Error('An attachment is missing required information.');
      }
      if (seenFileIds.has(upload.fileId)) throw new Error('Duplicate attachment selected.');
      seenFileIds.add(upload.fileId);

      const targetAttachment: OrderAttachment | undefined = upload.category === 'college-template'
        ? newOrder.collegeTemplateFile
        : upload.category === 'reference'
          ? newOrder.referenceFiles.find((file) => file.id === upload.fileId)
          : undefined;
      if (!targetAttachment || targetAttachment.id !== upload.fileId) {
        throw new Error('An attachment does not match this order. Please refresh and try again.');
      }

      const parsedFile = parsePrivateUpload(upload.dataUrl, upload.fileName);
      totalUploadBytes += parsedFile.buffer.length;
      if (totalUploadBytes > MAX_ORDER_UPLOAD_BYTES) {
        throw new Error('The total attachment size for one order cannot exceed 8 MB.');
      }

      const storagePath = await uploadPrivateFile(newOrder.id, upload.category, upload.fileName, parsedFile);
      uploadedPaths.push(storagePath);
      targetAttachment.storagePath = storagePath;
      targetAttachment.type = parsedFile.mimeType;
      targetAttachment.size = `${(parsedFile.buffer.length / (1024 * 1024)).toFixed(2)} MB`;
      targetAttachment.uploadedAt = now;
    }

    ordersStore.unshift(newOrder);
    insertedOrder = true;
    await persistState();
    void sendOrderConfirmationEmail(newOrder.customerEmail, newOrder.customerName, newOrder.id, newOrder.serviceName);
    const responseOrder = await hydrateOrderForResponse(newOrder);
    res.status(201).json({ success: true, order: responseOrder });
  } catch (error) {
    if (insertedOrder && ordersStore[0]?.id === newOrder.id) ordersStore.shift();
    await removePrivateFiles(uploadedPaths);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'The order could not be saved. Please try again.',
    });
  }
});

// Customers may cancel any active order. Paid or payment-proof-submitted orders create a refund request for admin processing.
app.post('/api/customer/orders/:id/cancel', requireAuth, async (req: RequestWithUser, res: Response) => {
  const user = req.user!;
  const orderIndex = ordersStore.findIndex((o) => o.id.toLowerCase() === req.params.id.toLowerCase());
  if (orderIndex === -1) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const order = ordersStore[orderIndex];
  if (user.role !== 'customer' || order.customerId !== user.id) {
    res.status(403).json({ error: 'You cannot cancel this order.' });
    return;
  }
  if (['cancelled', 'completed', 'rejected'].includes(order.status)) {
    res.status(409).json({ error: 'This order can no longer be cancelled.' });
    return;
  }

  const now = new Date().toISOString();
  const refundRequired = order.paymentStatus === 'paid' || order.paymentStatus === 'verification_pending'
    || Boolean(order.paymentDetails?.utrNumber || order.paymentDetails?.screenshotName);
  const updatedOrder: CamporaOrder = {
    ...order,
    status: 'cancelled',
    ...(refundRequired ? { refundStatus: 'requested' as const, refundRequestedAt: now } : {}),
    activityHistory: [...(order.activityHistory || []), {
      id: `act-${Date.now()}`,
      action: refundRequired ? 'customer_cancelled_refund_requested' : 'customer_cancelled',
      description: refundRequired
        ? 'Customer cancelled the order after submitting payment details or payment; refund requested for admin processing to the original payment source.'
        : 'Customer cancelled the order before payment was submitted; no refund is due.',
      actor: user.name || 'Customer',
      timestamp: now,
    }],
    cancellationReason: 'Customer requested order cancellation.',
    cancelledBy: 'Customer',
    cancelledAt: now,
    updatedAt: now,
  };
  ordersStore[orderIndex] = updatedOrder;
  try {
    await persistState();
  } catch (error) {
    ordersStore[orderIndex] = order;
    throw error;
  }
  res.json({ success: true, order: toCustomerSafeOrder(await hydrateOrderForResponse(updatedOrder)) });
});

// Customer submits mandatory screenshot proof and optional UTR. Submission never marks payment as paid.
app.post('/api/customer/orders/:id/payment', paymentProofLimiter, requireAuth, express.json({ limit: '1mb' }), async (req: RequestWithUser, res: Response) => {
  const user = req.user!;
  const orderIndex = ordersStore.findIndex((o) => o.id.toLowerCase() === req.params.id.toLowerCase());
  if (orderIndex === -1) return res.status(404).json({ error: 'Order not found.' });
  const order = ordersStore[orderIndex];
  if (user.role !== 'customer' || order.customerId !== user.id) return res.status(403).json({ error: 'You cannot submit payment for this order.' });
  if (order.paymentStatus === 'awaiting_quote' || order.status === 'requirements_review' || ['cancelled', 'rejected', 'completed'].includes(order.status)) {
    return res.status(409).json({ error: 'This order is not ready to accept payment.' });
  }
  if (!['pending', 'rejected'].includes(order.paymentStatus)) {
    return res.status(409).json({ error: 'Payment proof has already been submitted or payment is confirmed.' });
  }

  const cleanUtr = typeof req.body?.utrNumber === 'string' ? req.body.utrNumber.trim().replace(/\\s+/g, '') : '';
  if (cleanUtr && !/^[A-Za-z0-9-]{8,32}$/.test(cleanUtr)) {
    return res.status(400).json({ error: 'UTR must be 8–32 letters, numbers or hyphens, or left blank.' });
  }
  const screenshotData = req.body?.screenshotUrl;
  if (typeof screenshotData !== 'string' || !screenshotData.trim()) {
    return res.status(400).json({ error: 'A payment screenshot is required.' });
  }

  let screenshotPath: string;
  let parsedScreenshot: { buffer: Buffer; mimeType: string };
  try {
    parsedScreenshot = parsePrivateUpload(screenshotData, typeof req.body?.screenshotName === 'string' ? req.body.screenshotName : 'Payment_Proof.png');
    if (!['image/png', 'image/jpeg'].includes(parsedScreenshot.mimeType) || parsedScreenshot.buffer.length > 500 * 1024) {
      throw new Error('Payment screenshot must be a PNG or JPG image under 500 KB.');
    }
    screenshotPath = await uploadPrivateFile(order.id, 'payment-proof', typeof req.body?.screenshotName === 'string' ? req.body.screenshotName : 'Payment_Proof.png', parsedScreenshot);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Payment screenshot upload failed.' });
  }

  const now = new Date().toISOString();
  const payableAmount = order.finalPrice ?? order.total;
  const previousScreenshotPath = order.paymentDetails?.screenshotPath;
  const updatedTimeline: TimelineStep[] = (order.timeline || []).map((step) =>
    step.id === 't3' || step.title.toLowerCase().includes('payment')
      ? { ...step, title: 'Payment Verification Pending', description: 'Payment screenshot submitted. CAMPORA is checking the transaction.', status: 'current' as const, timestamp: now }
      : step
  );
  const updatedOrder: CamporaOrder = {
    ...order,
    paymentStatus: 'verification_pending',
    status: order.status,
    paymentProofStatus: 'submitted',
    activityHistory: [...(order.activityHistory || []), { id: `act-${Date.now()}`, action: 'payment_proof_submitted', description: cleanUtr ? 'Payment screenshot and UTR submitted for manual verification.' : 'Payment screenshot submitted; no UTR was provided.', actor: user.name || 'Customer', timestamp: now }],
    paymentDetails: {
      upiId: 'tanmayvbhagat-1@oksbi',
      utrNumber: cleanUtr || undefined,
      screenshotPath,
      screenshotName: typeof req.body?.screenshotName === 'string' ? req.body.screenshotName.slice(0, 180) : 'Payment_Proof.png',
      screenshotSize: `${(parsedScreenshot.buffer.length / 1024).toFixed(1)} KB`,
      submittedAt: now,
      amountPaid: payableAmount,
    },
    timeline: updatedTimeline,
    updatedAt: now,
  };
  ordersStore[orderIndex] = updatedOrder;
  try {
    await persistState();
  } catch {
    ordersStore[orderIndex] = order;
    await removePrivateFiles([screenshotPath]);
    return res.status(500).json({ error: 'Payment proof could not be saved. Please try again.' });
  }
  if (previousScreenshotPath && previousScreenshotPath !== screenshotPath) await removePrivateFiles([previousScreenshotPath]);
  void sendPaymentUpdateEmail(user.email, user.name, updatedOrder.id, 'received');
  const hydrated = await hydrateOrderForResponse(updatedOrder);
  return res.json({ success: true, message: 'Screenshot submitted. Admin verification is pending.', order: toCustomerSafeOrder(hydrated) });
});

// Customer profile & stats

app.get('/api/customer/profile', requireAuth, (req: RequestWithUser, res: Response) => {
  const user = req.user!;
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
    recentOrders: await Promise.all(ordersStore.slice(0, 10).map(hydrateOrderForResponse)),
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

  const hydratedOrders = await Promise.all(filtered.map(hydrateOrderForResponse));
  res.json({ orders: hydratedOrders, total: filtered.length });
});

// Per-order support conversation. Messages are stored with the order and access is role/owner checked.
app.get('/api/customer/orders/:id/messages', requireAuth, (req: RequestWithUser, res: Response) => {
  const order = ordersStore.find(o => o.id.toLowerCase() === req.params.id.toLowerCase());
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (req.user!.role !== 'admin' && (req.user!.role !== 'customer' || order.customerId !== req.user!.id)) {
    return res.status(403).json({ error: 'You cannot view this conversation.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json({ messages: (order as any).supportMessages || [] });
});
app.get('/api/admin/orders/:id/messages', requireAdmin, (req: RequestWithUser, res: Response) => {
  const order = ordersStore.find(o => o.id.toLowerCase() === req.params.id.toLowerCase());
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.setHeader('Cache-Control', 'no-store');
  res.json({ messages: (order as any).supportMessages || [] });
});
app.post('/api/customer/orders/:id/messages', requireAuth, async (req: RequestWithUser, res: Response) => {
  const orderIndex = ordersStore.findIndex(o => o.id.toLowerCase() === req.params.id.toLowerCase());
  if (orderIndex < 0) return res.status(404).json({ error: 'Order not found.' });
  const order = ordersStore[orderIndex];
  if (req.user!.role !== 'customer' || order.customerId !== req.user!.id) return res.status(403).json({ error: 'You cannot message about this order.' });
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message || message.length > 2000) return res.status(400).json({ error: 'Message must be between 1 and 2000 characters.' });
  const updated = { ...(order as any), supportMessages: [...((order as any).supportMessages || []), { id: `msg-${randomBytes(8).toString('hex')}`, senderRole: 'customer', senderName: req.user!.name || 'Customer', message, createdAt: new Date().toISOString() }].slice(-200), updatedAt: new Date().toISOString() };
  ordersStore[orderIndex] = updated;
  try { await persistState(); } catch (error) { ordersStore[orderIndex] = order; throw error; }
  res.status(201).json({ success: true, messages: updated.supportMessages });
});
app.post('/api/admin/orders/:id/messages', requireAdmin, async (req: RequestWithUser, res: Response) => {
  const orderIndex = ordersStore.findIndex(o => o.id.toLowerCase() === req.params.id.toLowerCase());
  if (orderIndex < 0) return res.status(404).json({ error: 'Order not found.' });
  const order = ordersStore[orderIndex];
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message || message.length > 2000) return res.status(400).json({ error: 'Message must be between 1 and 2000 characters.' });
  const updated = { ...(order as any), supportMessages: [...((order as any).supportMessages || []), { id: `msg-${randomBytes(8).toString('hex')}`, senderRole: 'admin', senderName: req.user!.name || 'CAMPORA Support', message, createdAt: new Date().toISOString() }].slice(-200), updatedAt: new Date().toISOString() };
  ordersStore[orderIndex] = updated;
  try { await persistState(); } catch (error) { ordersStore[orderIndex] = order; throw error; }
  res.status(201).json({ success: true, messages: updated.supportMessages });
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
  if (status === 'completed') {
    res.status(409).json({ error: 'An order can only be completed after a deliverable file is successfully uploaded.' });
    return;
  }
  if (['in_progress', 'review'].includes(status) && order.paymentStatus !== 'paid') {
    res.status(409).json({ error: 'Payment must be verified before work can move into progress or review.' });
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
  } else if (status === 'in_progress') {
    updatedTimeline = updatedTimeline.map((step) => {
      if (step.id === 't4' || step.title.toLowerCase().includes('progress')) return { ...step, title: 'Work In Progress', description: 'CAMPORA has started working on your order.', status: 'current' as const, timestamp: now };
      if (step.id === 't3' || step.title.toLowerCase().includes('payment')) return { ...step, status: 'completed' as const };
      return step;
    });
  } else if (status === 'review') {
    updatedTimeline = updatedTimeline.map((step) => {
      if (step.id === 't4' || step.title.toLowerCase().includes('progress')) return { ...step, status: 'completed' as const };
      if (step.id === 't5' || step.title.toLowerCase().includes('delivery')) return { ...step, title: 'Quality Review', description: 'Your work is undergoing final quality checks.', status: 'current' as const, timestamp: now };
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
    activityHistory: [...(order.activityHistory || []), { id: `act-${Date.now()}`, action: status, description: `Order status changed to ${status.replace(/_/g, ' ')}${status === 'rejected' ? `: ${rejectionReason?.trim()}` : status === 'cancelled' ? `: ${cancellationReason?.trim()}` : ''}.`, actor: req.user?.name || 'CAMPORA Admin', timestamp: new Date().toISOString() }],
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
  if (status === 'completed') {
    void sendDeliveryEmail(order.customerEmail, order.customerName, order.id);
  } else if (['approved', 'rejected', 'cancelled', 'in_progress'].includes(status)) {
    void sendOrderStatusEmail(order.customerEmail, order.customerName, order.id, status, status === 'rejected' ? rejectionReason : status === 'cancelled' ? cancellationReason : undefined);
  }
  res.json({ success: true, order: await hydrateOrderForResponse(updatedOrder) });
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
  if (action === 'confirm' && (!['pending', 'verification_pending', 'rejected'].includes(order.paymentStatus) || ['cancelled', 'completed', 'rejected'].includes(order.status))) {
    res.status(409).json({ error: 'This order is not eligible for manual payment confirmation.' });
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
          description: order.paymentDetails?.utrNumber
            ? `₹${payableAmount} manually confirmed by admin (UTR: ${utr}).`
            : order.paymentDetails?.screenshotPath
              ? `₹${payableAmount} manually confirmed by admin after checking the submitted screenshot and bank records.`
              : `₹${payableAmount} manually marked as paid by admin.`,
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
      activityHistory: [...(order.activityHistory || []), { id: `act-${Date.now()}`, action: 'payment_verified', description: order.paymentDetails?.screenshotPath ? `Payment of ₹${payableAmount} manually verified with submitted proof.` : `Admin manually marked ₹${payableAmount} as paid without a submitted screenshot.`, actor: req.user?.name || 'CAMPORA Admin', timestamp: now }],
      paymentStatus: 'paid',
      paymentProofStatus: order.paymentDetails?.screenshotPath ? 'submitted' : 'not_submitted',
      status: order.status,
      progressPercent: order.progressPercent,
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
    void sendPaymentUpdateEmail(order.customerEmail, order.customerName, order.id, 'confirmed');
    res.json({ success: true, message: `Payment verified for ₹${payableAmount}. Order is now in progress.`, order: await hydrateOrderForResponse(updatedOrder) });
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
      activityHistory: [...(order.activityHistory || []), { id: `act-${Date.now()}`, action: 'payment_rejected', description: `Payment proof rejected: ${reason}`, actor: req.user?.name || 'CAMPORA Admin', timestamp: now }],
      paymentStatus: 'rejected',
      paymentProofStatus: 'submitted',
      paymentDetails: {
        ...(order.paymentDetails || { upiId: 'tanmayvbhagat-1@oksbi' }),
        rejectionReason: reason,
      },
      timeline: updatedTimeline,
      updatedAt: 'Just now',
    };

    ordersStore[orderIndex] = updatedOrder;
    await persistState();
    void sendPaymentUpdateEmail(order.customerEmail, order.customerName, order.id, 'rejected');
    res.json({ success: true, message: 'Payment marked as rejected.', order: await hydrateOrderForResponse(updatedOrder) });
    return;
  }

  res.status(400).json({ error: 'Invalid payment verification action.' });
});

// Admin Upload Completed Deliverable
app.post('/api/admin/orders/:id/deliverables', deliverableUploadLimiter, requireAdmin, express.json({ limit: '22mb' }), async (req: RequestWithUser, res: Response) => {
  const orderId = req.params.id;
  const { title, fileName, dataUrl } = req.body || {};

  const orderIndex = ordersStore.findIndex((o) => o.id.toLowerCase() === orderId.toLowerCase());
  if (orderIndex === -1) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  if (typeof fileName !== 'string' || typeof dataUrl !== 'string') {
    res.status(400).json({ error: 'Select the actual deliverable file before uploading.' });
    return;
  }

  const order = ordersStore[orderIndex];
  let parsedFile: { buffer: Buffer; mimeType: string };
  let storagePath: string;
  try {
    parsedFile = parsePrivateUpload(dataUrl, fileName);
    storagePath = await uploadPrivateFile(order.id, 'deliverables', fileName, parsedFile);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Deliverable upload failed.' });
    return;
  }

  const extension = path.extname(fileName).slice(1).toUpperCase();
  const newDeliverable: DeliverableFile = {
    id: `del-${Date.now()}`,
    title: typeof title === 'string' && title.trim() ? title.trim().slice(0, 180) : fileName,
    fileType: extension,
    fileSize: `${(parsedFile.buffer.length / (1024 * 1024)).toFixed(2)} MB`,
    uploadedAt: new Date().toISOString(),
    storagePath,
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
    activityHistory: [...(order.activityHistory || []), { id: `act-${Date.now()}`, action: 'deliverable_uploaded', description: `Completed deliverable uploaded: ${newDeliverable.title}`, actor: req.user?.name || 'CAMPORA Admin', timestamp: new Date().toISOString() }],
    status: ['cancelled', 'rejected'].includes(order.status) ? order.status : 'completed',
    progressPercent: ['cancelled', 'rejected'].includes(order.status) ? order.progressPercent : 100,
    deliverables: updatedDeliverables,
    timeline: updatedTimeline,
    updatedAt: new Date().toISOString(),
  };

  ordersStore[orderIndex] = updatedOrder;
  try {
    await persistState();
  } catch (error) {
    ordersStore[orderIndex] = order;
    await removePrivateFiles([storagePath]);
    res.status(500).json({ error: 'The file was uploaded but the order could not be saved. Please retry.' });
    return;
  }

  if (updatedOrder.paymentStatus === 'paid' && updatedOrder.status === 'completed') {
    void sendDeliveryEmail(updatedOrder.customerEmail, updatedOrder.customerName, updatedOrder.id);
  }
  res.json({
    success: true,
    message: 'Completed deliverable uploaded successfully.',
    order: await hydrateOrderForResponse(updatedOrder),
  });
});

// Admin export of order metadata for an offline backup. Private file bytes remain in Supabase Storage.
app.get('/api/admin/backup', requireAdmin, (_req: RequestWithUser, res: Response) => {
  const backupOrders = ordersStore.map((order) => ({
    ...order,
    collegeTemplateFile: order.collegeTemplateFile ? (({ storagePath, downloadUrl, dataUrl, ...file }) => file)(order.collegeTemplateFile) : undefined,
    referenceFiles: (order.referenceFiles || []).map(({ storagePath, downloadUrl, dataUrl, ...file }) => file),
    paymentDetails: order.paymentDetails ? (({ screenshotPath, screenshotUrl, ...payment }) => payment)(order.paymentDetails) : undefined,
    deliverables: (order.deliverables || []).map(({ storagePath, downloadUrl, ...file }) => file),
  }));
  res.json({ exportedAt: new Date().toISOString(), note: 'Order metadata backup only. Uploaded file binaries remain in private Supabase Storage.', orders: backupOrders });
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

  res.json({ success: true, order: await hydrateOrderForResponse(ordersStore[orderIndex]) });
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
  const responseOrders = await Promise.all(ordersStore.map(hydrateOrderForResponse));

  responseOrders.forEach((ord) => {
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
        downloadUrl: ord.collegeTemplateFile.downloadUrl,
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
          downloadUrl: rf.downloadUrl,
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
  // Unknown API paths must answer with JSON, not the single-page app's HTML.
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found.' });
  });

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

  // Final error handler: log the cause, return a generic message (never internal details).
  app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    console.error('Request failed:', error instanceof Error ? error.message : error);
    if (res.headersSent) {
      next(error);
      return;
    }
    const status = typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : 500;
    res.status(status >= 400 && status < 600 ? status : 500).json({
      error: status === 413 ? 'The request is too large.' : status < 500 ? 'The request could not be processed.' : 'Something went wrong. Please try again.',
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CAMPORA Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
