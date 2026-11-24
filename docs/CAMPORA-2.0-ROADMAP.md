# CAMPORA 2.0 — Free-first implementation roadmap

This roadmap prioritizes reliability and customer trust before growth features. The default target is ₹0 additional spend; any feature that needs a paid provider, domain, gateway, or subscription stays optional and disabled until explicitly approved.

## Phase 0 — Reliability and launch readiness (current priority)

- [x] Separate administrator session cookie from the customer session cookie.
- [x] Automatically refresh administrator order data without a manual page reload.
- [x] Automatically refresh customer order and deliverable data.
- [x] Refresh admin orders, customers, and file lists quietly in the background.
- [x] Refresh customer order cards quietly without replacing the page with a loading state.
- [ ] Run controlled end-to-end tests with dedicated test accounts and test orders:
  - customer creates order;
  - admin reviews and approves;
  - customer submits UPI proof;
  - admin checks the real bank transaction and verifies/rejects;
  - admin uploads a deliverable;
  - paid customer downloads the deliverable;
  - cancellation/refund request and audit trail.
- [ ] Confirm verified production email delivery, backup restoration, and private file access.
- [ ] Fix any defects found by the controlled test before adding new workflow complexity.

## Phase 1 — Customer experience

1. **Notification center:** persistent in-app notifications for order created, requirements approved, payment proof received, payment verified/rejected, work started, and delivery completed. Notifications must be scoped to the signed-in customer and link to the relevant order.
2. **Order conversation/support:** a per-order message thread between customer and admin, with unread counts and server-side ownership checks.
3. **Better order timeline:** clear timestamps, status explanations, deadline details, and visible next action.
4. **Reviews:** allow one review per completed order; moderate before public display.

## Phase 2 — Admin operations

1. **Analytics dashboard:** counts and revenue calculated from verified orders, date filters, popular services, pending proof, turnaround time, and export.
2. **Audit history:** append-only record of important admin actions (payment confirmation/rejection, status changes, file uploads, cancellations/refunds).
3. **Operational safeguards:** confirmation dialogs, duplicate-action prevention, and clear error states.
4. **Customer support inbox:** filter conversations by unread, order, and customer.

## Phase 3 — Growth features

1. **Portfolio/gallery:** only approved sample work and testimonials, with customer permission.
2. **Referral programme:** unique codes, server-calculated rewards, abuse controls, and an auditable ledger.
3. **Loyalty credits:** only after a transaction ledger and refund/reversal rules are in place.
4. **AI assistant/document checker:** begin with a limited FAQ and file/requirement completeness checks. Use free quotas only where available; never send private customer files to an external AI service without clear consent.

## Phase 4 — Scale and mobile

1. Move the current single JSONB application-state record into normalized relational tables with constraints and transactional updates.
2. Add concurrency-safe operations, durable background jobs, and shared rate limiting before multiple backend instances.
3. Improve accessibility, responsive layouts, SEO metadata, and mobile PWA testing.
4. Consider native mobile apps only after usage justifies their maintenance cost.

## Free-first operating rules

- Keep direct UPI/manual verification; do not enable a paid payment gateway by default.
- Do not make private storage public to simplify downloads.
- Do not promise email, SMS, AI, or push notifications until the provider and delivery path are configured and tested.
- Prefer built-in database queries and existing infrastructure before introducing new paid services.
- Test using dedicated test accounts/orders, never real customer orders.

## Current implementation notes

The first reliability improvements are committed on the `main` branch. Vercel and Render deployment status must be checked before describing those changes as live. The roadmap is a plan, not a claim that every listed feature already exists.
