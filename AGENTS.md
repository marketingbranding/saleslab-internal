# AGENTS.md

## Project Facts

- This is a single Next.js App Router app, not the Laravel app described in parts of `docs/`; trust `package.json`, `next.config.ts`, Firebase config, and actual source over conflicting planning docs.
- Use npm because `package-lock.json` is present. There are no test, formatter, or typecheck scripts in `package.json`.
- Main entrypoints: `app/layout.tsx` wraps everything in `AuthProvider`; `app/page.tsx` is the client-side app shell and navigation state machine; `app/api/analyze/route.ts` is the only API route.
- Import aliases use `@/*` from repo root via `tsconfig.json`.

## Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Production build: `npm run build`
- Start built app: `npm run start`
- Lint: `npm run lint`
- Typecheck when needed: `npx tsc --noEmit`
- Run lint separately before build; `next.config.ts` sets `eslint.ignoreDuringBuilds: true`, so `npm run build` will not catch lint failures.
- `npm run clean` maps to `next clean`; verify it before relying on it because it is not a standard Next 15 command.

## Environment And Services

- Required env for Gemini call mode: `NEXT_PUBLIC_GEMINI_API_KEY`.
- Analysis route prefers `GROQ_API_KEY`; without it, it falls back to `GEMINI_API_KEY` or `NEXT_PUBLIC_GEMINI_API_KEY`.
- Text roleplay provider is selected from Firestore `settings/global`: `ollama`, `openrouter`, or `gemini`. The current `lib/gemini.ts` text path uses OpenRouter when configured, otherwise Ollama; call mode uses Gemini.
- Ollama browser calls require CORS: run `OLLAMA_ORIGINS="*" ollama serve` and keep `ollamaUrl` reachable from the browser.
- Firebase initializes from `firebase-applet-config.json` and explicitly uses `firestoreDatabaseId`; Firestore rules live at `config/firestore.rules` and `firebase.json` points to that same database.
- Do not commit secrets from `.env.local`; `.env.example` is the documented template.

## Source Map

- `lib/firebase.ts`: Firebase app/auth/firestore initialization, Google login/logout, settings fetch, Firestore error reporting.
- `lib/AuthContext.tsx`: auth/profile listener used globally by `app/layout.tsx`.
- `lib/gemini.ts`: built-in scenarios, provider routing for roleplay, and client wrapper for `/api/analyze`.
- `components/CallInterface.tsx`: microphone/Web Audio/Gemini Live call flow; be careful with refs and cleanup when editing.
- `components/FeedbackView.tsx`: saves session state to Firestore, calls analysis, and persists analysis success/failure.
- `components/admin/*`: admin dashboard, scenario/persona builders, and AI settings UI.

## Data And Auth Rules

- Admin checks are duplicated in UI (`app/page.tsx`) and Firestore rules (`config/firestore.rules`); keep them in sync when changing admin access.
- Firestore collections used by the app include `scenarios`, `personas`, `sessions`, `settings/global`, `users`, and `admins`.
- Scenario IDs and session IDs must satisfy the Firestore rule regex `^[a-zA-Z0-9_\-]+$` and be 128 chars or less.
- `sessions` writes require `userId == request.auth.uid` and a numeric `score`, including intermediate failed/processing analysis states.
- `settings/global` is admin-only to read and write, so non-admin UI must tolerate missing or denied settings reads.

## UI Conventions

- Tailwind v4 is configured through `app/globals.css` with `@theme`; shared retro primitives are CSS classes like `retro-panel`, `retro-btn`, `retro-input`, and `retro-badge`.
- The visual language is square-corner retro editorial: Georgia headings, Inter body, IBM Plex Mono numerics, hard 2px borders, and offset shadows. Preserve it instead of introducing rounded-card SaaS defaults.
- Components commonly use `motion/react` and `lucide-react`; keep client components marked with `'use client'` when they use hooks, browser APIs, Firebase auth listeners, or animations.

## Verification Notes

- There is no CI workflow in this repo. For code changes, run at least `npm run lint` and usually `npx tsc --noEmit` plus `npm run build` when behavior or framework boundaries changed.
- For Firebase/rules changes, inspect both `firebase.json` and `config/firestore.rules`; no emulator or rules test harness is configured.
- Voice and microphone behavior needs manual browser verification; automated tests do not cover Web Audio, SpeechRecognition, or Gemini Live sessions.
