# KYB Agent

Automated re-engagement system for Ontop clients who haven't completed (or finished) their KYB (Know Your Business) verification. It queries Redshift for two client segments, sends WhatsApp/email nudges through Zendly, and logs everything to Supabase. A small Next.js dashboard lets ops review and manually send/override.

## How it works

### The two segments

The query in [`lib/queries.ts`](lib/queries.ts) (`KYB_ALL_SEGMENTS_SQL`) produces two cohorts from Redshift, both restricted to clients with a first login in 2026 YTD:

- **Segment A — never started KYB.** Logged in within the last 30 days (but at least 3 days ago, so brand-new signups aren't flagged), and never submitted a KYB check.
- **Segment B — KYB submitted, document(s) pending.** Submitted KYB this year, it's still `REVIEW_NEEDED`/`IN_PROCESS`, and there's at least one pending `document_request`.

Both require at least one contact channel (phone or email) and exclude test/dummy/deleted clients.

### What triggers a send

`GET /api/cron` ([`app/api/cron/route.ts`](app/api/cron/route.ts)) does the actual work:

1. Authenticates via `Authorization: Bearer <CRON_SECRET>` — not a user session.
2. Checks `settings.cron_enabled` in Supabase; bails out (and logs a `cron_runs` row) if it's not `'true'`.
3. Re-runs the Redshift query, cross-references `contacts_log` to skip anyone who's already hit `settings.max_follow_ups` (default 3).
4. For each eligible client with a phone number, picks a WhatsApp template and sends it via Zendly.
5. Logs every send (or skip) to `contacts_log`, and a run summary to `cron_runs`.

**This endpoint is not called by Vercel Cron.** The scheduled trigger is a Supabase `pg_cron` job (`kyb-agent-hourly`) that calls it once an hour via `pg_net`. See [Setting up the scheduled trigger](#setting-up-the-scheduled-trigger) below — there is nothing in this repo that creates that job; it lives entirely in the Supabase project's database. `vercel.json` still defines a weekly Vercel Cron as a fallback/leftover, but it's redundant with the Supabase job and can be removed once you've confirmed the latter is reliable.

### Template routing ([`lib/kyb-templates.ts`](lib/kyb-templates.ts))

Only **two** WhatsApp templates are approved and wired up right now:

| Segment | Template | Env vars |
|---|---|---|
| A | Generic "you haven't started KYB" nudge | `ZENDLY_TEMPLATE_SEGMENT_A_NUDGE_ES` / `_EN` |
| B | Generic "here's what's still pending" nudge, listing every pending doc title | `ZENDLY_TEMPLATE_GENERIC_MISSING_DOC_ES` / `_EN` |

`lib/kyb-templates.ts` also defines a larger set of **category-specific** templates (ownership, incorporation, tax, ID document, power of attorney, etc.) with hardcoded default names — these are **not currently used** by the routing logic (`routeSegmentB` always resolves to the generic template or `needs_review`). They're left in place for when/if those get approved by Meta; wiring one back in means changing `routeSegmentB` to return a `specific` routing kind again for that category, plus updating the two callers in `app/api/cron/route.ts` and `app/api/send/route.ts`.

**`needs_review`**: if a client's pending document title contains something that looks like a third party's name (regex-detected — we can't reliably scrub free text), the cron skips it rather than risk naming the wrong person in a WhatsApp message. These show up with an orange **"Needs Review"** badge in the `/segment-b` table (with a filter toggle) and must be sent manually via the Send modal, after a human checks the actual document.

### Manual sends

`/segment-a` and `/segment-b` (session-gated, `@getontop.com` Google accounts only) list the live Redshift cohort, enriched with `contacts_log` history. Selecting a client opens `SendModal`, which lets an ops person send WhatsApp or email on demand — same template logic as the cron, same `max_follow_ups` cap, respected via `POST /api/send`.

## Frontend pages

| Page | What it shows |
|---|---|
| `/dashboard` | Aggregate stats: segment counts, contacted today, awaiting response, responded this week |
| `/segment-a`, `/segment-b` | Live Redshift cohort + manual send/bulk-send |
| `/contacts` | Full send history (`contacts_log`), with a **Webhook Events** tab showing raw Zendly payloads (`webhook_events`) |
| `/settings` | `max_follow_ups`, primary channel, cron enable/disable, and a **Recent Cron Runs** panel (`cron_runs`) — the only place in the UI to check the automation is actually firing |

### What the frontend does *not* cover

- Zendly template names, `CRON_SECRET`, Redshift/Gmail/Google OAuth credentials — all Vercel env vars, no UI.
- The Supabase `pg_cron` job itself (frequency, whether it's enabled) — manage that directly in the Supabase SQL editor.
- Re-approving/re-enabling a category-specific template once Meta approves one — requires a code change (see [Template routing](#template-routing-libkyb-templatests) above).

## Environment variables

| Variable | Used for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase connection |
| `REDSHIFT_HOST`, `REDSHIFT_PORT`, `REDSHIFT_DATABASE`, `REDSHIFT_USER`, `REDSHIFT_PASSWORD` | Client cohort query |
| `ZENDLY_API_KEY`, `ZENDLY_USER_ID`, `ZENDLY_CHANNEL_ACCOUNT_ID`, `ZENDLY_WORKFLOW_NAME` (optional) | WhatsApp send via Zendly |
| `ZENDLY_TEMPLATE_SEGMENT_A_NUDGE_ES` / `_EN`, `ZENDLY_TEMPLATE_GENERIC_MISSING_DOC_ES` / `_EN` | Approved WhatsApp template names — **required**, no safe default for the generic one |
| `ZENDLY_TEMPLATE_<CATEGORY>_ES` / `_EN` | Only needed if a category-specific template (see above) gets re-enabled |
| `CRON_SECRET` | Bearer token `/api/cron` requires |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google OAuth login (NextAuth), restricted to `@getontop.com` |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_FROM_EMAIL` | Email channel |
| `KYB_TEST_MODE` | **Local dev only.** `'true'` injects one synthetic Segment A client into `/api/clients` so the UI can be exercised without touching Redshift. Never set this in a deployed environment. |

## Local development

```bash
npm install
npm run dev
```

Requires all the env vars above in `.env.local` except `KYB_TEST_MODE`, which you'd set to `'true'` if you don't have Redshift access and just want to click through the UI.

```bash
npm run build   # production build — also runs the TypeScript check
npm run lint    # ESLint
```

## Database (Supabase)

Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor of a new project to create everything: `contacts_log`, `webhook_events`, `settings`, `cron_runs`, plus indexes and default settings rows.

| Table | Purpose |
|---|---|
| `contacts_log` | Every message sent (manual or cron), with `attempt_number` used to enforce `max_follow_ups` |
| `webhook_events` | Raw payloads from Zendly's delivery/response webhook (`/api/webhooks/zendly`) |
| `settings` | Key/value app config, editable from `/settings` |
| `cron_runs` | One row per `/api/cron` invocation — skipped, succeeded (with counts), or failed |

## Setting up the scheduled trigger

The app itself never schedules anything — something external has to call `/api/cron` on a timer. We use a Supabase `pg_cron` job instead of Vercel Cron (Vercel's free/Hobby tier caps cron frequency at once a day; this runs hourly).

In the Supabase SQL editor, on the **same project** as this app's database:

```sql
-- 1. Enable extensions (Database → Extensions in the dashboard, or here)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Store the CRON_SECRET (must match the Vercel env var exactly)
select vault.create_secret('<CRON_SECRET value>', 'kyb_cron_secret');

-- 3. Schedule the hourly call
select cron.schedule(
  'kyb-agent-hourly',
  '0 * * * *',
  $$
  select net.http_get(
    url := 'https://<your-deployed-domain>/api/cron',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'kyb_cron_secret')
    ),
    timeout_milliseconds := 30000
  );
  $$
);
```

Verify it's running: check `/settings` → **Recent Cron Runs** in the app, or query directly:

```sql
select * from cron.job_run_details order by start_time desc limit 5;
select content from net._http_response order by created desc limit 1;
```

If the secret in Vault ever gets out of sync with Vercel's `CRON_SECRET`, `/api/cron` returns `401` and `net._http_response.content` will show `{"error":"Unauthorized"}`. Update it with:

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'kyb_cron_secret'),
  '<new value, must match Vercel exactly>'
);
```

## Deployment notes

- Deployed on Vercel, auto-deploying from `main` on this GitHub repo.
- [`proxy.ts`](proxy.ts) is this Next.js version's middleware (not `middleware.ts` — see [`AGENTS.md`](AGENTS.md)). Its matcher **excludes** every API route that does its own auth check (`api/auth`, `api/webhooks`, `api/cron`, `api/send`, `api/clients`, `api/settings`, `api/contacts`, `api/cron-runs`, `api/webhook-events`) — anything not excluded gets redirected to `/login` by the session check, which returns HTML instead of JSON. If you add a new API route that isn't meant to require a browser session, add it to this matcher too, or it'll silently return a login page instead of your handler's response.
- `package-lock.json` is committed — a floating dependency version previously broke a production build silently (Vercel kept serving the last successful deploy, masking the failure). Don't delete it.
