# Apex — Build Plan

A dark-themed admin app for license + file management, with hardcoded admin auth, framer-motion animations, and a mock FastAPI-style client layer.

## Scope (V1)

- Login page (hardcoded credentials, session in localStorage)
- Protected admin layout with sidebar + animated route transitions
- Dashboard overview (stats cards: total keys, active, lifetime, files)
- License Management page (generate single/bulk, list, search/filter, copy/export, revoke)
- File Management page (upload, version, file type, list of uploaded versions, "latest" indicator)
- API Tester page (manual calls to the 4 endpoints with response viewer)
- Mock API layer + signed-request protocol (HMAC-style header token)

## Design

- Pure dark theme: near-black background (`hsl(220 20% 6%)`), elevated surfaces (`hsl(220 18% 10%)`), subtle borders.
- Neon accent: **electric emerald** `hsl(152 95% 55%)` with a glow variant for buttons, key chips, focus rings.
- Typography: JetBrains Mono for keys/code; Inter for UI.
- Custom tokens in `index.css` + `tailwind.config.ts`: `--neon`, `--neon-glow`, `--surface`, `--surface-2`, gradients (`--gradient-neon`, `--gradient-surface`), shadows (`--shadow-neon`, `--shadow-elevated`).
- Button variants: `neon` (filled glow), `ghostNeon` (outline), `danger`.
- Framer Motion: page-level fade/slide transitions via `AnimatePresence` keyed on route; staggered card entrance; hover lift on key rows; modal scale-in.

## Pages & Routes

```
/login                → LoginPage (public)
/admin                → redirect → /admin/dashboard
/admin/dashboard      → Overview stats
/admin/licenses       → License manager
/admin/files          → File upload + versions
/admin/api            → API tester
*                     → NotFound
```

`ProtectedRoute` wrapper checks session; redirects to `/login` if invalid.

## License Management

- Generate single key: pick duration (1 Day / Lifetime) → UUID v4 → added to list.
- Bulk generate: number input (1–50) + duration → produces table of keys with "Copy all" and "Export .txt" buttons.
- Each key row: key (mono), duration badge, created date, expires date (or "Never"), status (Active/Expired), copy button, revoke button.
- Search bar filters by key substring, status, duration.
- Persisted to `localStorage` (mock store) so refresh preserves state.

## File Management

- Drag-and-drop / file picker upload zone.
- Form fields: Version (validated `vX.Y.Z`), File Type (select: installer/update/patch/asset).
- On submit: POST to mock `/upload` (stores file metadata + base64 preview in localStorage, capped). Marks newest as "latest".
- List of uploaded files with version, type, size, date, "latest" badge, download/delete actions.

## Mock API Layer (`src/lib/api.ts`)

Single client that simulates a FastAPI backend. Endpoints:

- `POST /check-key` → validates against local store, returns `{ valid, expires_at, duration }`.
- `GET /search-key/:key` → returns full metadata or 404.
- `GET /version/latest` → returns latest version string.
- `GET /download/latest` → triggers browser download of the latest stored file blob.

Every request:
1. Generates timestamp + nonce.
2. Computes `X-Apex-Signature` = HMAC-SHA256(secret, `${method}:${path}:${timestamp}:${nonce}:${body}`) using Web Crypto API.
3. Sends headers: `X-Apex-Timestamp`, `X-Apex-Nonce`, `X-Apex-Signature`, `Authorization: Bearer <session-token>`.
4. Mock server validates signature before responding; rejects with 401 on mismatch.

`API_BASE_URL` read from `import.meta.env.VITE_API_BASE_URL` so swapping to a real FastAPI server is one env var.

## Auth

- `useAuth` hook + `AuthProvider` context.
- Hardcoded check: `corruptedwin` / `F16k12i01k89#16` → issues a signed session token (random + timestamp, stored in localStorage with 12h expiry).
- `ProtectedRoute` validates token expiry on mount and on route change.
- Logout clears session + redirects.

## Technical Notes

- New deps: `framer-motion`, `uuid`, `@types/uuid`.
- Files added:
  - `src/lib/api.ts`, `src/lib/crypto.ts`, `src/lib/storage.ts`
  - `src/contexts/AuthContext.tsx`
  - `src/components/ProtectedRoute.tsx`, `src/components/AdminLayout.tsx`, `src/components/PageTransition.tsx`
  - `src/components/licenses/{KeyTable,GenerateDialog,BulkGenerateDialog}.tsx`
  - `src/components/files/{UploadZone,FileList}.tsx`
  - `src/pages/Login.tsx`, `src/pages/admin/{Dashboard,Licenses,Files,ApiTester}.tsx`
- Update: `src/App.tsx` (routes + AuthProvider), `src/index.css`, `tailwind.config.ts`, `src/pages/Index.tsx` (redirect to `/admin`).
- All colors via semantic tokens; button variants extended (no inline color classes).
- Security note surfaced in UI: hardcoded creds + localStorage are explicitly for the V1 mock; real deployment must move auth + signing secret server-side.

## Out of Scope (V1)

- Real backend, real persistence beyond localStorage, multi-user/role management, email flows, rate limiting, audit log UI.
