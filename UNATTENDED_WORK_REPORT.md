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
1. ~~**No `server/.dockerignore`.**~~ **Addressed in the follow-up pass**; see [Follow-up: repository hygiene](#follow-up-repository-hygiene).
2. **Sentry probably never receives Express errors.** See [Sentry and `trust proxy`: current state and what's needed](#sentry-and-trust-proxy-current-state-and-whats-needed).
3. **`trust proxy` is set to `1`.** See [Sentry and `trust proxy`: current state and what's needed](#sentry-and-trust-proxy-current-state-and-whats-needed).
4. **Production cookies use `SameSite=None`.** Since the client now calls the API same-origin through the `/api` proxy, `Lax` may be enough and would add CSRF defense in depth. That's a production cookie change, so please verify on Safari first; the proxy was introduced for Safari.
5. ~~**Tracked files that probably shouldn't be in git.**~~ **Untracked in the follow-up pass** (they remain in history); see [Follow-up: repository hygiene](#follow-up-repository-hygiene).
6. **The API rate limit (100 requests per 15 minutes per IP)** is shared across `/jobs`, `/documents` and `/reminders`. An active user (or several users behind one NAT, or behind the proxy issue in item 3) may hit 429s during normal use.

---

## Follow-up: repository hygiene

This second pass ran on the same branch. Nothing was merged, pushed or deployed, no Git history was rewritten, and no credentials were rotated.

### `server/.dockerignore` (new)
The compose build context is `./server`, and the Dockerfile runs `COPY . .` with no ignore file. The new `server/.dockerignore` uses a **denylist**, so a source directory added later can't silently go missing from the image. It excludes:
- `.env` and `.env.*` (at any depth)
- cookie jars
- key and certificate files (`*.pem`, `*.key`, `*.p12`)
- `node_modules` and `generated/`
- runtime `storage/` and `uploads/` (production mounts `storage` as a volume)
- `tests/`, `vitest.config.js`, `coverage/` and logs
- root-level images and PDFs
- agent, editor and OS files
- `.git`

**Verification.** Docker isn't installed on this machine (no docker, podman, colima, nerdctl or buildah), so **no image was built**. Instead:
1. **Exact build context.** Computed with `@balena/dockerignore`, a JS implementation of Docker's matching rules, installed only in a scratch directory. The context is 46 files: `package.json`, `package-lock.json`, `prisma.config.ts`, `prisma/` (schema plus 15 migrations), `app.js`, `index.js`, `instrument.js`, `controllers/`, `lib/`, `middleware/`, `routes/`, and the empty `server.js`.
2. **Exclusions asserted.** `.env`, `.env.test`, `.env.example`, `cookies.txt`, the personal photo, `CVSAMPLE.pdf`, the profile-photo upload, the test fixture, `.DS_Store`, `node_modules` (0 files) and `generated/` (0 files) are all excluded. A control run with an empty ignore file shows `.env`, `.env.test`, `cookies.txt` and the photo **would** have been included.
3. **Nothing needed was excluded.** I copied only the context files into a scratch directory and replayed the Dockerfile steps: `npm ci` (including its `prisma generate` postinstall), then `npx prisma generate`. Both succeeded. The API then started with dummy local-only config and no database (`node --import ./instrument.js index.js` on port 3999): `/health` returned 200, unauthenticated `/jobs` returned 401, and bcrypt's native module worked. The scratch copy was deleted afterwards.
4. **Not verified:** a real `docker build` on the Linux base image. Please run `docker build ./server` once (it isn't a deploy), then check with `docker run --rm <image> ls -la /app` that no `.env` is present.

### Tracked files investigated
The GitHub repo `hzitouniATSSU/job-application-tracker` is **public** (read-only `gh repo view`). The `origin/main` ref was last fetched at `a5e23d4`, which is identical to local `main`.

| File | Tracked (before) | On `main` | Local history | In `origin/main` history | Sensitive? | Action |
|---|---|---|---|---|---|---|
| `server/cookies.txt` | yes | yes | added in `dcdec36` (2026-08-11), one version | **yes (public)** | **Yes, moderately.** A curl cookie jar holding a `session` JWT for `localhost`, with claims `sub`, `iat`, `exp`, `aud` and `iss`. **Expired 2026-08-06.** Its signature **verifies with the `JWT_SECRET` in the local `server/.env`** (not the `.env.test` secret). That secret is 64 characters across 4 character classes, so brute-forcing it offline from this token isn't practical. | Untracked and ignored |
| `server/Photo_Zitouni_Haitam_N0031055649.jpg` | yes | yes | added in `8e2fee3` (2026-08-01), one version | **yes (public)** | **Yes (personal data).** A 600×600 personal photo whose filename contains a full name and an ID-like number. No EXIF, GPS or camera metadata. I didn't open the image. | Untracked and ignored (`/*.jpg` at the server root) |
| `server/storage/profile-photos/0d0ac3ed-….png` | yes | yes | added in `c185823` (2026-08-15), one version | **yes (public)** | **No.** A Canva-made "VAR CHECK OVER" football logo (500×500, no location metadata), uploaded while testing profile photos. It's also visible in the public settings screenshot. | Untracked; `storage/profile-photos/*` ignored |

Local copies of all three remain on disk. **Untracking doesn't remove them from history or from GitHub.** Anyone who cloned or viewed the public repo can still get them from commits `8e2fee3`, `dcdec36` and `c185823`.

### Other accidental tracking: scan results
Local inspection only, with values redacted:
- **Filenames** (tracked, and ever added on any local ref): no `.env` file has ever been committed; only `client/.env.example` and `server/.env.example`. No `*.pem`, `*.key`, `id_rsa`, `*.p12`, `*.log`, `*.db` or `*.sqlite` files, and no tracked `.DS_Store`.
- **Content patterns, current tree and full history:** I searched for Resend keys, private keys, AWS keys, GitHub/Slack/OpenAI-style tokens, JWTs, Sentry DSNs, database URLs with passwords, and `SECRET=`/`PASSWORD=`/`TOKEN=` assignments. The only real token is the cookie JWT above. Every other match is a placeholder or throwaway value:
  - `.env.example`: `replace_with_…`
  - README: `USERNAME:PASSWORD`
  - docker-compose: `${POSTGRES_PASSWORD}` and other `${VAR}` references
  - CI: `postgres`/`postgres`, `github-actions-test-secret`, `re_test_dummy_key`
  - Prisma skill docs: `USER:PASSWORD`
- **Actual local secret values:** I checked every value in `server/.env` and `server/.env.test` against the full text of every commit on every local ref: `JWT_SECRET`, `RESEND_API_KEY`, `SENTRY_DSN` and its key, `DATABASE_URL`, `EMAIL_FROM`, and the test DB URL and secret. **None appear in history.** The only match was `CLIENT_URL`, a public localhost URL.
- **Personal files:** `tests/fixtures/private_test.pdf` is a two-page cocktail recipe sheet. It contains no contact details; only its PDF metadata lists you as author. It's needed by the existing tests, so I kept it. The `docs/screenshots/*` images use test accounts (`Test User`, `testuser1@gmail.com`); I spot-checked the settings screenshot.
- **Other:** `server/server.js` is an empty tracked file. It's harmless and I left it.

### Credential rotation: recommendation (not performed)
- **Session JWT signing secret:** **recommended if production shares the local `server/.env` value.** The public `cookies.txt` token was signed with the local secret. The secret itself was never committed, and it's strong, so the practical risk is low. But a published token gives anyone material for an offline guessing attempt, and it proves which secret signed it. If production uses a different `JWT_SECRET`, local rotation is optional. The earlier log-leak finding (fixed in `fd24b19`) is a separate reason to rotate the **production** secret if production logs were retained.
- **`RESEND_API_KEY` and `SENTRY_DSN`:** no evidence of exposure in Git. Rotation is only needed if an image was ever built from a context that contained `server/.env`; before this pass, any build on a machine with that file would have baked it in. Check any existing images or registries.
- **Database password:** not exposed in Git. The same image caveat applies if the production `.env` ever sat in the build directory.
- **Removing the files from history** (`git filter-repo` plus a force-push, and asking GitHub Support to purge cached views) is **your decision**. It's most relevant for the personal photo. It rewrites public history and invalidates existing clones.

## Sentry and `trust proxy`: current state and what's needed

Neither configuration was changed.

### Sentry error capture
- **Current implementation:**
  - `npm start` runs `node --import ./instrument.js index.js`, and `instrument.js` calls `Sentry.init(...)` with `sendDefaultPii: false` and header/body scrubbing.
  - `index.js` imports `app.js`, which has already registered `notFound` and then `errorHandler` as its last middleware. `index.js` then calls `Sentry.setupExpressErrorHandler(app)`, which appends Sentry's error middleware **after** `errorHandler`.
  - Nothing in the codebase calls `Sentry.captureException`.
  - `middleware/sentryUser.js` exists but is never mounted.
- **Why this may be a problem:** Express runs error middleware in registration order. `errorHandler` always sends the response, and calls `next(err)` only when headers were already sent, so Sentry's middleware is almost never reached. Handled 500s (for example database failures) probably never reach Sentry, although `uncaughtException` handling and performance tracing may still work. Separately, errors never carry a user ID, because `sentryUser` is unused.
- **What's needed before changing it:**
  1. The Sentry project's issue list: have any Express request errors ever arrived since the `45a54d0` change? That confirms or refutes the theory.
  2. Whether `SENTRY_DSN` is set in the production environment.
  3. A decision on what to report: probably 5xx only, not 4xx validation errors. Also whether to attach the numeric user ID; `sentryUser` would do that after `requireAuth`.
  4. A safe way to check the change: a staging DSN, or a local DSN run that triggers a forced 500.

  The likely fix is small: register `Sentry.setupExpressErrorHandler(app)` in `app.js` just before `notFound`/`errorHandler`, or call `Sentry.captureException(error)` inside `errorHandler` for status ≥ 500. Make sure tests still run without a DSN.

### `trust proxy`
- **Current implementation:** `app.set("trust proxy", 1)` in `app.js`. The `express-rate-limit` v8 limiters key on `req.ip`: login 10 and registration 5 per window, email actions 5, token actions 10, and a shared 100 per 15 minutes for `/jobs`, `/documents` and `/reminders`. The documented production path is: browser → Vercel rewrite (`/api/*` → `https://homelab-node-01…ts.net/*`) → Tailscale Funnel → Docker port `127.0.0.1:3000` → Express.
- **Why this may be a problem:** with `trust proxy = 1`, Express takes `req.ip` from the **last** `X-Forwarded-For` entry.
  - **Likely case (unverified):** Vercel sets the client IP in `X-Forwarded-For`, and Funnel appends Vercel's egress IP. Then `req.ip` is a Vercel address, so users share rate-limit buckets. One person's failed logins could lock everyone out, and logged IPs would be meaningless.
  - **Raising it to `2` isn't automatically correct either:** the Funnel URL is publicly reachable **without** going through Vercel. A client calling it directly could send a forged `X-Forwarded-For` and pick its own `req.ip`, bypassing rate limits.
  - The right value depends on the exact headers each hop sets. It might instead be a trusted-header approach (e.g. `x-vercel-forwarded-for`, or `x-real-ip` validated with a shared secret), or blocking direct Funnel access.
- **What's needed before changing it:**
  1. For one request **via Vercel** and one **straight to the Funnel URL**: the raw `X-Forwarded-For`, `X-Real-IP` and any `x-vercel-*` headers, plus `req.socket.remoteAddress` and the current `req.ip`. Get these from a temporary debug log on a non-production instance, or from existing production logs if you're comfortable.
  2. Whether direct Funnel access should be allowed at all.
  3. Whether Docker or anything else adds another hop.

  With that, choose between a hop count, a list of trusted proxy addresses, or a custom `keyGenerator`, and add a test for the chosen behavior.

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
| `server/.dockerignore` (new, follow-up) | Keeps secrets, dependencies, runtime data, tests, personal and tooling files out of the Docker build context |
| `server/.gitignore` (follow-up) | Ignore cookie jars, `storage/profile-photos/*`, and images/PDFs at the server root |
| `server/cookies.txt`, the personal photo, `server/storage/profile-photos/0d0ac3ed-….png` (follow-up) | Removed from tracking (`git rm --cached`); local copies kept; still in history |

---

## Verification (final)

Rerun after the follow-up hygiene pass:

| Check | Result |
|---|---|
| `cd server && npx vitest run` | **24 files, 239 tests passed** (139.8 s) |
| `cd server && node --check` (27 tracked source files) | Clean |
| `cd server && npx prisma validate` | Valid |
| `cd client && npm run lint` | Clean |
| `cd client && npm run build` (tsc + vite) | Clean, no warnings |
| Docker build context (`@balena/dockerignore`) | 46 files, no secrets or local artifacts; replayed Dockerfile install and boot succeeded (see follow-up section). No real `docker build`, because Docker isn't installed |
| Local dev DB `job_tracker` | Untouched (19 users before and after) |

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

Follow-up hygiene pass:

```
059c31e chore: add server .dockerignore to keep secrets out of the image
47c80a2 chore: stop tracking local cookie jar, personal photo and uploaded image
d098245 docs: add unattended reliability work report
```
(plus the commit adding the follow-up report sections)

**Not pushed.** You allowed pushing the branch as a backup, but `client/vercel.json` suggests the repo is connected to Vercel, which typically builds a preview deployment for every pushed branch. That would amount to deploying the branch, so I left it local. Push with `git push -u origin chore/reliability-test-pass` once you've confirmed Vercel preview deployments are off or acceptable.

---

## Recommended next steps

### High
1. ~~Add a `server/.dockerignore`~~ (done). Run a real `docker build ./server` to confirm, and **check any previously built production image or registry for `/app/.env`**. If one contains it, rotate the secrets it holds.
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
11. ~~Remove the tracked `cookies.txt`, personal photo and uploaded PNG~~ (untracked). Decide whether to purge them from public history (`git filter-repo` plus a force-push, a human decision). The empty `server.js` remains.

### Low
12. Add length limits to job, reminder and document text fields, and restrict `jobUrl` to http(s).
13. Make the storage root configurable. Tests and local dev share `server/storage/documents`, and the test setup empties it on every run, which deletes locally uploaded dev files.
14. `VerifyEmailScreen` fires its POST twice under React StrictMode (dev only). The second call can overwrite the success message with "invalid or expired". A `useRef` guard fixes it.
15. `SettingsPanel` calls `response.json()` before checking `response.ok`, so a non-JSON proxy error (e.g. an HTML 413 or 502) shows a JSON parse error instead of a friendly message.
16. A small `apiFetch` detail: it retries any 403 as a CSRF failure. That's fine today because only CSRF returns 403, but it will need revisiting if 403 is ever used for authorization.
