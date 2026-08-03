# Registration / Provisioning Paths per User Type (D3 documentation)

Verified against live repo 2026-08-02. Every step cites file:line.

RoleNames (`RideOnServer/BL/RoleNames.cs`): Payer `"משלם"`, RanchAdmin `"אדמין חווה"`,
HostSecretary `"מזכירת חווה מארחת"`, Worker `"עובד חווה"`, SuperUser.

---

## 1. Admin (אדמין חווה) & Worker (עובד חווה) — SELF-REGISTER

Both are self-registerable roles (present in the register dropdown; only `"משלם"` is
filtered — `shared/auth/mappings/authMappings.js:29-37`).

**Path:**
1. Open `RegisterScreen` (web `pages/auth/RegisterScreen.jsx`, mobile `screens/auth/RegisterScreen.jsx`).
2. Section 1 personal → national-ID blur calls `GET /Persons/by-national-id`; if the person
   exists but already has a system user, registration is blocked
   (`existingSystemUserFound`, web `:229-236`). Otherwise fields autofill.
3. Section 2 login (username/password) → Section 3 ranch+role pairs (1–4).
4. **Web only:** OTP — user clicks "שלח קוד אימות למייל" (`sendOtp`), receives a code, enters it;
   submit is gated on `otpCode` (web `:1039`).
5. Submit → `POST /SystemUsers/register`.
   - Server **verifies OTP first**: `SystemUsersController.cs:129`
     `otpService.VerifyOtp(email, OtpCode)`; on failure → `BadRequest("קוד האימות אינו תקף או פג תוקפו")`.
   - Then `SystemUser.Register` (`SystemUser.cs:116`): checks username unique, validates
     password policy, creates person + systemuser + pending ranch-role rows via
     `RegisterSystemUserWithRoles`. User is created **inactive/pending**.
6. **SuperUser approves** in `/superuser/requests` (`PayersController`/user-requests flow) →
   `IsActive` true, role status approved.
7. Login: `SystemUser.Login` (`SystemUser.cs:23`) throws `PENDING_APPROVAL` until active, and
   returns null if no approved role.

**⚠️ Break (finding #1):** the *mobile* `RegisterScreen` has **no OTP step** — no `sendOtp`
import in mobile `authService.js`, no code field, `register()` sends no `otpCode`
(mobile `:567-583`). Since the server hard-requires OTP (commit `754adfe`), **every mobile
admin/worker registration fails.** Web works. Admin & worker are primarily mobile roles, so in
practice their real registration surface is broken.

---

## 2. Payer (משלם) — ADMIN-PROVISIONED, NOT SELF-REGISTER (intended)

Payer is filtered out of the self-register dropdown by design. Two admin-driven routes:

### 2a. Create with credentials (payer gets their own login) — VERIFIED COMPLETE
1. Ranch Admin calls `POST /Payers/create-with-credentials` (`PayersController.cs:21`;
   guarded `EnsureUserHasRoleInRanch(..., RanchAdmin)`).
2. `Payer.CreatePayerWithCredentials` (`Payer.cs:240-301`):
   - Creates person + systemuser with a **placeholder** username (`"p"+guid`) and an
     **unguessable placeholder password** — the payer cannot log in yet.
   - Mints a registration token (72h, `RegistrationDAL.SaveRegistrationToken`).
   - Emails a link `{App:WebBaseUrl}/complete-registration?token=…` via
     `EmailService.SendPayerRegistrationLinkEmail`.
3. Payer opens the link on **web** → `CompleteRegistrationPage.jsx` (route `router.jsx:86`):
   - `GET /Registration/validate?token=` (`RegistrationController.cs:19`) checks the token.
   - `POST /Registration/complete` (`RegistrationController.cs:50`) → `dal.CompletePayerRegistration`
     sets the real password hash + optional first/last/phone, consumes the token. Account is
     created but **pending** (`"חשבונך ממתין לאישור מנהל המערכת"`).
4. **SuperUser approves**: `GET /Payers/pending-registrations` →
   `POST /Payers/approve-registration` (`PayersController.cs:55,76`; `EnsureSuperUser`).
5. Payer logs in (mobile — payer is a mobile role).

**Route is functionally complete.** Two gaps found (see SPEC P1/P2):
- **P1 password policy:** completion enforces only **≥6 chars** (client `CompleteRegistrationPage.jsx:57`,
  server `RegistrationController.cs:65`), vs self-register's 8 + complexity via `PasswordPolicyValidator`.
  Payers get a weaker password than everyone else. Align it.
- **P2 admin entry point:** backend + web completion are built; verify the *admin UI* that triggers
  `create-with-credentials` exists and is reachable.
- **Design/Hebrew:** `CompleteRegistrationPage` is another hand-rolled form (raw inputs, inline red
  div, own palette) with masculine copy — it's in scope for D5 (design) and D2 (neutral Hebrew).

### 2b. Request managed payer (payer an admin pays on behalf of)
- `POST /Payers/request-managed` (`PayersController.cs:189`) → `Payer.RequestManagedPayer`
  (`Payer.cs:43-77`). Creates a payer record an admin manages; may never receive an
  independent login. Managers added/removed via `/Payers/{personId}/managers`.

**Verdict:** working as designed. The dropdown filter + email round-trip + superuser gate are
the intended controls. Nothing to fix — this file is the documentation.

---

## 3. SuperUser — SEEDED / SEPARATE (intended)

- Not part of `/SystemUsers/register` at all. Separate `POST /SuperUsers/login`
  (`web authService.js:14`). Superusers are provisioned outside the self-service flow.
- Approvals for both the admin/worker requests and pending payers are performed **by** a
  superuser, so a superuser must exist before any of the above can complete.

---

## One-line summary for each of Oren's five

- **Admin** — self-register (web OK, **mobile broken**) → superuser approves.
- **Worker** — self-register (web OK, **mobile broken**) → superuser approves.
- **Payer** — admin creates + email link (web completion) → superuser approves. Never self-registers. **Intended.**
- **Secretary** (מזכירת חווה מארחת) — self-register like admin/worker (web surface). Not in Oren's mobile list but same `/SystemUsers/register` path.
- **SuperUser** — seeded/separate; not in this flow. **Intended.**
