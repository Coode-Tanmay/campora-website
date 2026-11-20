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

Google's authorized redirect URI must be:

`https://campora-website.vercel.app/auth/callback/google`

Microsoft's redirect URI, if enabled later, must be:

`https://campora-website.vercel.app/auth/callback/microsoft`

## File upload rules

- Private bucket: `campora-private`.
- Maximum file size: 5 MB per file.
- Maximum combined customer order attachments: 8 MB.
- Supported extensions include PDF, DOC/DOCX, PPT/PPTX, XLSX, ZIP, TXT, CSV, JPG and PNG, subject to server validation.
- Payment proof is a PNG/JPG screenshot with a 500 KB limit; the UTR/reference is still required.
- Signed download links are temporary. Do not make the bucket public.

## Production operations

- Render service: `campora-website`, one instance, free plan at the time of this update.
- Set the Render **Health Check Path** to `/api/health` in the service's Settings page. The endpoint checks the Supabase state record and confirms the private Storage bucket is available.
- The free Render plan may spin down when idle, so the first request after inactivity can be slow.
- The current in-memory rate limiter assumes one backend instance. Use a shared limiter store (for example Redis/Render Key Value) before scaling to multiple instances.
- Keep a current backup/export of the Supabase database and test restoration before relying on it operationally.

## Known limitations — not yet fully production-ready

These items need explicit product/operations decisions and end-to-end verification before CAMPORA should be treated as a mature commercial production system:

1. Customer email/password registration currently creates accounts without an email-verification workflow. Password reset/recovery is not implemented.
2. Order notifications and transactional email are not wired to an email delivery provider.
3. Microsoft OAuth is not configured in production.
4. Payment is UPI/manual verification. The system records a UTR and optional screenshot; an administrator must independently verify the transaction. It is not an automated payment gateway.
5. The primary app state is a single JSONB document and in-process cache. This is a transitional architecture, not a high-concurrency multi-instance data model. Migrate to normalized transactional tables and shared concurrency control before scaling.
6. File upload/download flows, admin workflows, and payment transitions still require controlled end-to-end tests using dedicated test accounts and test orders. Do not use real customer orders as test fixtures.
7. Configure the Render health-check path as described above; the endpoint is deployed and has returned healthy status, but the Render service setting has not yet been configured.

## Data safety

Do not reset, truncate, or reseed production tables to test the application. Use dedicated test accounts and test orders, and remove test records only after confirming they are not linked to real customer activity. Never share environment secrets, OAuth client secrets, JWT secrets, customer passwords, payment screenshots, or private signed URLs.
