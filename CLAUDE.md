@AGENTS.md

# Margin Monitor (billing-app)

Internal billing & finance platform for **Evolve Brands**. Teams add monthly
**projections** (expected billing per client/program), **convert** them to
billed invoices, track **vendor costs, credit notes and margins**, record
**payments received**, and send invoice-issue emails. Public URL:
https://app.marginmonitor.in. GitHub: `heyambunny/margin-monitor` (branch
`main`, pushed directly - no PR flow).

Read this file fully before changing anything; it replaces the original chat
context.

## Stack

- **Frontend**: Next.js 16 (App Router, `app/`), React 19, TypeScript,
  Tailwind v4 (+ `tw-animate-css`), recharts, lucide-react, react-hot-toast.
  All pages are client components (`'use client'`) that call the API with
  `fetch`/axios and `Authorization: Bearer <token>` from localStorage.
  `NEXT_PUBLIC_API_URL` (in `.env.local` / `.env.production`) is the API base.
- **Backend**: FastAPI in `backend/` (imported as the `backend` package -
  **always run from the repo root**), psycopg2 with a `SimpleConnectionPool`
  (`backend/db.py`), JWT auth (`backend/auth/jwt_handler.py`). Python 3.14 venv
  in `venv/`. Some helpers live in top-level `utils/` (`utils/audit.py`).
- **DB**: PostgreSQL. Local and production are separate databases.
- `requirements.txt` still lists streamlit (old v1 app); harmless.
- MUI packages + `app/theme/ThemeRegistry.tsx` are unused leftovers.
- `components/ui/*` are shadcn/base-ui primitives, mostly superseded by the
  shared app components below.

## Roles & access (`lib/roles.ts`, enforced again in every API route)

| role_id | Role | Pages |
|---|---|---|
| 1 | Admin | everything |
| 2 | Finance | Finance (home), Add/Edit Projection, Convert to Billing, Billed, Receivables, Reports |
| 3 | Supervisor | Dashboard (home), Reports |

Non-admins only see clients mapped to them in `user_client_access`
(`get_user_client_ids` in `backend/db.py`). Backend uses
`require_roles(...)` / `require_admin` dependencies. The frontend role map is
UI convenience only; the API is the real gate.

## Pages (`app/dashboard/*`) and what they do

- `/login` - sign in. Public page: **no real figures/names on it** (decorative
  cards use placeholder shapes). "Forgot password" / "Contact admin" just
  explain that an admin manages accounts (no reset flow exists).
- `/dashboard` - management dashboard: hero (total, billed vs projected,
  collected vs outstanding), Billed/Projected/Total cards with margin rings,
  Collected/Outstanding/Overdue cards, revenue/margin/collected trend,
  top clients, revenue split, vendor + client donuts, quarterly cards,
  sortable client table, monthly client breakdown (billed FY-to-date,
  projected rest of FY).
- `/dashboard/overview` - per-supervisor performance + client breakdown.
- `/dashboard/finance` - pending billing (Active projected entries due by
  month, aging) + "Pending collection" strip linking to Receivables.
- `/dashboard/reports` - every entry with all fields, up to 5 vendors,
  credit notes, margin, payment columns; CSV export.
- `/dashboard/projections/add` - create projection (live preview, sticky save
  bar on phones). `/dashboard/bulk-upload` - CSV/XLSX import.
- `/dashboard/projections/edit` - edit amount, **invoice month** (current FY
  only; FY derived server-side), description, vendors. Client, program,
  category and projection date are read-only.
- `/dashboard/billing/convert` - bill a projection (invoice no, funnel no,
  date, amount, vendors) **or delete it** (status Deleted + reason, no invoice
  fields needed).
- `/dashboard/billing` - billed invoices with payment status; click to
  record payments; Admin can **Unbill** (move back to projected).
- `/dashboard/receivables` - payments received per invoice (see below).
- `/dashboard/clients` - users + client access (Admin). Create User must use
  real role names `Admin` / `Finance` / `Supervisor` (DB lookup is by name).
- `/dashboard/audit-logs` - every change (who/what/old→new).
- `/dashboard/email-center` - load a billed invoice, pick an issue type,
  preview and send an email. To = Finance users mapped to the client, CC =
  Supervisors mapped to the client + a hard-coded default CC (Abhishek
  Sharma) in `backend/services/email_service.py`. Sends are logged in
  `email_logs`.

## API (all under `/api`, see `backend/routes/*.py`)

auth: `POST /login` (body `{email,password,app}`), `POST /refresh[?app=true]`,
`GET /me` · projections: `POST /projection`, `GET /projections`,
`/projections/active` (edit page), `/projections/pending` (convert page),
`POST /edit-projection/{id}` · billing: `POST /billing/convert/{id}`,
`GET /billed`, `POST /billed/{id}/unbill` (Admin) · receivables:
`GET /receivables`, `GET|POST /receivables/{entry_id}/payments`,
`PUT|DELETE /payments/{id}` · `GET /dashboard`, `/dashboard/collections`,
`/overview`, `/finance-dashboard`, `/reports` · `POST /audit-logs` ·
users/access: `GET|POST /users`, `GET /user-clients/{id}`,
`POST /assign-client`, `/remove-client` · dropdowns: `/clients`, `/programs`,
`/categories`, `/vendors` · email: `GET /email/invoice/{id}`,
`/email/logs/{id}`, `POST /email/preview`, `/email/send` · bulk:
`POST /bulk-upload-preview`, `/bulk-upload`.

## Database (key tables)

- `billing_entries` - one row per projection/invoice: client_id, program_id,
  category_id, expense_type_id, invoice_month (`Mmm-YY`, e.g. `Mar-27`),
  financial_year (`FY 2026-2027`), invoice_description, client_billed_amount,
  projection_date, invoice_no, invoice_date, funnel_number, status
  (`Active` / `Billed` / `Deleted`), reason, created_by_user_id.
- `vendor_expenses` (billing_entry_id, vendor_id, amount), `vendors`.
- `credit_notes` (billing_entry_id, credit_note_no, credit_note_date, cn_amount).
- `payments` (billing_entry_id, payment_date, amount, tds_amount, payment_mode,
  reference_no, remarks, is_deleted, created_by/updated_by, timestamps).
- `clients`, `programs` (client_id), `categories`, `expense_types`
  (1 Projected, 2 Billed), `roles` (1 Admin, 2 Finance, 3 Supervisor),
  `users` (password_hash, role_id, is_active), `user_client_access`.
- `audit_logs` (table_name, record_id, column_name, old/new, action_type,
  changed_by, user_role, module_name, impact_level, changed_at) - write via
  `log_audit(cursor, table, record_id, column, old, new, action, user_id,
  role_id, module, impact)` from `utils/audit.py` for every data change.
- `email_issue_types` (10 standard templates), `email_logs`.

## Business rules (important)

- **"Billed" = has an invoice number and isn't Deleted.** Historically it was
  recorded two ways: `status='Billed'` (Convert to Billing) and
  `expense_type_id=2` with status `Active` (older entries). Convert to Billing
  now sets both; Unbill resets both. Dashboard/Billed/Receivables/Reports all
  use the invoice-number rule. Prod still has ~27 older invoices with
  status Billed but expense type Projected (only affects Reports' Type
  column/filter; a backfill was offered, not done).
- **Financial year** runs Apr-Mar. Format everywhere: `FY 2026-2027`. Invoice
  month `Apr-26..Dec-26, Jan-27..Mar-27` belongs to FY 2026-2027.
- **Margin** = billed - vendor costs - credit notes.
- **Receivables** maths lives ONLY in `backend/services/receivables.py`:
  outstanding = billed - credit notes - received - TDS; status Unpaid /
  Partially Paid / Paid / Overpaid / No Dues. Reused by Receivables, Billed,
  Dashboard, Reports. Defaults chosen (user didn't specify): billed amount is
  the full amount due (higher payments show Overpaid, e.g. GST on top), TDS
  optional (1/2/10% quick buttons on billed amount), one payment per invoice,
  Finance + Admin can edit/delete (soft delete), all audited. An invoice with
  payments can't be unbilled. Payment panel: Full payment preselected and
  prefilled, amount auto-recalculates as TDS changes, panel closes on save.
- Unbill and Deleted entries are excluded from projections/reports/dashboard.
- Business data is **confidential**: never put real numbers, client names or
  invoice numbers in sample/decorative UI, placeholders or docs.

## Sessions & auth

- Passwords: bcrypt, but `/login` still also accepts plain-text stored
  passwords (known issue, see backlog).
- Web: 30-min JWT renewed every 10 min while active via `/api/refresh`;
  15-min idle logout with a warning modal (`SessionProvider`,
  `SessionManager`). Installed app (PWA standalone): logs in with `app:true`
  for a 30-day token, no idle logout, renews when reopened. Only a 401 signs
  the user out; network errors keep the session (`lib/pwa.ts`).

## Frontend conventions

- Shared UI in `components/app/ui.tsx`: `useUi()` theme tokens, `PageHeader`,
  `StatGrid`, `FilterBar`/`SearchInput` (`/` focuses)/`FilterSelect`,
  `TableShell` (+ `mobile` prop for phone cards via `MobileList`/`MobileCard`),
  `THead`/`Th` (sortable)/`Tr`/`TdAccent`, `Pagination`, `SidePanel`,
  `Modal` (bottom sheet on phones), `Badge`, `Chip`, `Avatar`, `EntityCell`,
  `Field`, `Alert`, `GradientButton`, `PageSkeleton`. Also
  `components/app/VendorRows.tsx`, `components/app/PaymentPanel.tsx`.
- Formatting helpers `lib/format.ts` (`formatINR`, `formatDate`,
  `avatarColor`), `lib/pagination.ts`.
- Light + dark themes (`ThemeProvider`, toggle in sidebar); every page must
  work in both. Toasts via react-hot-toast (mounted in dashboard layout).
- Layout: sidebar (grouped nav, collapsible with `[`, Ctrl/Cmd+K page
  switcher). Below 1024px it's a drawer with a top bar.
- Tailwind can't see class names built with template strings
  (`hover:${x}`) - always write full literal class names.
- Next.js here is newer than training data: check
  `node_modules/next/dist/docs/` before using framework APIs.

## Mobile & installed app (PWA)

- `app/manifest.ts`, `public/sw.js`, `public/offline.html`, icons in
  `public/icons` + `app/apple-icon.png` (Gem logo on blue→purple gradient).
- The service worker must NEVER cache `/api/*` or page HTML (confidential) -
  only `/_next/static`, icons and `offline.html`. Bump `VERSION` in sw.js when
  changing it. Registers only in production builds; the in-app preview
  browser blocks service workers - verify with headless Chrome (DevTools
  protocol via Node's built-in WebSocket; no extra packages).
- iPhone gets a one-time "Add to Home Screen" hint (`IosInstallHint`).

## Run locally

Use the preview tools: `.claude/launch.json` defines `backend` (uvicorn :8000,
--reload) and `dev` (Next :3000), both pinned (`autoPort: false`) because the
backend CORS only allows `http://localhost:3000`. Manually:

```bash
venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload   # backend
npm run dev                                                               # frontend on :3000
```

`next build` type-checks (no `ignoreBuildErrors`), so run `npx tsc --noEmit`
before pushing. ESLint still reports many pre-existing warnings (not blocking).

## Testing without real passwords

Mint a local token instead of logging in, then put it in localStorage:

```bash
venv/bin/python -c "from backend.auth.jwt_handler import create_access_token as t; print(t({'user_id':4,'name':'Himanshu','role_id':1}))"
```

(local user ids: 4 = Himanshu/Admin, 1 = Rakesh/Finance, 2 = Jogesh/Finance,
3 = Anshul/Finance, 5 = Seema Motwani/Supervisor.) Use local entries #1210/#1211 (JK Paper, ₹6,830) as test
rows. Always restore test data afterwards (delete test payments, unbill, remove
the test `audit_logs` rows) and never touch data the user created. Never send
real emails or change production data while testing.

## Deploy to production

Server `ssh -p 24 root@216.48.185.160`, app at `/root/margin-monitor`,
nginx: `/api` → :8001, `/` → :3000. Services: `margin-monitor-backend`
and `margin-monitor-frontend`. The `backend`/`frontend` services on the same
box are the old Streamlit v1 app - don't touch them. Prod `.env` holds DB,
JWT and SMTP settings (backups `.env.bak-*`); `.env` is git-ignored.

```bash
ssh -p 24 root@216.48.185.160 "cd /root/margin-monitor && git pull --ff-only origin main"
# only if requirements.txt / package.json changed:
ssh -p 24 root@216.48.185.160 "cd /root/margin-monitor && venv/bin/pip install -r requirements.txt && npm ci"
# run any new migration (see below), then:
ssh -p 24 root@216.48.185.160 "cd /root/margin-monitor && npm run build"
ssh -p 24 root@216.48.185.160 "systemctl restart margin-monitor-backend margin-monitor-frontend"
curl -s -o /dev/null -w "%{http_code}\n" https://app.marginmonitor.in/login
```

No migration tool: schema changes are idempotent one-off scripts in
`backend/scripts/migrate_*.py`, run on each DB before restarting the backend:

```bash
ssh -p 24 root@216.48.185.160 "cd /root/margin-monitor && set -a && . ./.env && set +a && PYTHONPATH=. venv/bin/python backend/scripts/migrate_xxx.py"
```

Existing: `migrate_email_tables.py` (run on prod ✓), `migrate_payments.py`
(**not yet run on prod**). Rollback: `git checkout <sha> && npm run build`
then restart the two services.

Email Center needs `SMTP_HOST`, `SMTP_PORT`, `SMTP_EMAIL`, `SMTP_PASSWORD`,
`SMTP_NAME` in `.env` (local and prod are set; Gmail account with an app
password). Restart the backend after changing them.

## Working with the user

- Confirm before pushing/deploying; "push and deploy" means commit, push to
  `main`, deploy with the steps above and verify. Ask before changing
  production data (backfills, deletes); schema-only additive migrations are
  run as part of an approved deploy.
- Keep this file updated when run/deploy steps or business rules change.
- Explain findings plainly; flag data oddities rather than silently fixing.

## Current state (2026-10-03)

- Production is at `ce59015` (UI redesign, mobile + PWA, unbill, delete on
  convert, invoice-month edit, billed figure fix, email tables + SMTP).
- **Receivables** (`5c2d7e5`, `587a172`) is committed locally, **not pushed
  or deployed**. Deploying it requires running `migrate_payments.py` on prod.
- Local DB has two user-entered test payments (#1181 ₹2,75,000 ref
  787878RYRY; #178 ₹1,500) - leave unless told otherwise.

## Known issues / backlog

- `/login` accepts plain-text passwords stored in `users.password_hash`
  (should be bcrypt-only after migrating any plain ones).
- SMTP app password was shared in chat - should be rotated.
- ~27 prod invoices: status Billed but expense type Projected (Reports Type
  column/filter only). Local #1183: status Billed with empty invoice no
  (invisible everywhere).
- Prod #1243 (V-Guard): billed amount ₹0 with a ₹12.5L credit note → large
  negative margin; worth checking with Finance.
- Edit Projection can't show existing vendors (API doesn't return them);
  adding vendors there replaces all existing ones.
- No restore for Deleted projections; no real forgot-password flow.
- Bulk Upload sample CSV uses a real client name.
- Gmail sending limit ~500 recipients/day.
