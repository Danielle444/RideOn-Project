# Colleague Implementation Prompt — Registration & Auth Conformance

> Paste everything below the line into a fresh Claude Code session on the RideOn repo. It is
> self-contained: one branch, eight items, reuse-first, no DB changes. Read `SPEC.md`,
> `registration-paths.md`, and `hebrew-strings.md` in this same folder before you start.

---

You are implementing the "Registration & Auth conformance" work on RideOn. Do it on **one branch
off `main`**, covering all eight items below. This is a **reuse-first, 80/20** job — reach for
existing components, never invent a second design system or a second validator. **No DB / stored
procedure changes.** After any `.cs` edit run `dotnet build` in `RideOnServer/` and grep the call
paths you touched.

Load the skill `ride-on-system-knowledge` first. Then:

```bash
git checkout main && git pull
git checkout -b feature/auth-conformance
```

## Ground truth already verified (don't re-derive)

- **Auth surfaces.** Web: `web/src/pages/auth/{LoginScreen,RegisterScreen,CompleteRegistrationPage,ForgotPasswordScreen,ResetPasswordScreen,SuperUserForgotPasswordScreen}.jsx`.
  Mobile: `mobile/src/screens/auth/{LoginScreen,RegisterScreen,ChangePasswordScreen}.jsx`. (All paths under `RideOnClient/rideon-client/`.)
- **Web/mobile cannot share React components** (DOM vs Native). "Global shared primitives" = ONE
  shared plain-JS token module in `shared/` + PER-PLATFORM field/message/button components.
- **Reuse anchors that already exist:** web `web/src/components/common/Field.jsx` and
  `web/src/components/common/ToastMessage.jsx`; mobile `mobile/src/components/ui/Button.jsx`;
  shared `shared/auth/validations/passwordValidation.js` (`getPasswordValidationMessage` — already
  the full 8-char+complexity policy); server `RideOnServer/BL/PasswordPolicyValidator.cs`.
- **Mobile has NO ToastMessage.** Don't add one; item 4 is "single channel," not "adopt a toast."
- The auth screens currently hardcode a **Material-brown palette** (`#795548`, `#5D4037`, `#8D6E63`,
  `#4E342E`, `#6D4C41`, `#D7CCC8`, `#F5EDE8`…), 200+ raw hex literals — this is the thing D5 kills.
  The rest of the app uses `#7B5A4D`.

---

## Item 1 — Conformant auth-form design layer (D5, largest)  — **MVP boundary is DECIDED**

**Build the token + primitive layer. DO NOT build a full-screen layout shell** (that's the deferred
"full" tier — leave each screen's header/logo/card structure as-is).

1. **Shared token module** — create `shared/auth/theme/authTheme.js` (plain JS, no JSX), exporting a
   single object: palette converged onto the app's `#7B5A4D` family (primary, primary-hover, text,
   muted-text, surface, border, danger, success), plus spacing/radius scales. Both platforms import
   this — it's what makes web and mobile match each other.
2. **Web primitives** — reuse `common/Field.jsx` for every auth input (extend it only if a screen
   needs a variant it lacks); use `common/ToastMessage.jsx` for every status message (see item 3);
   web has **no** shared button, so add `web/src/components/common/AuthButton.jsx` (or standardize
   one) consuming the tokens. Refactor all six web auth screens to these — remove raw hex.
3. **Mobile primitives** — reuse `ui/Button.jsx`; add a shared `mobile/src/components/ui/AuthField.jsx`
   (label + input + inline error, RTL-safe) consuming the tokens; refactor the three mobile auth
   screens to these — remove raw hex.
4. **Acceptance:** `grep -rE '#(795548|5D4037|8D6E63|4E342E|6D4C41|D7CCC8|F5EDE8)' ` over both auth
   directories returns nothing; all auth screens visibly share one look and match the app.

> Keep this the largest but boring change: same fields, same flows, new skin + primitives. Don't
> restructure logic while re-skinning — do item 1's re-skin and the behavior items (2–7) as
> separate commits so a regression is easy to bisect.

## Item 2 — Mobile OTP parity  (blocker #1)

Web is the reference: `web/src/services/authService.js:92` (`sendOtp` → `POST /SystemUsers/send-otp`)
and `web/src/pages/auth/RegisterScreen.jsx` `handleSendOtp` (~:162) + the OTP UI/gate.

On mobile:
- Add `sendOtp(email)` to `mobile/src/services/authService.js`, POSTing to `/SystemUsers/send-otp`
  with the email normalized the same way web does (`normalizeIdentifier`). The endpoint already
  exists — no server change.
- In `mobile/src/screens/auth/RegisterScreen.jsx`: add a "שלח קוד אימות למייל" button + an `otpCode`
  field + `otpSent`/`otpLoading`/`otpError` state mirroring web; gate submit on `otpCode`; add
  `otpCode` to the `register({...})` payload at ~:567.
- **Acceptance:** against a running server, a full mobile admin/worker registration returns success,
  not `"קוד האימות אינו תקף או פג תוקפו"`.

## Item 3 — Web message channel via ToastMessage  (#2)

In `web/src/pages/auth/RegisterScreen.jsx` and `web/src/pages/auth/CompleteRegistrationPage.jsx`,
replace inline `bg-red-50`/`bg-green-50` status divs with `common/ToastMessage.jsx` (the
`showToast(type, message)` pattern used elsewhere in the app). No inline colored status div should
remain in either file.

## Item 4 — Single mobile success channel  (#3)

In `mobile/src/screens/auth/RegisterScreen.jsx`, the main submit double-fires success
(`setSuccess(...)` at ~:585 **and** `Alert.alert(...)` at ~:587), and the ranch modal does the same
(~:524 / ~:526). Keep ONE channel (the inline `setSuccess`), remove the duplicate `Alert.alert`
success calls, and set the success text to the canonical neutral web wording (see item 5 /
`hebrew-strings.md`): `הבקשה נשלחה בהצלחה! תישלח הודעה לאחר אישור מנהל המערכת.`

## Item 5 — Neutral Hebrew sweep  (#4 / D2)

Apply every row of `hebrew-strings.md` across web + mobile Register, CompleteRegistrationPage, and
Login. Then `grep` the auth screens for stray gendered forms — fem-imperative placeholders (strings
ending `י`/`ה` like `בחרי`/`הזיני`) and masculine 2nd-person verbs (`תקבל`, `בחר`, `הזן`, `נסה`,
`פנה`, `התחבר`) — and neutralize any stragglers per the strategy at the top of that file
(placeholders → noun; CTAs → plural imperative; results → passive; nav → noun). **Acceptance:** that
grep is clean.

## Item 6 — Specific taken-username error  (#6)

In `RideOnServer/Controllers/SystemUsersController.cs` (the `Register` catch, ~:137), detect the
known `"Username already exists"` throw from `RideOnServer/BL/SystemUser.cs:130` and return
`BadRequest("שם המשתמש כבר תפוס")`. Keep the generic `"אירעה שגיאה בהרשמה"` fallback for everything
else. `dotnet build`, then grep for other callers of `SystemUser.Register`.

## Item 7 — Payer completion password policy aligned  (P1)

- **Client:** `web/src/pages/auth/CompleteRegistrationPage.jsx:57` currently checks `< 6`. Replace
  with the shared `getPasswordValidationMessage` from `shared/auth/validations/passwordValidation.js`
  (already the full 8-char + upper + lower + digit + no-space policy). Surface its message via the
  ToastMessage from item 3.
- **Server:** `RideOnServer/Controllers/RegistrationController.cs:65` checks `Password.Length < 6`.
  Replace with `PasswordPolicyValidator` (already used by `SystemUser`/`SuperUser`). `dotnet build`.
- **Acceptance:** a 6-char password is rejected on both client and server.

## Item 8 — Verify payer admin entry point  (P2, verify-only)

Confirm an admin-side UI calls `POST /Payers/create-with-credentials` (`PayersController.cs:21`).
Search the web app (secretary/admin surfaces) for a component hitting that endpoint. If it exists,
name the file in your handoff. **If it does NOT exist, flag it as a follow-up — do NOT build it.**

---

## Guardrails

- **No DB / stored-procedure changes.** Don't touch `authMappings.js` role filter, payer
  self-registration, or the SuperUser login flow.
- Commit in logical slices (design layer; mobile OTP; messages; Hebrew; server items) so each is
  bisectable. Show diffs before applying.
- After each C# change: `dotnet build` in `RideOnServer/` (expect ~171 pre-existing nullable
  warnings — verify only that YOUR touched files are clean), then grep call paths.

## Test plan

1. **Mobile OTP (happy + resend), against a running server.** Register a new admin/worker on mobile:
   request code → receive it → enter it → submit → expect success. Then trigger resend and confirm a
   second code also verifies. (Backend must be started by Oren via `rideon-local.ps1` — Claude Code
   can't run the `server` preview config; see `ride-on-system-knowledge`.)
2. **Design conformance — visual.** Open all auth screens (web via the `web` preview; mobile via
   Expo) and confirm they share one look and match the app. Screenshot each. `grep` for the
   Material-brown hex list → zero hits.
3. **Neutral-Hebrew grep clean** across the auth screens (item 5 acceptance).
4. **Messages:** web Register + CompleteRegistration show toasts, no inline colored divs; mobile
   Register success fires once.
5. **Server:** duplicate-username registration returns `"שם המשתמש כבר תפוס"`; 6-char payer
   completion password rejected client + server; `dotnet build` clean.
6. **Item 8:** admin entry point named, or its absence filed as a follow-up.

## Handoff back to Oren

Report: branch name + commit hashes per slice; the item-8 finding (entry point present/absent);
mobile OTP verification result; screenshots of the conformed auth screens; and anything that
belongs in a `ride-on-system-knowledge` update (e.g. the new `authTheme` token module location).
