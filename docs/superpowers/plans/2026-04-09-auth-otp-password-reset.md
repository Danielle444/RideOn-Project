# Auth: OTP Registration & Password Reset — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add OTP email verification at registration and a forgot-password flow (email link → reset) for SystemUsers.

**Architecture:** Two new DB tables (emailotp, passwordresettoken) store hashed codes/tokens. C# services handle generation, hashing, and email sending via MailKit. Frontend adds an OTP step inline in RegisterScreen and two new public screens (ForgotPassword, ResetPassword).

**Tech Stack:** PostgreSQL (Supabase), C# .NET 8, MailKit (NuGet), React + Vite (JSX), axios

**Spec:** `docs/superpowers/specs/2026-04-09-auth-otp-password-reset-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `RideOnDB/StoredProcedures/PostgreSQL/Individual/95_usp_SaveEmailOtp.sql` | שמירת OTP ב-DB |
| `RideOnDB/StoredProcedures/PostgreSQL/Individual/96_usp_GetValidEmailOtp.sql` | שליפת OTP תקף |
| `RideOnDB/StoredProcedures/PostgreSQL/Individual/97_usp_MarkOtpAsUsed.sql` | סימון OTP כנוצל |
| `RideOnDB/StoredProcedures/PostgreSQL/Individual/98_usp_SavePasswordResetToken.sql` | שמירת טוקן איפוס |
| `RideOnDB/StoredProcedures/PostgreSQL/Individual/99_usp_GetValidPasswordResetToken.sql` | שליפת טוקן תקף |
| `RideOnDB/StoredProcedures/PostgreSQL/Individual/100_usp_MarkResetTokenAsUsed.sql` | סימון טוקן כנוצל |
| `RideOnDB/StoredProcedures/PostgreSQL/Individual/101_usp_GetSystemUserByEmail.sql` | מציאת SystemUser לפי מייל |
| `RideOnServer/BL/EmailService.cs` | שליחת מיילים דרך MailKit |
| `RideOnServer/BL/OtpService.cs` | יצירה, שמירה, ואימות OTP |
| `RideOnServer/BL/PasswordResetService.cs` | בקשת איפוס ואיפוס סיסמה |
| `RideOnServer/DAL/OtpDAL.cs` | גישה ל-DB עבור emailotp |
| `RideOnServer/DAL/PasswordResetDAL.cs` | גישה ל-DB עבור passwordresettoken |
| `RideOnServer/BL/DTOs/Auth/ForgotPasswordRequest.cs` | DTO לבקשת איפוס |
| `RideOnServer/BL/DTOs/Auth/ResetPasswordRequest.cs` | DTO לאיפוס סיסמה |
| `RideOnServer/BL/DTOs/Auth/SendOtpRequest.cs` | DTO לשליחת OTP |
| `RideOnClient/rideon-client/web/src/pages/auth/ForgotPasswordScreen.jsx` | מסך "שכחתי סיסמה" |
| `RideOnClient/rideon-client/web/src/pages/auth/ResetPasswordScreen.jsx` | מסך "איפוס סיסמה" |

### Modified Files
| File | What Changes |
|------|-------------|
| `RideOnServer/BL/DTOs/Auth/RegisterRequest.cs` | הוספת `OtpCode` |
| `RideOnServer/BL/SystemUser.cs` | אימות OTP לפני רישום |
| `RideOnServer/Controllers/SystemUsersController.cs` | 3 endpoints חדשים |
| `RideOnServer/appsettings.json` | הגדרות SMTP |
| `RideOnClient/rideon-client/web/src/services/authService.js` | 3 פונקציות חדשות |
| `RideOnClient/rideon-client/web/src/pages/auth/LoginScreen.jsx` | Popup אישור |
| `RideOnClient/rideon-client/web/src/pages/auth/RegisterScreen.jsx` | שלב OTP |
| `RideOnClient/rideon-client/web/src/router/router.jsx` | 2 נתיבים חדשים |

---

## Task 1: יצירת טבלאות DB ב-Supabase

**Files:**
- Create: `RideOnDB/StoredProcedures/PostgreSQL/Individual/95_usp_SaveEmailOtp.sql` (and 96–101)

- [ ] **Step 1: פתח את Supabase SQL Editor והרץ את ה-SQL הבא ליצירת טבלת emailotp**

```sql
CREATE TABLE IF NOT EXISTS public.emailotp (
  otpid     integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  email     character varying NOT NULL,
  otphash   character varying NOT NULL,
  createdat timestamp with time zone NOT NULL DEFAULT now(),
  expiresat timestamp with time zone NOT NULL,
  isused    boolean NOT NULL DEFAULT false,
  CONSTRAINT emailotp_pkey PRIMARY KEY (otpid)
);
```

- [ ] **Step 2: הרץ את ה-SQL הבא ליצירת טבלת passwordresettoken**

```sql
CREATE TABLE IF NOT EXISTS public.passwordresettoken (
  tokenid       integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  systemuserid  integer NOT NULL,
  tokenhash     character varying NOT NULL,
  createdat     timestamp with time zone NOT NULL DEFAULT now(),
  expiresat     timestamp with time zone NOT NULL,
  isused        boolean NOT NULL DEFAULT false,
  CONSTRAINT passwordresettoken_pkey PRIMARY KEY (tokenid),
  CONSTRAINT fk_passwordresettoken_systemuser
    FOREIGN KEY (systemuserid) REFERENCES public.systemuser(systemuserid)
);
```

- [ ] **Step 3: אמת שהטבלאות נוצרו — הרץ:**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('emailotp', 'passwordresettoken');
```

תוצאה צפויה: שתי שורות עם השמות.

- [ ] **Step 4: צור קובץ `95_usp_SaveEmailOtp.sql`**

```sql
DROP FUNCTION IF EXISTS usp_SaveEmailOtp CASCADE;
CREATE OR REPLACE FUNCTION usp_SaveEmailOtp(
    p_email     TEXT,
    p_otphash   TEXT,
    p_expiresat TIMESTAMP WITH TIME ZONE
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.emailotp (email, otphash, expiresat)
    VALUES (p_email, p_otphash, p_expiresat);
END;
$$;
```

- [ ] **Step 5: צור קובץ `96_usp_GetValidEmailOtp.sql`**

```sql
DROP FUNCTION IF EXISTS usp_GetValidEmailOtp CASCADE;
CREATE OR REPLACE FUNCTION usp_GetValidEmailOtp(
    p_email TEXT
)
RETURNS TABLE(
    "OtpId"   INTEGER,
    "OtpHash" VARCHAR,
    "ExpiresAt" TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT otpid, otphash, expiresat
    FROM public.emailotp
    WHERE email = p_email
      AND isused = false
      AND expiresat > now()
    ORDER BY createdat DESC
    LIMIT 1;
END;
$$;
```

- [ ] **Step 6: צור קובץ `97_usp_MarkOtpAsUsed.sql`**

```sql
DROP FUNCTION IF EXISTS usp_MarkOtpAsUsed CASCADE;
CREATE OR REPLACE FUNCTION usp_MarkOtpAsUsed(
    p_otpid INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.emailotp
    SET isused = true
    WHERE otpid = p_otpid;
END;
$$;
```

- [ ] **Step 7: צור קובץ `98_usp_SavePasswordResetToken.sql`**

```sql
DROP FUNCTION IF EXISTS usp_SavePasswordResetToken CASCADE;
CREATE OR REPLACE FUNCTION usp_SavePasswordResetToken(
    p_systemuserid INTEGER,
    p_tokenhash    TEXT,
    p_expiresat    TIMESTAMP WITH TIME ZONE
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.passwordresettoken (systemuserid, tokenhash, expiresat)
    VALUES (p_systemuserid, p_tokenhash, p_expiresat);
END;
$$;
```

- [ ] **Step 8: צור קובץ `99_usp_GetValidPasswordResetToken.sql`**

```sql
DROP FUNCTION IF EXISTS usp_GetValidPasswordResetToken CASCADE;
CREATE OR REPLACE FUNCTION usp_GetValidPasswordResetToken(
    p_tokenhash TEXT
)
RETURNS TABLE(
    "TokenId"      INTEGER,
    "SystemUserId" INTEGER
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT tokenid, systemuserid
    FROM public.passwordresettoken
    WHERE tokenhash = p_tokenhash
      AND isused = false
      AND expiresat > now()
    LIMIT 1;
END;
$$;
```

- [ ] **Step 9: צור קובץ `100_usp_MarkResetTokenAsUsed.sql`**

```sql
DROP FUNCTION IF EXISTS usp_MarkResetTokenAsUsed CASCADE;
CREATE OR REPLACE FUNCTION usp_MarkResetTokenAsUsed(
    p_tokenid INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.passwordresettoken
    SET isused = true
    WHERE tokenid = p_tokenid;
END;
$$;
```

- [ ] **Step 10: צור קובץ `101_usp_GetSystemUserByEmail.sql`**

```sql
DROP FUNCTION IF EXISTS usp_GetSystemUserByEmail CASCADE;
CREATE OR REPLACE FUNCTION usp_GetSystemUserByEmail(
    p_email TEXT
)
RETURNS TABLE(
    "SystemUserId" INTEGER,
    "Username"     VARCHAR,
    "IsActive"     BOOLEAN
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT su.systemuserid, su.username, su.isactive
    FROM public.systemuser su
    INNER JOIN public.person p ON p.personid = su.systemuserid
    WHERE p.email = p_email
    LIMIT 1;
END;
$$;
```

- [ ] **Step 11: הרץ את כל 7 ה-SPs בסדר ב-Supabase SQL Editor ואמת שאין שגיאות**

- [ ] **Step 12: Commit**

```bash
git add RideOnDB/StoredProcedures/PostgreSQL/Individual/
git commit -m "feat: add emailotp and passwordresettoken tables and stored procedures"
```

---

## Task 2: התקנת MailKit והגדרות SMTP

**Files:**
- Modify: `RideOnServer/RideOnServer.csproj`
- Modify: `RideOnServer/appsettings.json`

- [ ] **Step 1: פתח Terminal בתיקיית `RideOnServer` והרץ:**

```bash
dotnet add package MailKit --version 4.8.0
```

תוצאה צפויה: `PackageReference for MailKit was added`.

- [ ] **Step 2: פתח `appsettings.json` והוסף את הסעיף הבא (מחוץ ל-ConnectionStrings, לפני הסוגר האחרון `}`):**

```json
"Email": {
  "SmtpHost": "smtp.gmail.com",
  "SmtpPort": 587,
  "SmtpUsername": "",
  "SmtpPassword": "",
  "FromAddress": "",
  "FromName": "RideOn"
}
```

הערה: הערכים הריקים ימולאו ידנית לפי כתובת המייל שתרצה להשתמש בה לשליחה.

- [ ] **Step 3: Commit**

```bash
git add RideOnServer/RideOnServer.csproj RideOnServer/appsettings.json
git commit -m "feat: add MailKit package and email config section"
```

---

## Task 3: EmailService — שירות שליחת מיילים

**Files:**
- Create: `RideOnServer/BL/EmailService.cs`

- [ ] **Step 1: צור את הקובץ `RideOnServer/BL/EmailService.cs`:**

```csharp
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace RideOnServer.BL
{
    public class EmailService
    {
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public void SendOtpEmail(string toEmail, string otpCode)
        {
            string subject = "קוד אימות - RideOn";
            string body = $"קוד האימות שלך הוא: {otpCode}\n\nהקוד תקף ל-10 דקות.";
            Send(toEmail, subject, body);
        }

        public void SendPasswordResetEmail(string toEmail, string resetLink)
        {
            string subject = "איפוס סיסמה - RideOn";
            string body = $"לאיפוס הסיסמה שלך לחץ על הקישור הבא:\n\n{resetLink}\n\nהקישור תקף ל-30 דקות.";
            Send(toEmail, subject, body);
        }

        private void Send(string toEmail, string subject, string body)
        {
            string smtpHost = _configuration["Email:SmtpHost"]!;
            int smtpPort = int.Parse(_configuration["Email:SmtpPort"]!);
            string smtpUsername = _configuration["Email:SmtpUsername"]!;
            string smtpPassword = _configuration["Email:SmtpPassword"]!;
            string fromAddress = _configuration["Email:FromAddress"]!;
            string fromName = _configuration["Email:FromName"]!;

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromAddress));
            message.To.Add(new MailboxAddress("", toEmail));
            message.Subject = subject;
            message.Body = new TextPart("plain") { Text = body };

            using var client = new SmtpClient();
            client.Connect(smtpHost, smtpPort, SecureSocketOptions.StartTls);
            client.Authenticate(smtpUsername, smtpPassword);
            client.Send(message);
            client.Disconnect(true);
        }
    }
}
```

- [ ] **Step 2: הרץ `dotnet build` מתיקיית `RideOnServer` ואמת שאין שגיאות**

```bash
dotnet build
```

תוצאה צפויה: `Build succeeded`.

- [ ] **Step 3: Commit**

```bash
git add RideOnServer/BL/EmailService.cs
git commit -m "feat: add EmailService for SMTP email delivery via MailKit"
```

---

## Task 4: OtpDAL — גישה ל-DB עבור OTP

**Files:**
- Create: `RideOnServer/DAL/OtpDAL.cs`

- [ ] **Step 1: צור `RideOnServer/DAL/OtpDAL.cs`:**

```csharp
using Npgsql;

namespace RideOnServer.DAL
{
    public class OtpDAL : DBServices
    {
        public void SaveOtp(string email, string otpHash, DateTime expiresAt)
        {
            var paramDic = new Dictionary<string, object>
            {
                { "@email", email },
                { "@otphash", otpHash },
                { "@expiresat", expiresAt }
            };

            using NpgsqlConnection connection = Connect("DefaultConnection");
            connection.Open();
            using NpgsqlCommand command = CreateCommandWithStoredProcedure(
                "usp_SaveEmailOtp", connection, paramDic);
            command.ExecuteNonQuery();
        }

        public (int OtpId, string OtpHash)? GetValidOtp(string email)
        {
            var paramDic = new Dictionary<string, object>
            {
                { "@email", email }
            };

            using NpgsqlConnection connection = Connect("DefaultConnection");
            connection.Open();
            using NpgsqlCommand command = CreateCommandWithStoredProcedure(
                "usp_GetValidEmailOtp", connection, paramDic);
            using NpgsqlDataReader reader = command.ExecuteReader();

            if (reader.Read())
            {
                return (
                    Convert.ToInt32(reader["OtpId"]),
                    reader["OtpHash"].ToString()!
                );
            }

            return null;
        }

        public void MarkOtpAsUsed(int otpId)
        {
            var paramDic = new Dictionary<string, object>
            {
                { "@otpid", otpId }
            };

            using NpgsqlConnection connection = Connect("DefaultConnection");
            connection.Open();
            using NpgsqlCommand command = CreateCommandWithStoredProcedure(
                "usp_MarkOtpAsUsed", connection, paramDic);
            command.ExecuteNonQuery();
        }
    }
}
```

- [ ] **Step 2: הרץ `dotnet build` ואמת שאין שגיאות**

```bash
dotnet build
```

- [ ] **Step 3: Commit**

```bash
git add RideOnServer/DAL/OtpDAL.cs
git commit -m "feat: add OtpDAL for emailotp table access"
```

---

## Task 5: OtpService — לוגיקה של OTP

**Files:**
- Create: `RideOnServer/BL/OtpService.cs`

- [ ] **Step 1: צור `RideOnServer/BL/OtpService.cs`:**

```csharp
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class OtpService
    {
        private readonly EmailService _emailService;

        public OtpService(IConfiguration configuration)
        {
            _emailService = new EmailService(configuration);
        }

        public void SendAndStoreOtp(string email)
        {
            string otpCode = GenerateOtp();
            string otpHash = PasswordHelper.HashPassword(otpCode, "otp-salt");
            DateTime expiresAt = DateTime.UtcNow.AddMinutes(10);

            OtpDAL dal = new OtpDAL();
            dal.SaveOtp(email, otpHash, expiresAt);

            _emailService.SendOtpEmail(email, otpCode);
        }

        public bool VerifyOtp(string email, string code)
        {
            OtpDAL dal = new OtpDAL();
            var record = dal.GetValidOtp(email);

            if (record == null)
                return false;

            string inputHash = PasswordHelper.HashPassword(code, "otp-salt");

            if (inputHash != record.Value.OtpHash)
                return false;

            dal.MarkOtpAsUsed(record.Value.OtpId);
            return true;
        }

        private static string GenerateOtp()
        {
            Random rng = new Random();
            return rng.Next(100000, 999999).ToString();
        }
    }
}
```

- [ ] **Step 2: הרץ `dotnet build` ואמת שאין שגיאות**

```bash
dotnet build
```

- [ ] **Step 3: Commit**

```bash
git add RideOnServer/BL/OtpService.cs
git commit -m "feat: add OtpService for OTP generation, storage and verification"
```

---

## Task 6: PasswordResetDAL — גישה ל-DB עבור איפוס סיסמה

**Files:**
- Create: `RideOnServer/DAL/PasswordResetDAL.cs`

- [ ] **Step 1: צור `RideOnServer/DAL/PasswordResetDAL.cs`:**

```csharp
using Npgsql;

namespace RideOnServer.DAL
{
    public class PasswordResetDAL : DBServices
    {
        public void SaveResetToken(int systemUserId, string tokenHash, DateTime expiresAt)
        {
            var paramDic = new Dictionary<string, object>
            {
                { "@systemuserid", systemUserId },
                { "@tokenhash", tokenHash },
                { "@expiresat", expiresAt }
            };

            using NpgsqlConnection connection = Connect("DefaultConnection");
            connection.Open();
            using NpgsqlCommand command = CreateCommandWithStoredProcedure(
                "usp_SavePasswordResetToken", connection, paramDic);
            command.ExecuteNonQuery();
        }

        public (int TokenId, int SystemUserId)? GetValidToken(string tokenHash)
        {
            var paramDic = new Dictionary<string, object>
            {
                { "@tokenhash", tokenHash }
            };

            using NpgsqlConnection connection = Connect("DefaultConnection");
            connection.Open();
            using NpgsqlCommand command = CreateCommandWithStoredProcedure(
                "usp_GetValidPasswordResetToken", connection, paramDic);
            using NpgsqlDataReader reader = command.ExecuteReader();

            if (reader.Read())
            {
                return (
                    Convert.ToInt32(reader["TokenId"]),
                    Convert.ToInt32(reader["SystemUserId"])
                );
            }

            return null;
        }

        public void MarkTokenAsUsed(int tokenId)
        {
            var paramDic = new Dictionary<string, object>
            {
                { "@tokenid", tokenId }
            };

            using NpgsqlConnection connection = Connect("DefaultConnection");
            connection.Open();
            using NpgsqlCommand command = CreateCommandWithStoredProcedure(
                "usp_MarkResetTokenAsUsed", connection, paramDic);
            command.ExecuteNonQuery();
        }

        public (int SystemUserId, string Username, bool IsActive)? GetSystemUserByEmail(string email)
        {
            var paramDic = new Dictionary<string, object>
            {
                { "@email", email }
            };

            using NpgsqlConnection connection = Connect("DefaultConnection");
            connection.Open();
            using NpgsqlCommand command = CreateCommandWithStoredProcedure(
                "usp_GetSystemUserByEmail", connection, paramDic);
            using NpgsqlDataReader reader = command.ExecuteReader();

            if (reader.Read())
            {
                return (
                    Convert.ToInt32(reader["SystemUserId"]),
                    reader["Username"].ToString()!,
                    Convert.ToBoolean(reader["IsActive"])
                );
            }

            return null;
        }
    }
}
```

- [ ] **Step 2: הרץ `dotnet build` ואמת שאין שגיאות**

```bash
dotnet build
```

- [ ] **Step 3: Commit**

```bash
git add RideOnServer/DAL/PasswordResetDAL.cs
git commit -m "feat: add PasswordResetDAL for token storage and user lookup by email"
```

---

## Task 7: PasswordResetService — לוגיקה של איפוס סיסמה

**Files:**
- Create: `RideOnServer/BL/PasswordResetService.cs`

- [ ] **Step 1: צור `RideOnServer/BL/PasswordResetService.cs`:**

```csharp
using RideOnServer.DAL;
using System.Security.Cryptography;

namespace RideOnServer.BL
{
    public class PasswordResetService
    {
        private readonly EmailService _emailService;
        private readonly IConfiguration _configuration;

        public PasswordResetService(IConfiguration configuration)
        {
            _configuration = configuration;
            _emailService = new EmailService(configuration);
        }

        public void RequestReset(string email)
        {
            PasswordResetDAL dal = new PasswordResetDAL();
            var user = dal.GetSystemUserByEmail(email);

            // תמיד מחזיר תגובה זהה — לא מגלים אם המייל קיים
            if (user == null || !user.Value.IsActive)
                return;

            string rawToken = GenerateToken();
            string tokenHash = PasswordHelper.HashPassword(rawToken, "reset-salt");
            DateTime expiresAt = DateTime.UtcNow.AddMinutes(30);

            dal.SaveResetToken(user.Value.SystemUserId, tokenHash, expiresAt);

            string clientBaseUrl = _configuration["ClientBaseUrl"] ?? "http://localhost:5173";
            string resetLink = $"{clientBaseUrl}/reset-password?token={rawToken}";

            _emailService.SendPasswordResetEmail(email, resetLink);
        }

        public void ResetPassword(string rawToken, string newPassword)
        {
            string tokenHash = PasswordHelper.HashPassword(rawToken, "reset-salt");

            PasswordResetDAL dal = new PasswordResetDAL();
            var record = dal.GetValidToken(tokenHash);

            if (record == null)
                throw new Exception("הקישור אינו תקף או פג תוקפו");

            PasswordPolicyValidator.ValidateOrThrow(newPassword);

            string newSalt = PasswordHelper.GenerateSalt();
            string newHash = PasswordHelper.HashPassword(newPassword, newSalt);

            SystemUserDAL userDal = new SystemUserDAL();
            userDal.UpdateSystemUserPassword(record.Value.SystemUserId, newHash, newSalt);

            dal.MarkTokenAsUsed(record.Value.TokenId);
        }

        private static string GenerateToken()
        {
            byte[] bytes = new byte[64];
            using RandomNumberGenerator rng = RandomNumberGenerator.Create();
            rng.GetBytes(bytes);
            return Convert.ToBase64String(bytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .Replace("=", "");
        }
    }
}
```

- [ ] **Step 2: הוסף `"ClientBaseUrl": "http://localhost:5173"` ל-`appsettings.json` (לצד שאר ההגדרות)**

- [ ] **Step 3: הרץ `dotnet build` ואמת שאין שגיאות**

```bash
dotnet build
```

- [ ] **Step 4: Commit**

```bash
git add RideOnServer/BL/PasswordResetService.cs RideOnServer/appsettings.json
git commit -m "feat: add PasswordResetService for token generation and password reset"
```

---

## Task 8: DTOs חדשים + עדכון RegisterRequest

**Files:**
- Create: `RideOnServer/BL/DTOs/Auth/SendOtpRequest.cs`
- Create: `RideOnServer/BL/DTOs/Auth/ForgotPasswordRequest.cs`
- Create: `RideOnServer/BL/DTOs/Auth/ResetPasswordRequest.cs`
- Modify: `RideOnServer/BL/DTOs/Auth/RegisterRequest.cs`
- Modify: `RideOnServer/BL/SystemUser.cs`

- [ ] **Step 1: צור `SendOtpRequest.cs`:**

```csharp
namespace RideOnServer.BL.DTOs.Auth
{
    public class SendOtpRequest
    {
        public string Email { get; set; } = string.Empty;
    }
}
```

- [ ] **Step 2: צור `ForgotPasswordRequest.cs`:**

```csharp
namespace RideOnServer.BL.DTOs.Auth
{
    public class ForgotPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
    }
}
```

- [ ] **Step 3: צור `ResetPasswordRequest.cs`:**

```csharp
namespace RideOnServer.BL.DTOs.Auth
{
    public class ResetPasswordRequest
    {
        public string Token { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
```

- [ ] **Step 4: פתח `RegisterRequest.cs` והוסף שדה `OtpCode` — הקובץ ייראה כך:**

```csharp
namespace RideOnServer.BL.DTOs.Auth
{
    public class RegisterRequest
    {
        public string NationalId { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string CellPhone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string OtpCode { get; set; } = string.Empty;
        public List<RegisterRanchRoleRequest> RanchRoles { get; set; } = new();
    }
}
```

- [ ] **Step 5: פתח `SystemUser.cs` והוסף אימות OTP בתחילת מתודת `Register`, לפני `ValidateOrThrow`:**

מצא את השורה:
```csharp
PasswordPolicyValidator.ValidateOrThrow(request.Password);
```

הוסף לפניה:
```csharp
OtpService otpService = new OtpService(
    new ConfigurationBuilder()
        .SetBasePath(Directory.GetCurrentDirectory())
        .AddJsonFile("appsettings.json", optional: false)
        .AddJsonFile("appsettings.Development.json", optional: true)
        .AddEnvironmentVariables()
        .Build()
);

if (!otpService.VerifyOtp(request.Email, request.OtpCode))
    throw new Exception("קוד האימות אינו תקף או פג תוקפו");
```

- [ ] **Step 6: הרץ `dotnet build` ואמת שאין שגיאות**

```bash
dotnet build
```

- [ ] **Step 7: Commit**

```bash
git add RideOnServer/BL/DTOs/Auth/SendOtpRequest.cs RideOnServer/BL/DTOs/Auth/ForgotPasswordRequest.cs RideOnServer/BL/DTOs/Auth/ResetPasswordRequest.cs RideOnServer/BL/DTOs/Auth/RegisterRequest.cs RideOnServer/BL/SystemUser.cs
git commit -m "feat: add auth DTOs and OTP verification step in Register"
```

---

## Task 9: Controller — 3 Endpoints חדשים

**Files:**
- Modify: `RideOnServer/Controllers/SystemUsersController.cs`

- [ ] **Step 1: פתח `SystemUsersController.cs` והוסף את 3 ה-methods הבאים לפני הסוגר האחרון של הקלאס (לפני `}`)**

```csharp
[HttpPost("send-otp")]
public IActionResult SendOtp([FromBody] SendOtpRequest request)
{
    try
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest("כתובת מייל נדרשת");

        OtpService otpService = new OtpService(_configuration);
        otpService.SendAndStoreOtp(request.Email);
        return Ok(new { message = "קוד אימות נשלח למייל" });
    }
    catch (Exception ex)
    {
        return BadRequest(ex.Message);
    }
}

[HttpPost("forgot-password")]
public IActionResult ForgotPassword([FromBody] ForgotPasswordRequest request)
{
    try
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest("כתובת מייל נדרשת");

        PasswordResetService service = new PasswordResetService(_configuration);
        service.RequestReset(request.Email);

        // תמיד מחזיר הצלחה — לא מגלים אם המייל קיים
        return Ok(new { message = "אם המייל קיים במערכת, ישלח אליך קישור לאיפוס" });
    }
    catch (Exception ex)
    {
        return BadRequest(ex.Message);
    }
}

[HttpPost("reset-password")]
public IActionResult ResetPassword([FromBody] ResetPasswordRequest request)
{
    try
    {
        if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.NewPassword))
            return BadRequest("פרטים חסרים");

        PasswordResetService service = new PasswordResetService(_configuration);
        service.ResetPassword(request.Token, request.NewPassword);
        return Ok(new { message = "הסיסמה אופסה בהצלחה" });
    }
    catch (Exception ex)
    {
        return BadRequest(ex.Message);
    }
}
```

- [ ] **Step 2: הוסף את ה-using החסר בראש הקובץ (אם לא קיים):**

```csharp
using RideOnServer.BL;
```

- [ ] **Step 3: הרץ `dotnet build` ואמת שאין שגיאות**

```bash
dotnet build
```

- [ ] **Step 4: הפעל את השרת והכנס ל-Swagger על `http://localhost:5258/swagger`**

אמת שרואים 3 endpoints חדשים:
- `POST /api/SystemUsers/send-otp`
- `POST /api/SystemUsers/forgot-password`
- `POST /api/SystemUsers/reset-password`

- [ ] **Step 5: Commit**

```bash
git add RideOnServer/Controllers/SystemUsersController.cs
git commit -m "feat: add send-otp, forgot-password, reset-password endpoints"
```

---

## Task 10: authService.js — 3 פונקציות חדשות

**Files:**
- Modify: `RideOnClient/rideon-client/web/src/services/authService.js`

- [ ] **Step 1: פתח `authService.js` והוסף 3 פונקציות לפני ה-`export`:**

```javascript
function sendOtp(email) {
  return axios.post(`${API}/SystemUsers/send-otp`, { email });
}

function forgotPassword(email) {
  return axios.post(`${API}/SystemUsers/forgot-password`, { email });
}

function resetPassword(token, newPassword) {
  return axios.post(`${API}/SystemUsers/reset-password`, { token, newPassword });
}
```

- [ ] **Step 2: הוסף את שלושת הפונקציות לרשימת ה-export:**

```javascript
export {
  login,
  loginSuperUser,
  register,
  createRanchRequest,
  getRanches,
  getRoles,
  changePassword,
  changeSuperUserPassword,
  checkUsername,
  getPersonByNationalIdForRegistration,
  sendOtp,
  forgotPassword,
  resetPassword,
};
```

- [ ] **Step 3: Commit**

```bash
git add RideOnClient/rideon-client/web/src/services/authService.js
git commit -m "feat: add sendOtp, forgotPassword, resetPassword to authService"
```

---

## Task 11: ForgotPasswordScreen.jsx — מסך שכחתי סיסמה

**Files:**
- Create: `RideOnClient/rideon-client/web/src/pages/auth/ForgotPasswordScreen.jsx`

- [ ] **Step 1: צור `ForgotPasswordScreen.jsx`:**

```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../../services/authService";

export default function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("נא להזין כתובת מייל");
      return;
    }

    setIsLoading(true);

    try {
      await forgotPassword(email.trim());
      setSubmitted(true);
    } catch {
      setErrorMessage("אירעה שגיאה. נסה שוב מאוחר יותר.");
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5EDE8]" dir="rtl">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <h2 className="mb-4 text-2xl font-bold text-[#4E342E]">בדוק את תיבת הדואר</h2>
          <p className="text-[#5D4037] mb-6">
            אם המייל קיים במערכת, ישלח אליך קישור לאיפוס הסיסמה.
          </p>
          <button
            onClick={function () { navigate("/login"); }}
            className="text-[#795548] hover:underline text-sm"
          >
            חזרה לכניסה
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5EDE8]" dir="rtl">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h2 className="mb-2 text-center text-2xl font-bold text-[#4E342E]">שכחתי סיסמה</h2>
        <p className="mb-6 text-center text-sm text-[#8D6E63]">
          הזן את כתובת המייל שלך ונשלח לך קישור לאיפוס הסיסמה.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-[#5D4037]">כתובת מייל</label>
            <input
              type="email"
              value={email}
              onChange={function (e) { setEmail(e.target.value); }}
              className="w-full rounded-xl border border-[#D7CCC8] px-4 py-2 text-right focus:border-[#795548] focus:outline-none"
              placeholder="example@email.com"
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#795548] py-2 text-white transition hover:bg-[#6D4C41] disabled:opacity-60"
          >
            {isLoading ? "שולח..." : "שלח קישור לאיפוס"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#6D4C41]">
          <span
            onClick={function () { navigate("/login"); }}
            className="cursor-pointer font-semibold text-[#795548] hover:underline"
          >
            חזרה לכניסה
          </span>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add RideOnClient/rideon-client/web/src/pages/auth/ForgotPasswordScreen.jsx
git commit -m "feat: add ForgotPasswordScreen"
```

---

## Task 12: ResetPasswordScreen.jsx — מסך איפוס סיסמה

**Files:**
- Create: `RideOnClient/rideon-client/web/src/pages/auth/ResetPasswordScreen.jsx`

- [ ] **Step 1: צור `ResetPasswordScreen.jsx`:**

```jsx
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { resetPassword } from "../../services/authService";

export default function ResetPasswordScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    if (!newPassword || !confirmPassword) {
      setErrorMessage("נא למלא את כל השדות");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("הסיסמאות אינן תואמות");
      return;
    }

    if (!token) {
      setErrorMessage("קישור האיפוס אינו תקף");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(function () { navigate("/login"); }, 3000);
    } catch (err) {
      setErrorMessage(
        err?.response?.data || "הקישור אינו תקף או פג תוקפו. בקש קישור חדש."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5EDE8]" dir="rtl">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <h2 className="mb-4 text-2xl font-bold text-[#4E342E]">הסיסמה אופסה בהצלחה</h2>
          <p className="text-[#5D4037]">מועבר למסך הכניסה...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5EDE8]" dir="rtl">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h2 className="mb-2 text-center text-2xl font-bold text-[#4E342E]">איפוס סיסמה</h2>
        <p className="mb-6 text-center text-sm text-[#8D6E63]">בחר סיסמה חדשה לחשבון שלך.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-[#5D4037]">סיסמה חדשה</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={function (e) { setNewPassword(e.target.value); }}
                className="w-full rounded-xl border border-[#D7CCC8] px-4 py-2 pl-11 text-right focus:border-[#795548] focus:outline-none"
              />
              <button
                type="button"
                onClick={function () { setShowNew(function (p) { return !p; }); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D6E63] hover:text-[#5D4037]"
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#5D4037]">אימות סיסמה</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={function (e) { setConfirmPassword(e.target.value); }}
                className="w-full rounded-xl border border-[#D7CCC8] px-4 py-2 pl-11 text-right focus:border-[#795548] focus:outline-none"
              />
              <button
                type="button"
                onClick={function () { setShowConfirm(function (p) { return !p; }); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D6E63] hover:text-[#5D4037]"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#795548] py-2 text-white transition hover:bg-[#6D4C41] disabled:opacity-60"
          >
            {isLoading ? "מאפס..." : "אפס סיסמה"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add RideOnClient/rideon-client/web/src/pages/auth/ResetPasswordScreen.jsx
git commit -m "feat: add ResetPasswordScreen"
```

---

## Task 13: LoginScreen.jsx — הוספת Popup אישור

**Files:**
- Modify: `RideOnClient/rideon-client/web/src/pages/auth/LoginScreen.jsx`

- [ ] **Step 1: פתח `LoginScreen.jsx` והוסף state לניהול ה-popup — לאחר שאר ה-useState:**

```javascript
const [showForgotPopup, setShowForgotPopup] = useState(false);
```

- [ ] **Step 2: שנה את הכפתור "שכחתי סיסמה" — במקום לנווט ישירות, פתח popup:**

**מצא:**
```javascript
onClick={function () {
  navigate("/forgot-password");
}}
```

**החלף ב:**
```javascript
onClick={function () {
  setShowForgotPopup(true);
}}
```

- [ ] **Step 3: הוסף את ה-Popup לפני ה-`return` הראשי (אחרי השורה `const [showForgotPopup, setShowForgotPopup] = useState(false);` ולפני `return (`):**

הוסף את הבלוק הבא **בתוך** ה-JSX הראשי, לפני הסוגר האחרון של `</div>`:

```jsx
{showForgotPopup && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
      <h3 className="mb-3 text-lg font-bold text-[#4E342E]">איפוס סיסמה</h3>
      <p className="mb-6 text-sm text-[#5D4037]">
        לאיפוס הסיסמה ישלח קישור למייל הרשום שלך. להמשיך?
      </p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={function () { setShowForgotPopup(false); }}
          className="rounded-xl border border-[#D7CCC8] px-4 py-2 text-sm text-[#5D4037] hover:bg-[#F5EDE8]"
        >
          ביטול
        </button>
        <button
          onClick={function () {
            setShowForgotPopup(false);
            navigate("/forgot-password");
          }}
          className="rounded-xl bg-[#795548] px-4 py-2 text-sm text-white hover:bg-[#6D4C41]"
        >
          כן, שלח לי קישור
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: פתח את הדפדפן, עבור למסך הכניסה, לחץ "שכחתי סיסמה" ואמת שה-Popup מופיע**

- [ ] **Step 5: Commit**

```bash
git add RideOnClient/rideon-client/web/src/pages/auth/LoginScreen.jsx
git commit -m "feat: add forgot-password confirmation popup in LoginScreen"
```

---

## Task 14: RegisterScreen.jsx — הוספת שלב OTP

**Files:**
- Modify: `RideOnClient/rideon-client/web/src/pages/auth/RegisterScreen.jsx`

- [ ] **Step 1: פתח `RegisterScreen.jsx` והוסף import לפונקציה `sendOtp`:**

**מצא:**
```javascript
import {
  register,
  createRanchRequest,
  getRanches,
  getRoles,
  checkUsername,
  getPersonByNationalIdForRegistration,
} from "../../services/authService";
```

**החלף ב:**
```javascript
import {
  register,
  createRanchRequest,
  getRanches,
  getRoles,
  checkUsername,
  getPersonByNationalIdForRegistration,
  sendOtp,
} from "../../services/authService";
```

- [ ] **Step 2: הוסף states לניהול ה-OTP — לאחר שאר ה-useState בתחילת הקומפוננטה:**

```javascript
const [otpSent, setOtpSent] = useState(false);
const [otpCode, setOtpCode] = useState("");
const [otpLoading, setOtpLoading] = useState(false);
const [otpError, setOtpError] = useState("");
const [otpSuccess, setOtpSuccess] = useState("");
```

- [ ] **Step 3: הוסף פונקציה לשליחת OTP — לאחר פונקציות עזר קיימות (לאחר `resetPersonDetailsKeepNationalId`):**

```javascript
async function handleSendOtp() {
  setOtpError("");
  setOtpSuccess("");

  if (!form.email || !form.email.includes("@")) {
    setOtpError("נא להזין כתובת מייל תקינה");
    return;
  }

  setOtpLoading(true);

  try {
    await sendOtp(form.email.trim());
    setOtpSent(true);
    setOtpSuccess("קוד נשלח למייל שלך");
  } catch {
    setOtpError("שגיאה בשליחת קוד האימות. נסה שוב.");
  } finally {
    setOtpLoading(false);
  }
}
```

- [ ] **Step 4: עדכן את `form` להכיל שדה `otpCode` — מצא:**

```javascript
const [form, setForm] = useState({
  nationalId: "",
  firstName: "",
  lastName: "",
  gender: "",
  dateOfBirth: "",
  cellPhone: "",
  email: "",
  username: "",
  password: "",
  confirmPassword: "",
});
```

**אין צורך לשנות** — `otpCode` מנוהל בנפרד ב-state `otpCode`.

- [ ] **Step 5: עדכן את הנתונים שנשלחים ב-register — מצא את הקריאה ל-`register(...)` ועדכן כך שתכלול `otpCode`:**

חפש בקובץ את הקריאה ל-`register(` ועדכן את האובייקט שנשלח להכיל:
```javascript
otpCode: otpCode,
```

לדוגמה, אם הקריאה היא:
```javascript
await register({
  ...form,
  ranchRoles: ranchRolePairs.map(...),
});
```

שנה ל:
```javascript
await register({
  ...form,
  otpCode: otpCode,
  ranchRoles: ranchRolePairs.map(...),
});
```

- [ ] **Step 6: מצא את החלק בטופס שמציג את שדה המייל והוסף אחריו את בלוק ה-OTP**

חפש בקובץ את השדה של המייל (label עם "אימייל" או "מייל") והוסף אחריו את הבלוק הבא:

```jsx
{/* שלב OTP */}
<div className="mt-3 space-y-2">
  <button
    type="button"
    onClick={handleSendOtp}
    disabled={otpLoading || !form.email}
    className="w-full rounded-xl border border-[#795548] py-2 text-sm text-[#795548] hover:bg-[#F5EDE8] disabled:opacity-50"
  >
    {otpLoading ? "שולח קוד..." : otpSent ? "שלח קוד חדש" : "שלח קוד אימות למייל"}
  </button>

  {otpSuccess && (
    <p className="text-sm text-green-600 text-right">{otpSuccess}</p>
  )}
  {otpError && (
    <p className="text-sm text-red-600 text-right">{otpError}</p>
  )}

  {otpSent && (
    <div>
      <label className="mb-1 block text-sm text-[#5D4037]">קוד אימות</label>
      <input
        type="text"
        value={otpCode}
        onChange={function (e) { setOtpCode(e.target.value); }}
        className="w-full rounded-xl border border-[#D7CCC8] px-4 py-2 text-right focus:border-[#795548] focus:outline-none"
        placeholder="הזן את הקוד שקיבלת במייל"
        maxLength={6}
      />
    </div>
  )}
</div>
```

- [ ] **Step 7: מצא את כפתור "הירשם" (כפתור ה-submit הסופי) והוסף לו תנאי disabled:**

מצא:
```jsx
disabled={isLoading}
```

שנה ל:
```jsx
disabled={isLoading || !otpCode}
```

- [ ] **Step 8: הפעל את הפרונטאנד ועבור למסך ההרשמה — אמת שכפתור "שלח קוד אימות" מופיע ושכפתור "הירשם" מוגרע עד שמזינים קוד**

- [ ] **Step 9: Commit**

```bash
git add RideOnClient/rideon-client/web/src/pages/auth/RegisterScreen.jsx
git commit -m "feat: add OTP verification step to RegisterScreen"
```

---

## Task 15: Router — עדכון נתיבים

**Files:**
- Modify: `RideOnClient/rideon-client/web/src/router/router.jsx`

- [ ] **Step 1: פתח `router.jsx` והוסף imports בראש הקובץ:**

```javascript
import ForgotPasswordScreen from "../pages/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../pages/auth/ResetPasswordScreen";
```

- [ ] **Step 2: מצא את ה-route של `/forgot-password` (כרגע מציג div זמני) והחלף אותו:**

**מצא:**
```javascript
{
  path: "/forgot-password",
  element: (
    <PublicRoute>
      <div dir="rtl" className="p-6">
        מסך שכחתי סיסמה ייבנה בהמשך
      </div>
    </PublicRoute>
  ),
},
```

**החלף ב:**
```javascript
{
  path: "/forgot-password",
  element: (
    <PublicRoute>
      <ForgotPasswordScreen />
    </PublicRoute>
  ),
},
{
  path: "/reset-password",
  element: (
    <PublicRoute>
      <ResetPasswordScreen />
    </PublicRoute>
  ),
},
```

- [ ] **Step 3: פתח את הדפדפן ועבור ל-`http://localhost:5173/forgot-password` — אמת שמסך "שכחתי סיסמה" מופיע**

- [ ] **Step 4: Commit**

```bash
git add RideOnClient/rideon-client/web/src/router/router.jsx
git commit -m "feat: add forgot-password and reset-password routes"
```

---

## Task 16: בדיקת זרימה מלאה (End-to-End)

- [ ] **Step 1: בדיקת OTP בהרשמה**
  1. פתח `http://localhost:5173/register`
  2. מלא טופס הרשמה עם מייל אמיתי שאתה יכול לגשת אליו
  3. לחץ "שלח קוד אימות" — בדוק שהגיע מייל עם קוד 6 ספרות
  4. הזן את הקוד
  5. לחץ "הירשם" — אמת שההרשמה הצליחה

- [ ] **Step 2: בדיקת שכחתי סיסמה**
  1. פתח `http://localhost:5173/login`
  2. לחץ "שכחתי סיסמה" — אמת שה-Popup מופיע
  3. לחץ "כן, שלח לי קישור" — אמת שמנווט ל-`/forgot-password`
  4. הזן מייל של משתמש קיים ולחץ "שלח קישור לאיפוס"
  5. בדוק שהגיע מייל עם קישור
  6. לחץ על הקישור במייל — אמת שמגיע ל-`/reset-password?token=...`
  7. הזן סיסמה חדשה ולחץ "אפס סיסמה"
  8. אמת שמנווט חזרה לכניסה
  9. התחבר עם הסיסמה החדשה — אמת שעובד

- [ ] **Step 3: בדיקת מקרים שגויים**
  - OTP שגוי בהרשמה — אמת שמתקבל שגיאה בעברית
  - טוקן פג תוקף — אמת שמתקבלת הודעה "הקישור אינו תקף"
  - מייל לא קיים ב-forgot-password — אמת שמוצגת אותה הודעת הצלחה (לא מגלים)

- [ ] **Step 4: Commit סיום**

```bash
git add .
git commit -m "feat: complete OTP registration verification and password reset flow"
```
