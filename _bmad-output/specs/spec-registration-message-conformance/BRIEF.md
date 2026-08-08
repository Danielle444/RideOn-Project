# Source Brief — Registration & Auth: Design Conformance, Message Conformance, Mobile OTP

**This file is INPUT for a bmad-spec session, not the final spec.** Oren opens a bmad-spec
session with `SPEC-SESSION-PROMPT.md`; that session produces the branch-ready implementation
prompt for the colleague. Do not treat this as the implementation contract — it's the raw brief.

**Status:** review complete, no implementation. Party-mode review 2026-08-02/03.
**Scope:** all *new-user* + *auth* surfaces — Login, Register (web + mobile), CompleteRegistration
(payer), and forgot/reset-password — across admin (אדמין חווה), worker (עובד חווה), payer (משלם);
superuser noted for completeness.
**Nature:** mostly FE + shared copy; one FE slice on mobile (OTP); two small server items. **No DB changes.**

---

## Way-of-work constraints (must be honored by the spec + implementation)

- **80/20:** deliver the 20% that fixes 80%. Don't gold-plate. Reuse before building.
- **Global, not per-screen:** the design fix must produce **shared auth-form primitives** (field,
  button, message) used by *every* auth surface — not one-off styling per screen.
- **Reuse existing components** already in the app (`ToastMessage`, the shared Button direction
  from [[project-mobile-horse-picker-and-button-specs]] `#7B5A4D`, and the emerging shared
  FormModal/FormField primitive from [[project-system-manager-web-fixes]]).

---

## Locked decisions (Oren, 2026-08-02/03)

- **D1 — Mobile scope:** admin & worker self-register (mobile is their surface). Payer does **not**
  self-register. → fix mobile OTP for admin/worker; leave the payer flow's *logic* alone.
- **D2 — Hebrew address:** **neutral phrasing** everywhere. See `hebrew-strings.md`.
- **D3 — Payer/SuperUser scope:** payer filter + superuser absence are **intended** — document,
  don't change the role filter or add payer self-registration. See `registration-paths.md`.
- **D4 — DROPPED:** findings #5 (success copy drift) and #7 (OTP re-gate on email change) are **out**.
- **D5 — Design conformance is a first-class requirement** (see below), not just messages.

---

## The three provisioning paths (verified end-to-end)

Full detail + file:line in `registration-paths.md`. Payer route was re-verified per Oren's
request and **is functionally complete** (create → email token → `/Registration/validate` →
`/Registration/complete` → SuperUser approve). Summary:

- **Admin / Worker** — self-register → pending → SuperUser approves. `POST /SystemUsers/register`
  hard-requires OTP (`SystemUsersController.cs:129`).
- **Payer** — admin `create-with-credentials` → 72h email link → payer sets password on web
  `CompleteRegistrationPage` (`/Registration/complete`) → SuperUser approves. Never self-registers.
- **SuperUser** — seeded/separate `/SuperUsers/login`, not in this flow.

---

## Findings (ranked) — the brief for the spec session

| # | Sev | Area | Issue |
|---|-----|------|-------|
| **D5** | 🟠 High | **Design conformance (all auth forms)** | Login, Register (web+mobile), CompleteRegistration, forgot/reset all use **bespoke, hand-rolled** forms — their own brown palette, raw `<input>`s, ad-hoc buttons. They do **not** match the app's design system and they don't match **each other**. Requirement: one consistent, shared auth-form design across every surface, aligned to the rest of the app; modern mobile sign-in patterns as inspiration but conforming to RideOn's look. **Largest item — spec session should scope MVP vs full.** |
| 1 | 🔴 Blocker | Mobile OTP | Mobile admin/worker signup fails 100%: no send-code button, no code field, `register()` sends no `otpCode`; server requires OTP → `"קוד האימות אינו תקף או פג תוקפו"` for a code never offered. Reference impl = web. |
| 2 | 🟠 High | Message system | Registration/CompleteRegistration are the only web surfaces still using raw inline `bg-red-50`/`bg-green-50` divs instead of `ToastMessage`. |
| 3 | 🟠 High | Duplicate messaging | Mobile `RegisterScreen` double-fires success: inline `setSuccess` **and** `Alert.alert` (same text). Ranch modal same, different wording. Pick one channel. |
| 4 | 🟠 High | Neutral Hebrew (D2) | Mixed masc/fem in a single screen across Register (both) **and** CompleteRegistration. Full sweep in `hebrew-strings.md`. |
| 6 | 🟡 Med | Register error quality | All register failures collapse to generic `"אירעה שגיאה בהרשמה"` (`SystemUsersController.cs:137`); a taken username (`SystemUser.cs:128` throws `"Username already exists"`) is swallowed. Surface a specific neutral message. |
| **P1** | 🟡 Med | **Payer route gap** | **Password policy mismatch:** self-register enforces 8 chars + upper + lower + digit + no-spaces (`PasswordPolicyValidator`), but payer completion enforces only **≥6 chars** on **both** client (`CompleteRegistrationPage.jsx:57`) and server (`RegistrationController.cs:65`). Payers get a weaker password. Align completion to the full policy. |
| **P2** | 🟢 Verify | Payer route wiring | Confirm the **admin-side UI entry point** that calls `POST /Payers/create-with-credentials` actually exists and is reachable (backend + web completion are built; verify the admin trigger). |

---

## Out of scope / do NOT touch

- Findings #5 and #7 (D4 — dropped).
- Payer self-registration / the `authMappings.js` role filter (D3 — intended).
- The SuperUser login flow; OTP crypto / `OtpService` internals (working).
- Any DB / stored-procedure work (none needed). Password-policy alignment (P1) is code-only.

---

## Companion files

- `SPEC-SESSION-PROMPT.md` — **the deliverable Oren pastes to open the bmad-spec session.**
- `registration-paths.md` — the four provisioning paths, verified, with file:line (D3 doc).
- `hebrew-strings.md` — every string to neutralize, current → proposed, with file:line.
