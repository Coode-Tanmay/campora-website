# CAMPORA

CAMPORA is a customer-facing academic-services ordering portal with a React/Vite frontend, an Express API, Supabase persistence and private file storage.

## Production URLs

- Website: https://campora-website.vercel.app
- API health: https://campora-website.vercel.app/api/health
- Backend service: https://campora-website.onrender.com

## Current architecture

- Frontend: React + Vite, deployed on Vercel.
- Backend: Express + TypeScript, deployed as a single Render web service.
- Database: Supabase. The current application stores customer accounts and orders in the `campora_app_state` JSONB record; legacy customer/order tables remain in place.
- Files: Supabase Storage bucket `campora-private`, configured as private. The API validates supported file types and size limits, stores files server-side, and issues short-lived signed links after authorization.
- Sessions: HTTP-only, secure production cookies with signed JWTs.
- Google sign-in: configured through Google OAuth. OAuth state is signed and checked against an HTTP-only cookie; Google email verification is required.
- Microsoft sign-in: code is present, but the provider is not configured in the current production environment.
- API protection: same-origin checks on mutations, per-route in-memory rate limits, customer-ID order ownership checks, and separate admin authorization.
- CI: npm dependency audit (high/critical threshold), TypeScript check and frontend/backend build.

## Local development

Prerequisites: Node.js 22 LTS and npm.

1. Clone the repository.
2. Copy `.env.example` to `.env`.
3. Fill the required server-side environment values (see below).
4. Run `npm ci`.
5. Run `npm run dev`.

Useful commands:

- `npm run lint` — TypeScript check.
- `npm run build` — build frontend and bundled Express server.
- `npm start` — start the production server after building.

## Server environment variables

Configure these in the server host's secret/environment settings. Never commit real values or put server secrets in Vite client variables.

| Variable | Purpose |
|---|---|
| `APP_URL` | Canonical public origin, exactly `https://campora-website.vercel.app` in current production |
| `ADMIN_USERNAME` | Admin login username |
| `ADMIN_PASSWORD` | Strong, unique admin password |
| `JWT_SECRET` | Random secret with at least 32 characters |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Server-only Supabase secret key; never expose in browser code |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `MICROSOFT_CLIENT_ID` | Optional Microsoft OAuth client ID |
| `MICROSOFT_CLIENT_SECRET` | Optional Microsoft OAuth client secret |
| `GEMINI_API_KEY` | Optional/feature-dependent Gemini API key |
| `RESEND_API_KEY` | Server-only Resend API key for transactional email | 
| `RESEND_FROM_EMAIL` | Optional fallback sender identity on a domain verified in Resend |
| `GMAIL_USER` | Optional Gmail SMTP sender address (for example `camporasupport@gmail.com`) |
| `GMAIL_APP_PASSWORD` | Server-only Google App Password; use a 16-character App Password, never the normal account password |
| `RAZORPAY_ENABLED` | Must remain `false` until the owner explicitly approves activation after testing |
| `RAZORPAY_MODE` | Must explicitly be `test` or `live`; missing/invalid values disable the gateway; set to `live` only after sandbox validation |
| `RAZORPAY_LIVE_APPROVED` | Must remain `false`; required to be explicitly set to `true` before live mode can activate |
| `RAZORPAY_KEY_ID` | Server-side Razorpay key ID (public checkout ID is returned only when enabled) |
| `RAZORPAY_KEY_SECRET` | Server-only Razorpay API secret; never expose to frontend |
| `RAZORPAY_WEBHOOK_SECRET` | Server-only webhook signing secret configured to match Razorpay Dashboard |

Google's authorized redirect URI must be:

`https://campora-website.vercel.app/auth/callback/google`

Microsoft's redirect URI, if enabled later, must be:

`https://campora-website.vercel.app/auth/callback/microsoft`

## Transactional email

- Transactional email prefers Gmail SMTP when `GMAIL_USER` and `GMAIL_APP_PASSWORD` are configured. Resend remains an optional fallback when both `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL` are configured.
- For Gmail, use a Google App Password generated with 2-Step Verification; never use the normal Google account password. Keep it only in the backend host's secret settings.
- New email/password account verification is enabled when either complete sender configuration is present. If Gmail SMTP fails, the mailer attempts the configured Resend fallback.
- Verification links expire after 24 hours; password-reset links expire after 30 minutes. Only hashed one-time tokens are stored.
- Emails include account verification, password reset, order receipt, payment proof/verification, order status and completion notifications.

## File upload rules

- Private bucket: `campora-private`.
- Maximum file size: 5 MB per file.
- Maximum combined customer order attachments: 8 MB.
- Supported extensions include PDF, DOC/DOCX, PPT/PPTX, XLSX, ZIP, TXT, CSV, JPG and PNG, subject to server validation.
- Payment proof is a PNG/JPG screenshot with a 500 KB limit; the UTR/reference is still required.
- Signed download links are temporary. Do not make the bucket public.

## Production operations

- Render service: `campora-website`, one instance, free plan at the time of this update.
- Render **Health Check Path** is configured as `/api/health`. The endpoint checks the Supabase state record and confirms the private Storage bucket is available.
- The free Render plan may spin down when idle, so the first request after inactivity can be slow.
- The current in-memory rate limiter assumes one backend instance. Use a shared limiter store (for example Redis/Render Key Value) before scaling to multiple instances.
- Keep a current backup/export of the Supabase database and test restoration before relying on it operationally.

## Known limitations — pre-launch verification required

The Phase 1 account-recovery and transactional-email code is implemented, but customer email delivery is currently inactive until a permitted sender identity is configured. Resend's shared test sender is not a production sender for arbitrary customers. No custom domain or paid email plan is assumed.

1. Email/password registration and password recovery are implemented. New-account email verification remains disabled while no verified sender is configured; existing accounts remain accessible.
2. Transactional email templates and event hooks are implemented for order receipt, payment proof/verification, order status and delivery. Actual delivery must be tested after a sender is configured.
3. Microsoft OAuth is not configured in production; Google OAuth is configured.
4. Razorpay Standard Checkout remains behind `RAZORPAY_ENABLED=false` by default. It cannot accept payments until the owner completes merchant onboarding, configures credentials and webhook secret, validates test mode, and explicitly approves live activation. The existing UPI/manual verification path remains available.
5. The primary app state is a single JSONB document and in-process cache. This is a transitional architecture, not a high-concurrency multi-instance data model. Migrate to normalized transactional tables and shared concurrency control before scaling.
6. File upload/download flows, admin workflows, and payment transitions still require controlled end-to-end tests using dedicated test accounts and test orders. Do not use real customer orders as test fixtures.
7. The Render health-check path is configured as `/api/health`; it has returned healthy status previously. Continue monitoring health checks and deployment status.

## Data safety

Do not reset, truncate, or reseed production tables to test the application. Use dedicated test accounts and test orders, and remove test records only after confirming they are not linked to real customer activity. Never share environment secrets, OAuth client secrets, JWT secrets, customer passwords, payment screenshots, or private signed URLs.

## Razorpay integration (not activated)

- Server-side Razorpay Orders API creates a gateway order using the approved CAMPORA payable amount; the browser never supplies the payable amount.
- Checkout signature is verified server-side and payment details are fetched from Razorpay. CAMPORA marks an order paid only after the gateway reports the payment as captured.
- Configure Razorpay payment capture to **auto-capture** in the merchant dashboard. CAMPORA intentionally does not treat an `authorized` payment as paid; only captured payments qualify.
- Webhooks use the raw request body and `x-razorpay-signature` HMAC verification. Supported events are `payment.captured`, `order.paid` and `payment.failed`.
- Customer ownership checks, amount/currency matching, duplicate webhook event handling and payment-attempt rate limiting are applied.
- The feature flag defaults off. `RAZORPAY_MODE` must explicitly be `test` or `live` and the key ID prefix must match that mode; missing/invalid values disable the gateway. Live mode additionally requires `RAZORPAY_LIVE_APPROVED=true`. Do not add live credentials or enable the feature until sandbox tests pass and the owner explicitly approves live activation.
- Webhook URL to configure after merchant setup: `https://campora-website.vercel.app/api/payments/razorpay/webhook`.
