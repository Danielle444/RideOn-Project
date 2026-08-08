# SPEC-SESSION PROMPT — Health-Certificate Upload: Fail-Fast Config + Honest Errors + Upload Timeout

> **Stage:** This is a Stage-1 (party-mode) hand-off. You are a `bmad-spec` session. Your job is to
> distill this into `SPEC.md` (five-field kernel) + companions **and a required companion
> `implementation-prompt.md`** that a colleague runs cold. Do **not** implement code yourself.
> Load `ride-on-system-knowledge` and `ride-on-live-db-ops` before you begin.

---

## Why (the problem)

Uploading a health certificate (תעודת בריאות) from the **mobile admin** screen fails with the
generic server error **"שגיאה בהעלאת תעודת הבריאות"** for the tester (role: אדמין חווה), on every
horse tried. Root cause was traced during party mode:

- The client posts `multipart/form-data` to `POST /Horses/health-certificates/upload`.
  The server authorizes, uploads the PDF to Supabase Storage, then saves via `usp_savehealthcertificate`.
- The 500 the tester sees is the **outer `catch (Exception)`** in `HorsesController.UploadHealthCertificate`
  — which means **authorization passed** (a denial returns `403` with different text) and the failure is
  *after* the permission check.
- The save proc is **live and correct** (verified: `usp_savehealthcertificate(p_horseid, p_competitionid,
  p_hcpath, p_hcuploaddate)` — arg order matches the DAL dictionary). The `health-certificates` bucket
  **exists and is public** (verified live). **Zero objects have ever been uploaded** — the feature has
  never once succeeded in production.
- The only path that throws exactly this 500 under those conditions is `UploadPdfToSupabaseStorage`
  throwing **before any HTTP call to Supabase**, because the Supabase config is absent:
  ```csharp
  if (string.IsNullOrWhiteSpace(supabaseUrl))    throw new Exception("Missing Supabase URL configuration");
  if (string.IsNullOrWhiteSpace(serviceRoleKey)) throw new Exception("Missing Supabase service role key configuration");
  ```
- `RideOnServer/appsettings.json` is a 149-byte skeleton (Logging + AllowedHosts only) — **no `Supabase`,
  `ConnectionStrings`, or `Jwt` section.** All of those come from **environment variables on the Render
  deployment**. Login and horse-list reads work on the `rideon-project-ad4g` (mobile) service, so its
  `ConnectionStrings__` and `Jwt__` vars are set; the `Supabase__` trio was almost certainly never added.

**The actual unblock is an OPS action, NOT this spec:** Oren sets `Supabase__Url`,
`Supabase__ServiceRoleKey`, (optionally `Supabase__HealthCertificatesBucket`) on the `-ad4g` Render
service. That is explicitly **out of scope** for the colleague — see Non-goals.

**Why this spec exists anyway:** a missing required secret silently 500-ing on a user's first upload —
months after deploy, with the real reason buried in a `Console.WriteLine` nobody reads — is the defect
worth fixing in code. This spec hardens the class of bug so it can never hide this way again.

## Locked capabilities / decisions (from the party — do not re-litigate)

The colleague implementation must deliver **three tracks in ONE PR**:

1. **CAP-1 — Startup config validation (fail-fast), backend.**
   On boot, validate that required Supabase config (`Supabase:Url`, `Supabase:ServiceRoleKey`) is present.
   - **Decision (locked):** hard-fail the startup in **Production** (`app.Environment.IsProduction()`), so a
     deploy missing the secret never goes green. In non-Production, emit a **loud warning** and let the app
     start (so a laptop without Supabase config can still run the rest of the API).
   - Spec should decide whether to extend the same fail-fast to other already-required secrets
     (`ConnectionStrings:DefaultConnection`, `Jwt:Key`) — **leaning: yes, same Production gate**, since
     they're equally fatal-if-missing, but keep it a small, readable check. `Program.cs` reads config
     directly via `builder.Configuration["..."]` (no options pattern today, 88 lines) — match that style.

2. **CAP-2 — Honest error surfacing, backend.**
   The upload endpoint's generic `catch (Exception) → 500 "שגיאה בהעלאת תעודת הבריאות"` hides whether the
   cause was missing-config vs Supabase-reject vs DB-error.
   - Keep the **user-facing Hebrew message generic** (no internal detail leaks to the client — security rule).
   - Make the cause **diagnosable server-side**: distinguish the failure modes in the log (structured/clear),
     and consider a distinct status/shape only where it's genuinely safe. Spec decides the exact taxonomy.
   - Do **not** swallow: the current `Console.WriteLine` + generic return is the anti-pattern to replace.

3. **CAP-3 — Raise mobile upload timeout, frontend (mobile).**
   The mobile axios instance has a **global `timeout: 8000`** (`axiosInstance.js:14`). A 20MB PDF over farm
   wifi to a cold Render box can exceed 8s.
   - **Decision (locked):** give the **upload call its own longer timeout** (e.g. 60s) — do **NOT** raise the
     global instance timeout. Apply it in `uploadHealthCertificateFile` (per-request `{ timeout: 60000 }`),
     leaving all other calls at 8s.

## Constraints

- **Tech boundaries per track:** CAP-1/CAP-2 are `.cs` only (RideOnServer). CAP-3 is mobile JS only. No DB
  writes, no stored-proc changes, no new endpoints. The bucket, proc, and auth logic are all healthy — do
  not touch them.
- **Secrets never in committed files.** `appsettings.json` stays clean; config stays env-var-injected. The
  fix is *validation that config is present*, not *adding the config to the repo*.
- **After backend changes:** `dotnet build` in `RideOnServer/`, then grep for other call sites that read
  Supabase config or swallow exceptions the same way (there may be sibling upload paths — `delivery-photos`,
  `horse-documents` buckets exist too; spec decides whether CAP-1/CAP-2 should cover them or stay scoped to
  health certs — **leaning: validate all required Supabase config once at startup; keep CAP-2 scoped to the
  health-cert endpoint** unless the sibling paths are trivially the same shape).
- **Mobile has no dotnet/web build gate.** Verification for CAP-3 is limited (typically no `node_modules` in
  the tree); the colleague states this honestly rather than claiming a green build.

## Non-goals (explicitly out of scope)

- **Setting the Render environment variables** — that is Oren's ops action and the real unblock; the
  colleague must NOT attempt it and must NOT put secrets anywhere in the repo.
- Redesigning the upload flow, the Supabase upload mechanism, or the authorization branches
  (`EnsureCanUploadHealthCertificate` / `ResolveHealthCertificateUploadBranch`) — all verified correct.
- The web secretary health-certificate page, unless a shared helper makes CAP-2 trivially cover it.
- Any change to the save proc, the bucket, or DB.

## Success signal

- A deploy of RideOnServer **missing `Supabase__Url` / `Supabase__ServiceRoleKey` fails fast at startup**
  in Production with a clear message — instead of booting and 500-ing on the first upload.
- When an upload fails, the **server log unambiguously names the cause** (config-missing vs storage-reject
  vs DB error); the client still shows a safe generic Hebrew message.
- The mobile health-certificate upload uses a **≥60s per-request timeout**, so large PDFs / cold Render
  boxes no longer abort at 8s while other API calls keep the 8s default.
- Once Oren sets the env vars, an admin/secretary upload lands an object in the `health-certificates`
  bucket (currently 0) and `usp_savehealthcertificate` records the row.

## Verified references (read these before speccing; mark verified vs inferred)

- Mobile upload service: `RideOnClient/rideon-client/mobile/src/services/horsesService.js` →
  `uploadHealthCertificateFile` (~L50–73), `axios.post("/Horses/health-certificates/upload", formData)`.
- Mobile axios instance (global 8s): `RideOnClient/rideon-client/mobile/src/services/axiosInstance.js:14`.
- Mobile hook (error alert surfacing): `RideOnClient/rideon-client/mobile/src/hooks/useAdminCompetitionHealthCertificates.js`.
- Server endpoint: `RideOnServer/Controllers/HorsesController.cs` →
  `UploadHealthCertificate` (L242–322), `UploadPdfToSupabaseStorage` (L555–634, config reads L561–573,
  throws L567/L572, generic 500 L317–321).
- Startup wiring: `RideOnServer/Program.cs` (88 lines; `builder.Configuration["Jwt:..."]` pattern, `AddHttpClient` L16, `builder.Build()` L68).
- Committed config skeleton (no Supabase section): `RideOnServer/appsettings.json`.
- **Live-verified:** proc `usp_savehealthcertificate(p_horseid, p_competitionid, p_hcpath, p_hcuploaddate)`
  exists, arg order matches DAL. Buckets `health-certificates` (public), `delivery-photos`, `horse-documents`
  all exist. `health-certificates` object count = 0.
- **Cannot verify from Claude:** the actual env-var values / logs on the Render `-ad4g` service. Oren pulls
  the `Error in UploadHealthCertificate: ...` log line to confirm config-missing vs storage-reject before
  the PR merges.

---

## REQUIRED COMPANION OUTPUT (do not skip)

Your spec session **must** produce `implementation-prompt.md` — the self-contained, cold-start goal prompt
the colleague runs with no access to this conversation. It must embed the **Colleague execution rules**
below verbatim, the three CAPs, the constraints/non-goals/success signal, and the verified file references.

### Colleague execution rules (embed verbatim in implementation-prompt.md)

- New feature branch off `main`; never commit to `main`; never merge/integrate or delete branches without
  Oren's explicit approval; before any integration confirm no other session is active in the tree.
- Push everything to the **public** remote (`git push -u origin <branch>`) and open a PR against `main` —
  nothing left only local.
- **Investigate first:** read the current file + the endpoint/proc it consumes before editing; mark verified
  vs inferred; flag path/spec corrections instead of silently fixing.
- Respect the stated tech boundary per track (CAP-1/2 = `.cs` only; CAP-3 = mobile JS only). If work seems to
  need backend/DB beyond this, stop and raise it.
- After backend changes: `dotnet build` in `RideOnServer/`, then grep for call paths that read Supabase config
  or swallow exceptions the same way. No DB writes in this spec.
- Never put secrets in committed files; `appsettings.json` stays clean.
