# Unattended Work Report: Reliability & Test Pass

- **Branch:** `chore/reliability-test-pass` (branched from `main` at `a5e23d4`; not merged, not deployed)
- **Date:** 2026-09-25
- **Scope:** automated tests, reliability fixes, and a lightweight code-level security review. There were no architecture changes and no dependency changes. Production, the homelab, Tailscale and Vercel were not touched.

---

## Baseline

| Check | Command | Result |
|---|---|---|
| Server tests | `cd server && npx vitest run` | **27 passed / 9 files** (~21 s). Output flooded with request logs (full headers). |
| Server syntax | `node --check` on every server `.js` | Clean |
| Prisma schema | `npx prisma validate` | Valid; test DB migrations up to date (15 migrations) |
| Client lint | `cd client && npm run lint` | Clean, no warnings |
| Client type check + build | `cd client && npm run build` (`tsc -b && vite build`) | Clean, no warnings |
| Server lint / type check | none configured | N/A (plain JS, no ESLint in `server/`) |

**Environment notes**
- Local Postgres (Homebrew `postgresql@17`) was stopped. I started it temporarily with `pg_ctl` (no launchd service registered). The tests use the local DB `job_application_tracker_test`; the local dev DB `job_tracker` was checked (read-only row count) before and after, and was never modified.
- Vitest's default mode is `test`, so `vitest.config.js` loads `.env` **and** `.env.test` (`.env.test` wins).

**Existing coverage (27 tests):** two-user isolation for jobs, documents, attachments and reminders; basic CSRF and logout; single-use and expired reset/verification tokens; one profile-name test; unit tests for `errorHandler` and `validateJob`.

---

## Repository assessment

**Inspected:** `app.js`, `index.js`, `instrument.js`, all routes, controllers and middleware, `lib/*`, the Prisma schema and migrations, test setup and helpers, the CI workflow, the Dockerfile and docker-compose, `client/src/lib/api.ts`, `App.tsx` and all components, and `vercel.json`/`vite.config.ts`.

**Resources that actually exist:** users/auth, jobs (applications), documents (resumes/CVs, with many-to-many attachment to jobs), reminders, and stage history. There are **no separate notes, contacts or resumes resources**: "notes" is a text field on `Job`, and resumes are `Document`s. So ownership tests cover the real resources.

**Main testing gaps found**
- Registration was never tested, and neither was login input validation. `/auth/me` had no tests with forged, expired or tampered tokens, and logout cookie clearing was untested.
- CSRF was tested on one endpoint only.
- No CRUD or validation tests for jobs or reminders. No upload validation tests (types, size, malformed bodies, missing files). No stage-history tests.
- No tests for account deletion, profile photos, or the forgot-password/resend-verification flows.
- **Test-harness risks:**
  - The test setup wipes every table in whatever `DATABASE_URL` resolves to. A `DATABASE_URL` exported in the shell overrides `.env.test`, which would wipe the dev DB.
  - `.env` (loaded in test mode) contains a real `RESEND_API_KEY`, so any test hitting register or forgot-password would have sent real email.
- Rate limiters are in-memory per test file. Login allows 10 per 15 minutes, registration 5 per hour, and `/jobs|/documents|/reminders` share 100 per 15 minutes, which constrains how tests can be written (see helpers below).

---

## Tests added

**27 → 239 tests (212 new), 9 → 24 files.** The full suite passes in ~97 s.

| File | Tests | Covers |
|---|---:|---|
| `auth.register.test.js` | 3 | Success (email normalization, bcrypt hash, no session cookie, hashed verification token matches the emailed token), duplicate email (case/whitespace-insensitive, 409), account still created when email sending fails |
| `auth.register-validation.test.js` | 5 | No body (**regression**), invalid email, short password, long password, non-string/object password |
| `auth.session.test.js` | 18 | Login cookie attributes (HttpOnly, SameSite, Path, Max-Age, verifiable JWT), case-insensitive email, identical 401 for wrong password vs unknown email, malformed input, no body (**regression**); `/auth/me` with valid, missing, wrong-secret, expired, wrong-audience, wrong-issuer, tampered and non-numeric-subject tokens, plus a deleted user; logout clears cookies and requires auth and CSRF; end-to-end logout |
| `auth.password-reset.test.js` | 7 | Reset token stored only as a hash, new request replaces old tokens, no enumeration (same response, no email), after a reset only the new password works, weak password doesn't consume the token, invalid inputs |
| `auth.email-verification.test.js` | 4 | Resend replaces the token and emails unverified users only; same response for verified and unknown accounts; missing/non-string token |
| `auth.rate-limit.test.js` | 2 | 11th login → 429; 6th registration → 429 |
| `csrf.test.js` | 29 | Token issuance (cookie matches body, not HttpOnly, SameSite, fresh per call); missing, header-only, cookie-only, same-length and different-length mismatches; auth checked before CSRF; safe methods exempt; **every** state-changing route (12 routes) rejected with no side effects; an upload without CSRF writes no file; all 6 public auth POSTs require CSRF |
| `ownership.matrix.test.js` | 15 | User B tries 12 read/modify/delete/attach/detach/create operations against User A's job, document, reminder and stage history. Each must return 404, leak nothing, and leave A's data **and stored file** unchanged. B's list endpoints never include A's data. A keeps full access. Deleting B's account leaves A intact |
| `jobs.crud.test.js` | 38 | Create (trimming, initial stage, client-supplied `userId`/`id`/`status` ignored), 8 invalid-input cases, no body / wrong content type (**regression**), malformed JSON (400), body over 50 KB (413); list isolation; get with docs and history; 404; 5 invalid-ID forms (**regression** for out-of-range); update (trimming, date normalization, non-updatable fields ignored), 8 invalid-update cases that leave the job unchanged; delete cascades history and reminders; double delete → 404 |
| `stage-history.test.js` | 8 | Initial entry, ordered transitions, no entry for unchanged status or non-status edits, invalid status leaves history untouched, other users can't add history, injected `stageHistory` in the body is ignored, moving back to an earlier stage |
| `documents.upload.test.js` | 26 | PDF/DOC/DOCX accepted; 5 disallowed types rejected with no file or DB row left behind; over-5 MB rejected and cleaned up; just under 5 MB accepted; missing file; JSON body; wrong field name; truncated or boundary-less multipart (**regression**); path-traversal filename; unauthenticated upload writes nothing; download headers and bytes; stored file missing → 404; delete removes the file; delete tolerates an already-missing file; delete detaches from jobs; attach/detach idempotency and invalid IDs |
| `reminders.test.js` | 21 | Create with defaults and job summary, numeric-string job ID, 9 invalid-input cases (including `jobId: true` and out-of-range), nonexistent job, no body (**regression**); ordering; complete/uncomplete; only `completed` is updatable; invalid `completed` values; invalid vs missing ID; delete |
| `account.test.js` | 13 | Profile name + photo upload, photo replacement removes the old file, empty name clears it, name over 80 characters rejected **and the uploaded photo discarded**, GIF/SVG/PDF rejected, over-5 MB photo rejected, auth required; photo 404 and auth; account deletion removes the user, jobs, history, reminders, documents, tokens and stored files, and clears cookies |
| `ids.test.js` | 19 | `parseId` unit tests |
| `errorHandler.test.js` | +3 | Malformed multipart → 400; internal messages hidden behind a generic 500; delegates when headers were already sent |
| `requestLogger.test.js` | 1 | Captures real pino output and asserts that session, CSRF and authorization secrets never appear (**regression**) |

**Test infrastructure changes** (in `tests/setup.js`, `tests/helpers/*`, `vitest.config.js`):
- **DB guard:** the setup refuses to run unless the `DATABASE_URL` database name contains `test`. I checked this against a nonexistent DB name. CI's `job_application_tracker_test` passes.
- **Global email mock:** `lib/email.js` is mocked for every test file (`vi.fn`, cleared before each test), so tests can never call Resend.
- **Quiet logs:** `LOG_LEVEL` defaults to `silent` under Vitest. Set `LOG_LEVEL=info` to debug a run.
- **Helpers:**
  - `csrfAgent()` gives an anonymous agent with a CSRF token.
  - `sessionCookie(userId, opts)` mints a JWT, with options for forging bad tokens.
  - `authHeaders(userId)` returns session and CSRF headers, which avoids spending the per-file login rate limit.
  - `createLoggedInUser()` creates and logs in a user in one call.
- Removed the leftover `console.log` debug lines from `document.isolation.test.js`.
- No new binary fixtures; upload tests use in-memory buffers. Profile-photo tests delete only the files they created. The `storage/profile-photos` directory is shared with local dev and contains a tracked file, which was left alone.

---

## Bugs discovered and fixed

### 1. Session JWT and CSRF token written to logs in plain text. Severity: **High (security)**
- **Behavior:** Every `/auth/login` response logged the full `Set-Cookie: session=<JWT>` header, and every mutating request logged `X-CSRF-Token`. In production (pino JSON to stdout, so Docker logs) anyone with log access could replay a live session.
- **Cause:** pino-http serializes response headers. The redact list covered only `req.headers.cookie` and `authorization`.
- **Repro:** run any login test with `LOG_LEVEL=info` and grep for `session=`.
- **Fix:** added `res.headers["set-cookie"]` and `req.headers["x-csrf-token"]` to the redact paths (`middleware/requestLogger.js`). The regression test fails without the fix. **Consider rotating `JWT_SECRET`** if production logs have been retained or shipped anywhere; sessions are only 15 minutes, but the logged tokens were valid for that window.

### 2. Requests with no JSON body returned 500. Severity: **Medium (reliability)**
- **Behavior:** `POST /auth/login`, `POST /auth/register`, `POST/PATCH /jobs`, `POST/PATCH /reminders` with an empty body or a non-JSON content type returned 500.
- **Cause:** Express 5 leaves `req.body` **undefined** when no body parser runs; handlers dereference `req.body.x` and throw a `TypeError`.
- **Fix:** one middleware after `express.json()` sets `req.body ??= {}` (`app.js`), so existing validation returns 400. Multer still replaces `req.body` for multipart routes.

### 3. Out-of-range or non-integer IDs returned 500. Severity: **Low–Medium**
- **Behavior:** `GET /jobs/99999999999` (and the same for every ID route or reminder `jobId`) returned 500. `0`, `-5` and `1.5` returned 404, and `jobId: true` was coerced to `1`.
- **Cause:** IDs were checked only with `Number.isNaN`. Prisma/Postgres then threw `value out of range for type integer`.
- **Fix:** new `lib/ids.js` `parseId()` accepts only positive integers up to 2³¹−1 (string or number) and returns `null` otherwise. Controllers call it in place of `Number()`/`isNaN`, and invalid IDs now return 400 consistently. The client always sends numeric IDs, so it's unaffected.

### 4. Malformed multipart uploads returned 500. Severity: **Low**
- **Behavior:** a truncated multipart body, or one without a boundary, on `/documents` or `/auth/profile` returned 500.
- **Cause:** busboy reports parse errors as plain `Error`s ("Unexpected end of form" and similar), which the error handler treated as internal errors.
- **Fix:** `middleware/errorHandler.js` maps the known busboy parse messages to `400 {"error":"Malformed upload request"}`. Multer already removes partial files; a test confirms nothing is left on disk.

### 5. (Client) Logout failed after the session expired. Severity: **Medium (UX)**
- **Behavior:** sessions last 15 minutes and `/auth/logout` requires a valid session. After expiry, clicking **Log out** showed "Unable to logout" and left the user on the dashboard.
- **Fix:** `client/src/App.tsx` treats a 401 from logout as already logged out.

### Not fixed (minor)
- **Exactly 5 MB files are rejected.** busboy treats `size === fileSize` as over the limit. It's library behavior and a negligible edge; the test asserts that 5 MB − 1 byte is accepted.

---

## Security observations

### Fixed
- Session JWT and CSRF token leak in request logs (bug 1).
- The test suite could wipe a non-test database, or send real email via Resend, depending on the environment (harness guard and mock added).

### Verified OK (tests now cover these)
- Every data query is scoped by `userId`; cross-user access returns 404 across all routes, with no leakage and no side effects.
- CSRF double-submit uses a constant-time compare, and every state-changing route is protected, including public auth POSTs. Auth runs before CSRF, and both run before multer, so unauthenticated or CSRF-less uploads write nothing to disk.
- JWTs are verified with issuer and audience; forged, expired and tampered tokens are rejected.
- Uploaded files get server-generated UUID names, so a path-traversal filename can't escape storage. Downloads use `Content-Disposition: attachment`, and helmet sets `nosniff`.
- Password reset and verification tokens are stored hashed, single-use and expiring. Forgot-password and resend-verification don't reveal whether an account exists.
- Mass assignment: `userId`, `id`, `createdAt` and `stageHistory` in request bodies are ignored.
- Passwords use bcrypt with 12 rounds and a 12–128 character policy. Login returns the same 401 for unknown email vs wrong password.
- No raw SQL (`$queryRaw`) anywhere, so no injection surface found.

### Potential concerns (documented, not changed)
- **Password reset and logout don't revoke existing sessions.** JWTs are stateless for 15 minutes; a stolen or logged token stays valid until expiry, even after a reset.
- **`forgot-password` returns 500 if Resend fails**, only for existing accounts. That's a small enumeration signal plus a poor error. Registration already catches email errors; this route doesn't.
- **Upload type checks rely on the client-declared MIME type.** There's no content sniffing, and the stored extension is taken from the client filename (e.g. `x.html` declared as `application/pdf` is stored as `<uuid>.html`). Mitigated by attachment downloads and `nosniff`, but consider magic-byte checks.
- **No length limits** on job text fields, reminder titles or document display names (only the 50 KB JSON body cap).
- **`jobUrl` isn't validated as http(s).** React 19.2 blocks `javascript:` URLs in `href`, and data is per-user only, so the risk is low.
- **Email verification isn't enforced at login.** An existing test calls this intentional ("for now"), so it's a product decision.
- **Registration returns 409 for existing emails**, which allows account enumeration (common trade-off; rate-limited to 5 per hour).

### Requires human review (production-affecting, intentionally not changed)
1. **No `server/.dockerignore`.** `COPY . .` copies `server/.env` (real `JWT_SECRET`, `RESEND_API_KEY`, `SENTRY_DSN`), `.env.test`, `cookies.txt`, `CVSAMPLE.pdf`, the personal photo, and any host `node_modules`/`storage` into the image. If the image is built on a machine that has a `.env`, the secrets end up in the image layers. A suggested starting point:
   ```
   node_modules
   .env
   .env.*
   !.env.example
   cookies.txt
   CVSAMPLE.pdf
   *.jpg
   storage/documents/*
   storage/profile-photos/*
   tests
   uploads
   .agents
   .claude
   .windsurf
   ```
   Check that the image still builds, and that the storage volume mounts still work, before deploying.
2. **Sentry probably never receives Express errors.** `index.js` calls `Sentry.setupExpressErrorHandler(app)` *after* `app.js` has registered `errorHandler`. That handler always sends a response and doesn't call `next(err)`, so Sentry's middleware is never reached. Consider registering Sentry's handler in `app.js` before `notFound`/`errorHandler`, or calling `Sentry.captureException` for 5xx inside `errorHandler`. I couldn't verify this without a Sentry project, so it's not changed.
3. **`trust proxy` is set to `1`.** Production traffic goes Vercel rewrite → Tailscale Funnel → (Docker) API, which may be more than one proxy hop. If so, `req.ip` may be a proxy address, so every user shares one rate-limit bucket (10 logins per 15 minutes globally). Or, depending on the chain, clients may be able to spoof `X-Forwarded-For`. Check what `req.ip` looks like in production logs.
4. **Production cookies use `SameSite=None`.** Since the client now calls the API same-origin through the `/api` proxy, `Lax` may be enough and would add CSRF defense in depth. That's a production cookie change, so please verify on Safari first; the proxy was introduced for Safari.
5. **Tracked files that probably shouldn't be in git:**
   - `server/cookies.txt`: a curl cookie jar with a localhost session JWT from August. It's long expired, but it's still a token.
   - `server/Photo_Zitouni_Haitam_N0031055649.jpg`: a personal photo.
   - `server/storage/profile-photos/0d0ac3ed-….png`: a user upload.
   - `server/server.js`: an empty file.

   Removing them is your call, and they remain in git history either way.
6. **The API rate limit (100 requests per 15 minutes per IP)** is shared across `/jobs`, `/documents` and `/reminders`. An active user (or several users behind one NAT, or behind the proxy issue in item 3) may hit 429s during normal use.

---

## Files changed

| File | Change |
|---|---|
| `server/app.js` | Default `req.body` to `{}` (bug 2) |
| `server/lib/ids.js` (new) | `parseId()` helper (bug 3) |
| `server/controllers/{jobs,documents,reminders}.controller.js` | Use `parseId` for route and body IDs (bug 3). No other logic changed |
| `server/middleware/errorHandler.js` | Map busboy parse errors to 400 (bug 4) |
| `server/middleware/requestLogger.js` | Redact `Set-Cookie` and `X-CSRF-Token` (bug 1) |
| `server/lib/logger.js` | Honor `LOG_LEVEL` (defaults to `info`, so production behavior is unchanged) |
| `server/vitest.config.js` | Default `LOG_LEVEL=silent` for tests |
| `server/tests/setup.js` | Test-DB guard, global email mock, mock reset |
| `server/tests/helpers/auth.js`, `users.js` | New helpers (see above) |
| `server/tests/**` | 13 new test files and additions to `errorHandler.test.js`; removed debug logs from `document.isolation.test.js` |
| `client/src/App.tsx` | Treat 401 on logout as logged out (bug 5) |

---

## Verification (final)

| Check | Result |
|---|---|
| `cd server && npx vitest run` | **24 files, 239 tests passed** (96.7 s) |
| `cd server && node --check` (all source) | Clean |
| `cd server && npx prisma validate` | Valid |
| `cd client && npm run lint` | Clean |
| `cd client && npm run build` (tsc + vite) | Clean, no warnings |
| Local dev DB `job_tracker` | Untouched (same row count before and after) |

**Note on local runs:** two full-suite runs stalled for 15–30 minutes. `pmset` shows the Mac entering "Dark Wake Thermal Emergency" / idle sleep mid-run (the lid was probably closed); one run failed with Vitest's "Timeout waiting for worker to respond". Neither was a code problem. Runs with the machine awake complete in about 97 s. CI is unaffected, and the CI workflow needs no changes: its DB name contains `test`, and the email mock covers its dummy key.

---

## Git commits (on `chore/reliability-test-pass`)

```
0dad359 fix(client): let users log out after their session expires
b0e8557 test: verify login and registration rate limits
c1b6a19 test: cover password reset and email verification flows
c092753 test: cover profile updates, photo uploads and account deletion
f52212e test: add reminder CRUD and validation coverage
fd24b19 fix: redact session cookie and CSRF token from request logs
54dda36 test: add document upload validation coverage
55b6d3a fix: return 400 for malformed multipart uploads instead of 500
809f2ff test: verify cross-user resource isolation across every route
2f4a279 test: cover stage history transitions and integrity
4ac8a38 test: verify CSRF enforcement across all state-changing endpoints
7dddaa4 test: add application CRUD and validation coverage
9ed05b7 test: expand authentication coverage
4e84541 fix: reject out-of-range and non-integer IDs with 400
e375dda fix: return 400 instead of 500 when a request has no JSON body
f1f6954 test: guard test DB, mock outbound email, and quiet test logs
```
(plus the commit adding this report)

**Not pushed.** You allowed pushing the branch as a backup, but `client/vercel.json` suggests the repo is connected to Vercel, which typically builds a preview deployment for every pushed branch. That would amount to deploying the branch, so I left it local. Push with `git push -u origin chore/reliability-test-pass` once you've confirmed Vercel preview deployments are off or acceptable.

---

## Recommended next steps

### High
1. Add a `server/.dockerignore` (see Security → human review 1) and confirm the current production image contains no `.env`.
2. Once the log-redaction fix is deployed, decide whether to rotate `JWT_SECRET` and purge old API logs.
3. Fix Sentry error capture ordering (human review 2).
4. Verify `trust proxy` against the real proxy chain (human review 3). It affects both rate limiting and IP logging.
5. **Session-expiry UX:** sessions last 15 minutes with no refresh, and the client has no global 401 handling, so after 15 minutes every action fails with a generic error until reload. Options: a global 401 handler in `apiFetch` that returns to the login screen (small), and/or a longer session or refresh token (product decision).

### Medium
6. Catch Resend failures in `forgot-password` and return the generic response (as `register` does).
7. Revoke sessions on password reset and logout (e.g. a `tokenVersion` on `User`, checked in `requireAuth`). This needs a migration.
8. Content-sniff uploads (magic bytes) and derive the stored extension from the validated MIME type.
9. Revisit the shared 100-per-15-minutes API limit.
10. Add ESLint to `server/` and run client lint/build plus server tests in CI. CI currently runs only server tests.
11. Remove the tracked `cookies.txt`, the personal photo, the uploaded PNG and the empty `server.js`.

### Low
12. Add length limits to job, reminder and document text fields, and restrict `jobUrl` to http(s).
13. Make the storage root configurable. Tests and local dev share `server/storage/documents`, and the test setup empties it on every run, which deletes locally uploaded dev files.
14. `VerifyEmailScreen` fires its POST twice under React StrictMode (dev only). The second call can overwrite the success message with "invalid or expired". A `useRef` guard fixes it.
15. `SettingsPanel` calls `response.json()` before checking `response.ok`, so a non-JSON proxy error (e.g. an HTML 413 or 502) shows a JSON parse error instead of a friendly message.
16. A small `apiFetch` detail: it retries any 403 as a CSRF failure. That's fine today because only CSRF returns 403, but it will need revisiting if 403 is ever used for authorization.
