# CodeXa Agency — Intern ID Card Photo Collection Portal

> **Production Subdomain Application:** `https://id.codxa-agency.online`  
> **Source of Truth:** CodeXa Agency Production Database (Supabase PostgreSQL)  
> **Security Architecture:** 256-bit cryptographically secure one-time invitation tokens, HttpOnly persistent sessions, strict RBAC, and private object storage.

---

## 1. System Overview & Architecture

The **CodeXa Agency Intern ID Card Photo Collection Portal** allows registered CodeXa interns to submit official passport-style identity photographs without logging in, creating passwords, or manually filling forms.

Authorized leadership (**Founder, Co-Founder, CTO, and HR**) manage the collection lifecycle: generating personalized bearer links, dispatching invitations via Resend or WhatsApp, reviewing alignment/lighting, and exporting a structured production ZIP package containing verified photographs, a matching `interns.csv`, and audit documentation for ID card printing.

```
                      CODEXA AGENCY CORE DATABASE
                           (Supabase PostgreSQL)
                                    │
           ┌────────────────────────┴────────────────────────┐
           │                                                 │
   Main Platform                                   ID Card Portal Subdomain
(codxa-agency.online)                            (id.codxa-agency.online)
   • Intern Profiles (50)                           • Secure Bearer Links (256-bit)
   • Leadership Accounts                            • Login-Free Intern Submissions
   • Core Authentication                            • Interactive Passport Cropper
                                                    • Admin Review Gallery
                                                    • Streaming ZIP Export Engine
```

---

## 2. Key Features Implemented

### A. Intern Experience (Login-Free)
- **Zero Credentials Required:** No password, username, email input, or registration needed.
- **Personalized Verification:** Intern opens their secure link (`/upload/<token>`). Server verifies token hash, retrieves current name, Intern ID (e.g. `CXA-INT-2026-001`), and department directly from the database.
- **Interactive Cropper & Preview:** Interactive portrait cropping (3:4 ratio), zoom slider (1.0x to 3.0x), and 90° rotation.
- **Validation:** Client-side & server-side magic byte inspection (JPEG/PNG), 5 MB file size limit, minimum 600×600 resolution check.
- **One-Time Submission:** Once submitted, token is marked as `SUBMITTED`, preventing unauthorized repeats unless explicitly reopened by an admin.

### B. Administrator Center & RBAC
- **Strict Role Enforcement:**
  - Authorized: **Founder** (`OWNER`/`FOUNDER`), **Co-Founder**, **CTO**, **HR**.
  - Denied: CEO, COO, Employees, and Interns are strictly rejected.
- **Password Verification:** Authenticates against existing `User.passwordHash` with `bcryptjs`.
- **Persistent Sessions:** Stored in PostgreSQL `Session` table using SHA-256 token hashes and HttpOnly cookies.

### C. Photo Storage & Naming
- **Private Supabase Bucket:** `id-card-photos` bucket configured with private access controls.
- **Automatic Deterministic Renaming:** Every exported photo is mapped to the intern's official ID: `<INTERN_ID>.jpg` (e.g. `CXA-INT-2026-001.jpg`).
- **Protected Streaming:** Photographs are never publicly exposed; previews stream via authorized server sessions or short-lived signed URLs.

### D. Bulk ZIP Export
- **One-Click Download:** Button `DOWNLOAD ALL APPROVED PHOTOS (ZIP)`.
- **Top-Level Archive Topology:**
  ```
  CodeXa_ID_Card_Photos_Export.zip
  ├── images/
  │   ├── CXA-INT-2026-001.jpg
  │   ├── CXA-INT-2026-002.jpg
  │   └── ...
  ├── interns.csv
  └── README.txt
  ```
- **CSV Standards:** UTF-8 BOM, RFC-4180 escaping, and CSV formula injection mitigations (`=`, `+`, `-`, `@` escaped).
- **README.txt:** Contains dynamic export timestamps, total counts, archive structure, and data handling notices.
- **Selective Batch Export:** Option to download all approved photos or a custom selected subset.

---

## 3. Database Schema Extensions

The application directly connects to the existing CodeXa Agency database. The following backward-compatible tables were added:

1. **`id_card_invitations`**: Stores token SHA-256 hashes, expiration dates, status (`ACTIVE`, `SUBMITTED`, `EXPIRED`, `REVOKED`), dispatch timestamps, and delivery statuses.
2. **`id_card_photo_submissions`**: Backward-compatible extension to store photo records, dimensions, versioning, storage paths, and review decisions.
3. **`id_card_audit_logs`**: Immutable audit logs capturing administrative logins, link generations, reviews, and export events.

---

## 4. Application Routes & APIs

### Frontend Routes
| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Portal overview, photo standards, token direct-access |
| `/upload/[token]` | Bearer Token | Personalized intern photo upload & interactive cropper |
| `/upload/success` | Public | Submission receipt & review confirmation |
| `/admin/login` | Public | Staff login with role verification |
| `/admin/dashboard` | Admin Only | Telemetry, intern table, single & bulk link actions |
| `/admin/photos` | Admin Only | High-res inspection gallery, zoom/rotate, approve/reject |
| `/admin/exports` | Admin Only | Streaming ZIP export & individual JPEG downloads |
| `/admin/audit` | Admin Only | Comprehensive security audit log viewer |

### Backend API Endpoints
| Endpoint | Method | Description |
|---|---|---|
| `/api/invitation/[token]` | `GET` | Validates token, returns minimal intern details |
| `/api/upload/[token]` | `POST` | Validates image bytes, stores photo, marks submitted |
| `/api/admin/login` | `POST` | Authenticates admin credentials, sets session cookie |
| `/api/admin/logout` | `POST` | Revokes session, deletes cookie |
| `/api/admin/me` | `GET` | Returns current authenticated admin profile |
| `/api/admin/stats` | `GET` | Computes live statistics from PostgreSQL |
| `/api/admin/interns` | `GET` | Search, filter, and paginated intern records |
| `/api/admin/invitations/generate` | `POST` | Generates 256-bit secure link for single intern |
| `/api/admin/invitations/bulk-generate` | `POST` | Bulk link generator for pending interns |
| `/api/admin/invitations/revoke` | `POST` | Revokes an active invitation link |
| `/api/admin/invitations/send-email` | `POST` | Sends branded invitation email via Resend |
| `/api/admin/invitations/bulk-send-email` | `POST` | Dispatches invitation emails in bulk |
| `/api/admin/photos/review` | `POST` | Approves or rejects a photo with audit record |
| `/api/admin/photos/reopen` | `POST` | Reopens submission and issues fresh link |
| `/api/admin/photos/preview/[id]` | `GET` | Protected photo streaming for authorized admins |
| `/api/admin/export/zip` | `GET` | Streams production-ready ZIP archive |
| `/api/admin/audit-logs` | `GET` | Paginated security audit logs |

---

## 5. Deployment Guide for Subdomain (`id.codxa-agency.online`)

### Step 1: DNS Configuration
Add a CNAME record at your DNS provider (e.g. Cloudflare / Hostinger / Namecheap):
```
Type:  CNAME
Name:  id
Value: cname.vercel-dns.com. (or your VPS IP / A record)
Proxy: DNS Only or Proxied
```

### Step 2: Vercel Subdomain Setup
1. In Vercel Project Settings &rarr; **Domains**, add:  
   `id.codxa-agency.online`
2. Assign the domain to this project directory (`c:\Users\ashuc\OneDrive\Desktop\id cards`).

### Step 3: Production Environment Variables
Set the following environment variables in Vercel / server:
```env
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
SUPABASE_URL="https://[PROJECT_REF].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
RESEND_API_KEY="re_your_resend_api_key"
RESEND_FROM_EMAIL="CodeXa Agency <contact@codxa-agency.online>"
NEXT_PUBLIC_PORTAL_URL="https://id.codxa-agency.online"
NODE_ENV="production"
```

### Step 4: Build & Launch
```bash
npm run build
npm run start
```

---

## 6. Local Testing Instructions

To run the automated test suites locally:

```bash
# 1. Run database migration (backward-compatible)
node --env-file=.env scripts/migrate-id-cards.js

# 2. Run Prisma connectivity test
node --env-file=.env scripts/test-prisma.js

# 3. Run full 9-point end-to-end test suite
node --env-file=.env scripts/test-e2e.js

# 4. Run local server and HTTP integration test
npm run build
npm run start # in one terminal
node scripts/test-http-endpoints.js # in second terminal
```
