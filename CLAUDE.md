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

There is no migration tool: schema changes need a one-off script run by hand
on the prod DB before restarting the backend.

## Data notes

- "Billed" is recorded two ways: `status = 'Billed'` (Convert to Billing) and
  `expense_type_id = 2` / 'Billed' (older entries, status stays 'Active').
  Code that asks "is this billed?" must handle both.
- Business figures are confidential: never put real numbers, client names or
  invoice numbers into sample/decorative UI (especially the public login page).
