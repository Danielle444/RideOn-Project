# Design: OTP Registration Verification & Password Reset
**Date:** 2026-04-09  
**Branch:** Amit-Supabase

---

## Overview

Two independent auth features added to the RideOn system:

1. **OTP verification at registration** — user verifies their email with a 6-digit code before the account is created
2. **Forgot password flow** — user receives a reset link by email and sets a new password

Both features use MailKit (C# SMTP) for email delivery. No changes to the existing login flow.

---

## Database Changes

### New Table: `emailotp`
Stores OTP codes for email verification during registration.

```sql
CREATE TABLE public.emailotp (
  otpid       integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  email       character varying NOT NULL,
  otphash     character varying NOT NULL,
  createdat   timestamp with time zone NOT NULL DEFAULT now(),
  expiresat   timestamp with time zone NOT NULL,
  isused      boolean NOT NULL DEFAULT false,
  CONSTRAINT emailotp_pkey PRIMARY KEY (otpid)
);
```

- OTP expires after **10 minutes**
- Code is stored as SHA-256 hash (same pattern as passwords)
- One email can have multiple rows; validation checks the most recent unused, non-expired one

### New Table: `passwordresettoken`
Stores tokens for the forgot-password flow.

```sql
CREATE TABLE public.passwordresettoken (
  tokenid         integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  systemuserid    integer NOT NULL,
  tokenhash       character varying NOT NULL,
  createdat       timestamp with time zone NOT NULL DEFAULT now(),
  expiresat       timestamp with time zone NOT NULL,
  isused          boolean NOT NULL DEFAULT false,
  CONSTRAINT passwordresettoken_pkey PRIMARY KEY (tokenid),
  CONSTRAINT fk_passwordresettoken_systemuser FOREIGN KEY (systemuserid) REFERENCES public.systemuser(systemuserid)
);
```

- Token expires after **30 minutes**
- Token is a random 64-byte string stored as SHA-256 hash
- `isused` is set to true immediately upon successful password reset

---

## Backend (C# .NET 8)

### New Files

#### `BL/EmailService.cs`
Responsible only for sending emails via MailKit (SMTP).

```
SendOtpEmail(string toEmail, string otpCode)
SendPasswordResetEmail(string toEmail, string resetLink)
```

SMTP config read from `appsettings.json` under `"Email"` section (host, port, username, password).

#### `BL/OtpService.cs`
```
SendAndStoreOtp(string email) → generates 6-digit code, hashes it, saves to emailotp, sends email
VerifyOtp(string email, string code) → checks DB for valid (unused, not expired) matching hash
```

#### `BL/PasswordResetService.cs`
```
RequestReset(string email) → finds SystemUser via person.email, generates token, hashes it, saves to passwordresettoken, sends email with link
ResetPassword(string token, string newPassword) → validates token, updates systemuser passwordhash + passwordsalt, marks token as used
```

#### `DAL/OtpDAL.cs`
```
SaveOtp(string email, string otpHash, DateTime expiresAt)
GetValidOtp(string email) → returns most recent unused, non-expired record
MarkOtpAsUsed(int otpId)
```

#### `DAL/PasswordResetDAL.cs`
```
SaveResetToken(int systemUserId, string tokenHash, DateTime expiresAt)
GetValidToken(string tokenHash) → returns matching unused, non-expired record
MarkTokenAsUsed(int tokenId)
```

### Modified Files

#### `BL/SystemUser.cs`
- `Register(RegisterRequest request)` — add `otpCode` field to request, call `OtpService.VerifyOtp` before creating the user. Throw if OTP is invalid.

#### `BL/DTOs/Auth/RegisterRequest.cs`
- Add `string OtpCode` field

#### `Controllers/SystemUsersController.cs`
Three new endpoints:

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/systemusers/send-otp` | Sends OTP to email for registration |
| POST | `/api/systemusers/forgot-password` | Sends reset link to email |
| POST | `/api/systemusers/reset-password` | Resets password using token |

`forgot-password` always returns 200 OK regardless of whether email exists (security: don't reveal if email is registered).

### `appsettings.json` — New Section
```json
"Email": {
  "SmtpHost": "",
  "SmtpPort": 587,
  "SmtpUsername": "",
  "SmtpPassword": "",
  "FromAddress": "",
  "FromName": "RideOn"
}
```

Actual credentials stored outside source control (environment variables or user secrets).

---

## Stored Procedures (PostgreSQL)

New SPs in `RideOnDB/StoredProcedures/PostgreSQL/PG_01_Auth.sql`:

- `usp_SaveEmailOtp(p_email, p_otphash, p_expiresat)`
- `usp_GetValidEmailOtp(p_email)` — returns most recent valid record
- `usp_MarkOtpAsUsed(p_otpid)`
- `usp_SavePasswordResetToken(p_systemuserid, p_tokenhash, p_expiresat)`
- `usp_GetValidPasswordResetToken(p_tokenhash)`
- `usp_MarkResetTokenAsUsed(p_tokenid)`
- `usp_GetSystemUserByEmail(p_email)` — finds systemuser via JOIN with person.email

---

## Frontend (React Web)

### New Files

#### `src/pages/auth/ForgotPasswordScreen.jsx`
- Email input field + "שלח קישור" button
- On submit: POST `/api/systemusers/forgot-password`
- Always shows success message regardless of result: "אם המייל קיים במערכת, ישלח אליך קישור לאיפוס"

#### `src/pages/auth/ResetPasswordScreen.jsx`
- Route: `/reset-password?token=...`
- Two fields: new password + confirm password
- On submit: POST `/api/systemusers/reset-password` with token from URL
- On success: navigate to `/` (login) with success message

### Modified Files

#### `src/pages/auth/LoginScreen.jsx`
- "שכחתי סיסמה" button now shows a **confirmation popup** before navigating:
  > "לאיפוס סיסמה ישלח קישור למייל הרשום שלך. להמשיך?"
  > [כן] [ביטול]
- Only navigates to `/forgot-password` if user confirms

#### `src/pages/auth/RegisterScreen.jsx`
OTP step added inline (no new screen):

1. User fills out the full form
2. Button "שלח קוד אימות" appears next to email field — calls `POST /api/systemusers/send-otp`
3. OTP input field appears after sending
4. "הירשם" button is disabled until OTP field is filled
5. On register: full form + OTP code sent together to `POST /api/systemusers/register`

### Router
Add two new routes:
- `/forgot-password` → `ForgotPasswordScreen`
- `/reset-password` → `ResetPasswordScreen`

---

## Security Notes

- OTP and reset tokens are **never stored in plain text** — always SHA-256 hashed
- Reset link format: `https://<domain>/reset-password?token=<raw_token>` — only the raw token is in the URL, hash is in DB
- `forgot-password` endpoint returns identical response whether email exists or not
- OTP expires in 10 min, reset token in 30 min
- Both are single-use (`isused = true` after first valid use)

---

## שפה
כל טקסט המוצג למשתמש (כפתורות, הודעות שגיאה, הצלחה, placeholder) חייב להיות בעברית. המערכת פועלת RTL.

---

## Out of Scope

- Mobile (React Native) — not included in this implementation
- Email templates (HTML styling) — plain text emails for now
- Rate limiting on OTP/reset endpoints — future improvement
