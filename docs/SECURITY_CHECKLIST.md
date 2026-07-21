# Security Checklist

## Repository Visibility

- This repository contains internal architecture and should be private.
- Confirm repository visibility manually in GitHub settings before sharing access.
- A source-code change cannot make the GitHub repository private.
- Do not claim the repository is private unless a repository owner has confirmed it.

## Stage 1 Deployment Order

1. Rotate any OpenRouter key that was previously stored in Firestore.
2. Configure all server-only environment variables from `.env.example`.
3. Bootstrap at least one admin UID before removing the email allowlist:

   ```bash
   npm run bootstrap:admin -- --uid=FIREBASE_AUTH_UID --label="Initial admin"
   ```

4. Remove the legacy key field from Firestore:

   ```bash
   npm run cleanup:openrouter-key
   ```

5. Inspect `settings/global` and confirm `openRouterApiKey` no longer exists.
6. Deploy the Next.js application with Firebase Admin credentials available only to the server runtime.
7. Immediately deploy Firestore rules and indexes. Keep this interval short because cached old clients can still write sessions until the new rules are active.
8. Verify a normal user and an admin account after deployment.

Both scripts use Firebase Admin and require either the explicit Firebase credential environment variables or Application Default Credentials. They target the named database configured by `FIRESTORE_DATABASE_ID`.

## Authentication

- `/api/analyze` and `/api/roleplay/text` require `Authorization: Bearer <firebase-id-token>`.
- UID and email supplied in request bodies are never used for authorization.
- Admin access is granted only by an existing `/admins/{uid}` document.
- Normal users cannot create their own admin document.
- Keep at least two controlled admin accounts to avoid lockout.

## Provider Secrets

- `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `NVIDIA_NIM_API_KEY`, `GEMINI_API_KEY`, Firebase Admin credentials, and service-account files are server-only.
- Never add a `NEXT_PUBLIC_` prefix to server credentials.
- Gemini Live still uses `NEXT_PUBLIC_GEMINI_API_KEY` in the browser. Restrict that key by API, origin/application, and quota in Google Cloud.
- Never store provider secrets in Firestore, client state, screenshots, logs, or committed files.

## Session Integrity

- Clients can read their own sessions but cannot create or update session documents.
- `/api/analyze` creates processing state and finalizes score/feedback through Firebase Admin.
- Admins can read and delete team sessions but cannot alter evaluator results through client Firestore writes.
- A submitted transcript is still browser-originated and cannot prove that every turn came from a live provider session. Signed/server-originated turn capture is a future hardening item.

## Rate Limiting

- Stage 1 uses a per-UID in-memory limiter.
- It is best effort only: counters are not shared between serverless instances and reset on restart/deploy.
- Move the `RateLimiter` implementation to a shared durable store before high-volume public use.

## Operational Verification

Run before release:

```bash
npm install
npm run verify
git diff --check
```

Manually verify:

- Missing/invalid API tokens return `401`.
- Invalid/oversized evaluator requests return `400`.
- Rate-limited requests return `429` with `Retry-After`.
- Provider exhaustion returns `503` without leaking provider responses or secrets.
- Session retry keeps the same document and cannot replace another user’s session.
- A normal user cannot read settings or secret collections.
- Admin navigation includes the `Cabang` tab and remains usable at mobile width.
