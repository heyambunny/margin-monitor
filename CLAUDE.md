@AGENTS.md

# Margin Monitor (billing-app)

Next.js frontend (repo root) + FastAPI backend (`backend/`, imported as the
`backend` package - always run it from the repo root). Both read `.env` /
`.env.local` at the repo root.

## Run locally

```bash
venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload   # backend
npm run dev                                                               # frontend on :3000
```

`next build` type-checks (no `ignoreBuildErrors`), so run `npx tsc --noEmit`
before pushing.

## Deploy to production

Server `ssh -p 24 root@216.48.185.160`, app at `/root/margin-monitor`,
public at https://app.marginmonitor.in (nginx: `/api` -> :8001, `/` -> :3000).
Services: `margin-monitor-backend` and `margin-monitor-frontend`. The
`backend`/`frontend` services on the same box are the old Streamlit v1 app -
don't touch them.

```bash
ssh -p 24 root@216.48.185.160 "cd /root/margin-monitor && git pull --ff-only origin main"
# only if requirements.txt / package.json changed:
ssh -p 24 root@216.48.185.160 "cd /root/margin-monitor && venv/bin/pip install -r requirements.txt && npm ci"
ssh -p 24 root@216.48.185.160 "cd /root/margin-monitor && npm run build"
ssh -p 24 root@216.48.185.160 "systemctl restart margin-monitor-backend margin-monitor-frontend"
curl -s -o /dev/null -w "%{http_code}\n" https://app.marginmonitor.in/login
```

There is no migration tool: schema changes need a one-off script in
`backend/scripts/migrate_*.py` (idempotent), run by hand on the prod DB before
restarting the backend:

```bash
ssh -p 24 root@216.48.185.160 "cd /root/margin-monitor && set -a && . ./.env && set +a && PYTHONPATH=. venv/bin/python backend/scripts/migrate_xxx.py"
```

Email Center needs `SMTP_HOST`, `SMTP_PORT`, `SMTP_EMAIL`, `SMTP_PASSWORD`,
`SMTP_NAME` in the server's `.env` (restart the backend after changing them).

## Mobile & installed app (PWA)

- Below 1024px the sidebar is a slide-in drawer with a top bar; list pages
  pass a `mobile` card view to `TableShell` (components/app/ui.tsx).
- `app/manifest.ts` + `public/sw.js` make the app installable. The service
  worker must NEVER cache `/api/*` responses or page HTML (confidential data) -
  only `/_next/static`, icons and `offline.html`. Bump `VERSION` in sw.js when
  changing it. It only registers in production builds; the in-app preview
  browser blocks service workers, so test with real/headless Chrome.
- Sessions: web keeps the 15-min idle logout and renews its 30-min token
  while active (`/api/refresh`). The installed app (display-mode standalone)
  logs in with `app: true` for a 30-day token, has no idle logout and renews
  on open. Only a 401 signs the user out - network errors must not.
- Icons are generated from the Gem logo (public/icons, app/apple-icon.png).

## Data notes

- "Billed" is recorded two ways: `status = 'Billed'` (Convert to Billing) and
  `expense_type_id = 2` / 'Billed' (older entries, status stays 'Active').
  Code that asks "is this billed?" must handle both.
- Receivables: payments against billed invoices live in `payments`
  (`backend/scripts/migrate_payments.py`). Received / outstanding / payment
  status are computed only in `backend/services/receivables.py`
  (outstanding = billed - credit notes - received - TDS) and reused by
  Receivables, Billed, Dashboard and Reports. Deleting a payment is a soft
  delete; an invoice with payments can't be unbilled.
- Business figures are confidential: never put real numbers, client names or
  invoice numbers into sample/decorative UI (especially the public login page).
