---
spec: registration-message-conformance
title: Registration & Auth — Design Conformance, Message Conformance, Mobile OTP
date: 2026-08-03
status: ready-for-implementation
companions:
  - registration-paths.md
  - hebrew-strings.md
  - IMPLEMENTATION-PROMPT.md
sources:
  - BRIEF.md
---

# Why

Every auth surface in RideOn (Login, Register, CompleteRegistration, forgot/reset-password)
is a hand-rolled form with its own Material-brown palette, raw inputs, and ad-hoc messaging.
They do not match the rest of the app and do not match each other. Worse, the surface admins
and workers actually use — **mobile Register — fails 100%**: the server hard-requires an OTP the
mobile screen never collects. This spec makes the auth surfaces conform (one design, neutral
Hebrew, one message channel) and makes mobile self-registration work, in one branch, reusing
what already exists rather than inventing a second design system.

# Capabilities

Each capability is intent + success. Full file:line build steps live in `IMPLEMENTATION-PROMPT.md`.

- **CAP-1 — Conformant auth-form design layer (D5).**
  Intent: all auth surfaces on each platform render through **shared auth primitives** (field,
  message, button) that draw from a **shared cross-platform token module**, so the screens match
  the app and each other; no auth screen keeps a raw hex palette or ad-hoc input.
  Success: web imports a single `authTheme` token set and renders fields via the existing
  `common/Field.jsx` + messages via `common/ToastMessage.jsx`; mobile imports the same tokens and
  renders via a shared `AuthField` + the existing `ui/Button.jsx`; grep for the old Material-brown
  hex literals (`#795548`, `#5D4037`, `#8D6E63`, `#4E342E`, `#6D4C41`, `#795548`…) in the auth
  directories returns zero. **MVP boundary is resolved below — the shared full-screen layout shell
  is explicitly out.**

- **CAP-2 — Mobile OTP parity (blocker #1).**
  Intent: mobile Register collects and submits an OTP exactly as web does, so admin/worker mobile
  self-registration can succeed against the OTP-requiring server.
  Success: mobile `authService.js` exposes `sendOtp(email)` → `POST /SystemUsers/send-otp`; the
  screen has a send-code button, a code field, an `otpSent`/gate, and `register()` sends `otpCode`;
  a real mobile registration against a running server returns success, not
  `"קוד האימות אינו תקף או פג תוקפו"`.

- **CAP-3 — Web message channel unified (#2).**
  Intent: web Register and CompleteRegistration report success/error through `ToastMessage`, not
  inline `bg-red-50`/`bg-green-50` divs.
  Success: no `bg-red-50`/`bg-green-50` inline status div remains in either web file; both drive
  the shared toast.

- **CAP-4 — Single mobile success channel (#3).**
  Intent: mobile Register success fires through exactly one channel, with the canonical (web)
  wording.
  Success: the duplicate `Alert.alert` success calls (main submit and ranch modal) are removed;
  one channel remains; its text matches the neutral web canonical string.

- **CAP-5 — Neutral Hebrew everywhere (#4 / D2).**
  Intent: no masculine/feminine 2nd-person address in any auth screen.
  Success: every row in `hebrew-strings.md` is applied across Register (web+mobile),
  CompleteRegistration, and Login; a grep of the auth screens for gendered 2nd-person verb forms
  and fem-imperative placeholders is clean.

- **CAP-6 — Specific taken-username error (#6).**
  Intent: a duplicate username surfaces a specific neutral message instead of the generic
  `"אירעה שגיאה בהרשמה"`.
  Success: `SystemUsersController.Register` catches the `"Username already exists"` throw
  (`SystemUser.cs:130`) and returns `BadRequest("שם המשתמש כבר תפוס")`; all other failures keep the
  generic fallback; `dotnet build` clean.

- **CAP-7 — Payer completion password policy aligned (P1).**
  Intent: payer completion enforces the same policy as self-register, not a weaker ≥6-char rule.
  Success: client `CompleteRegistrationPage.jsx` validates via the existing shared
  `getPasswordValidationMessage`; server `RegistrationController.cs:65` validates via
  `PasswordPolicyValidator`; a 6-char password is rejected on both sides; `dotnet build` clean.

- **CAP-8 — Payer admin entry point verified (P2).**
  Intent: confirm the admin UI that calls `POST /Payers/create-with-credentials` exists and is
  reachable.
  Success: the trigger is located and named in the handoff, OR its absence is flagged as an
  explicit follow-up — scope is **not** silently expanded to build it.

# Constraints

- **Web and mobile cannot share React components** (React DOM vs React Native). "Global shared
  primitives" therefore means: **one shared plain-JS token module in `shared/`** consumed by both,
  plus **per-platform** field/message/button primitives. This is the honest reading of "global, not
  per-screen" and it bounds CAP-1.
- **Reuse, do not reinvent:** web `common/Field.jsx` + `common/ToastMessage.jsx`; mobile
  `ui/Button.jsx`; shared `getPasswordValidationMessage` (already the full policy) and
  `PasswordPolicyValidator`. Do not introduce a second design system or a second validator.
- **80/20** — smallest change that fixes the most. No gold-plating.
- **No DB / stored-procedure changes.** All items are FE + copy + two small C# edits.
- After any C# change: `dotnet build` in `RideOnServer/`, then grep call paths for bypasses.
- Mobile has **no** `ToastMessage`; CAP-4 is "one channel," not "adopt a toast on mobile."
- One branch off `main` covers CAP-1..CAP-8.

# Non-goals

- Payer self-registration or the `authMappings.js` role filter (D3 — intended; document only).
- The SuperUser login flow and `OtpService` / OTP crypto internals (working).
- Findings #5 (success-copy drift) and #7 (OTP re-gate on email change) — **dropped (D4)**.
- A shared full-screen auth **layout shell** / card-chrome primitive — deferred (the "full" tier of
  CAP-1); not in this branch.
- Any change that builds the payer admin entry point if CAP-8 finds it missing — flag, don't build.

# Success signal

One branch merges that: (1) makes a real mobile admin/worker registration succeed end-to-end
against a running server (OTP happy path + resend); (2) renders all auth screens through the shared
token+primitive layer with zero raw Material-brown hex and a clean neutral-Hebrew grep; (3) shows a
taken-username attempt returning "שם המשתמש כבר תפוס"; (4) rejects a 6-char payer completion password
on client and server; with `dotnet build` clean and no DB changes.

# MVP boundary for CAP-1 (resolved)

**Recommendation: ship the token + primitive layer; defer the layout shell.**

- **In (MVP):** a shared `authTheme` token module in `shared/` (palette converged onto the app's
  `#7B5A4D` family, spacing, radius); per-platform shared **field**, **message**, and **button**
  primitives — reusing web `Field.jsx`/`ToastMessage.jsx` and mobile `ui/Button.jsx`, adding only
  what's missing (web has no shared button; mobile has no shared field/message); every auth screen
  refactored to consume them so nothing hardcodes hex or ad-hoc inputs.
- **Out (Full, deferred):** a shared `AuthFormShell`/`AuthCard` layout primitive that restructures
  each screen's header/logo/card/footer chrome.
- **Rationale:** the token + field + message + button layer removes 100% of the "don't match the
  app / don't match each other / raw hex everywhere" problem — the 80%. A layout-shell refactor
  touches the structure of 6 web + 3 mobile working screens (Login, ResetPassword, etc.) for
  marginal visual gain and real regression risk. Land the cheap high-value layer now; leave the
  shell as an optional fast-follow.
