# RideOn

מערכת לניהול תחרויות רכיבה (Horse Competition Management System), הבנויה סביב תהליכי עבודה
של תחרויות **Reining**, עם ארכיטקטורה שמאפשרת בעתיד הרחבה גם לענפי רכיבה נוספים.

פרויקט גמר אקדמי (final project) הכולל שרת ASP.NET Core, קליינט Web ב-React וקליינט מובייל
ב-React Native / Expo, מול בסיס נתונים PostgreSQL המתארח ב-Supabase.

> מסמך זה נועד לאפשר לבודק/בודקת שלא הכיר/ה את הפרויקט קודם להבין את המערכת, להריץ אותה
> מקומית ולבצע בה בדיקות, ללא צורך בגישה לסודות הפרודקשן הפרטיים של הצוות.

---

## תוכן עניינים

1. [מבוא לפרויקט](#מבוא-לפרויקט)
2. [תפקידי משתמשים](#תפקידי-משתמשים)
3. [ארכיטקטורת המערכת](#ארכיטקטורת-המערכת)
4. [מבנה הריפוזיטורי](#מבנה-הריפוזיטורי)
5. [דרישות מקדימות](#דרישות-מקדימות)
6. [התקנה ראשונית](#התקנה-ראשונית)
7. [השרת (RideOnServer) — הרצה](#השרת-rideonserver--הרצה)
8. [הגדרות ו-Secrets של השרת](#הגדרות-ו-secrets-של-השרת)
9. [ה-Web Client — הרצה](#ה-web-client--הרצה)
10. [המובייל (Expo) — הרצה](#המובייל-expo--הרצה)
11. [בסיס הנתונים / Supabase](#בסיס-הנתונים--supabase)
12. [הפעלת כל חלקי המערכת לצורך בדיקה / הדגמה](#הפעלת-כל-חלקי-המערכת-לצורך-בדיקה--הדגמה)
13. [בדיקות ו-Build](#בדיקות-ו-build)
14. [בסיס בדיקות ידוע (Known Test Baseline)](#בסיס-בדיקות-ידוע-known-test-baseline)
15. [הערות פריסה (Deployment)](#הערות-פריסה-deployment)
16. [אבטחה](#אבטחה)
17. [מגבלות ידועות / הערות למסירה](#מגבלות-ידועות--הערות-למסירה)
18. [פרויקט גמר](#פרויקט-גמר)

---

## מבוא לפרויקט

RideOn היא מערכת לניהול תחרויות רכיבה מסוג Reining עבור חוות (ranches) המארחות תחרויות.
המערכת מנהלת, בין היתר, את התהליכים הבאים (מבוסס על הפיצ'רים הקיימים בפועל בקוד):

- ניהול **תחרויות** (Competitions), **מחלקות** (Classes) ושיוכן לתחרות
- ניהול **שופטים** (Judges), **תבניות Reining** (Patterns) ותרגילים (Maneuvers)
- **הרשמה** (Registration) לתחרויות וניהול שלבי הרשמה (Registration Step Status)
- **תשלומים** על תחרויות (Competition Payments), כולל תשלומים/קנסות מול פדרציה
  (Federation Members, Fines)
- **Paid Time** — הזמנת זמני אימון בתשלום וניהולם
- **הזמנת תאים (Stalls)**, מפת תאים (Stall Map) ושיוך תאים
- **נסורת (Shavings)** — הזמנות והספקה
- **סדר יציאה (Draw Order)** ותזמון אוטומטי של מחזורים (Auto Scheduler)
- **תעודות בריאות לסוסים** (Health Certificates) כולל העלאת קבצים ואישור/דחייה
- ניהול **סוסים** (Horses), **חוות** (Ranches) ומשתמשי מערכת
- תהליכי **Secretary / Admin / Payer / Worker**, כולל מסכי מובייל ייעודיים לכל תפקיד
- מודול חיזוי היקף כניסות לתחרות (Entry Prediction) — מודל סטטיסטי המוטמע בשכבת ה-BL
  של השרת (`PredictionService`), עם חומרי מחקר/אימון נלווים בתיקיות `data/`, `models/`
  ו-`Smart_Element/` (ראו [מבנה הריפוזיטורי](#מבנה-הריפוזיטורי))

---

## תפקידי משתמשים

תפקידי המשתמשים במערכת מוגדרים במפורש בקוד השרת
([`RideOnServer/BL/RoleNames.cs`](RideOnServer/BL/RoleNames.cs)):

| תפקיד (קוד) | שם בעברית | שימוש עיקרי |
|---|---|---|
| `HostSecretary` | מזכירת חווה מארחת | ניהול תחרות מטעם החווה המארחת: מחלקות, הרשמות, סדר יציאה, תשלומים, תעודות בריאות |
| `RanchAdmin` | אדמין חווה | ניהול כלל ההגדרות והמשאבים של חווה (תאים, מחירי שירותים, משתמשים) |
| `RanchWorker` | עובד חווה | ביצוע משימות תפעוליות בשטח (למשל טיפול בהזמנות נסורת, תאים) |
| `Payer` | משלם | הרשמת סוסים/רוכבים, תשלום עבור שירותים, מעקב חיובים |
| `SuperUser` | — | ניהול-על ברמת המערכת כולה |

התפקידים הללו נאכפים בשרת (Authorization) ומשתקפים גם בממשקי ה-Web וה-Mobile, שמציגים תפריטים
ומסכים שונים לכל תפקיד.

---

## ארכיטקטורת המערכת

### מבט כללי

```
┌────────────────────┐      ┌──────────────────────┐
│   React Web Client  │      │  React Native / Expo │
│  (RideOnClient/web) │      │ (RideOnClient/mobile) │
└──────────┬───────────┘      └──────────┬────────────┘
           │  HTTPS / REST (JSON)                     │
           └───────────────────┬───────────────────────┘
                                ▼
                    ┌────────────────────────┐
                    │   ASP.NET Core Server   │
                    │      (RideOnServer)     │
                    │  Controller → BL → DAL  │
                    └───────────┬─────────────┘
                                │ Npgsql
                                ▼
                    ┌────────────────────────┐
                    │  PostgreSQL (Supabase)  │
                    │   Stored Procedures     │
                    └────────────┬─────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │   Supabase Storage      │
                    │ (Health Certificates)   │
                    └────────────────────────┘
```

### קליינטים (Clients)

- **React Web** — `RideOnClient/rideon-client/web` — React 19 + Vite, מיועד למחשבי Desktop
  (בעיקר לתפקידי Secretary/Admin).
- **React Native / Expo Mobile** — `RideOnClient/rideon-client/mobile` — Expo SDK 54,
  React Native 0.81, מיועד למשתמשי Payer/Worker/Admin בנייד.
- שני הקליינטים משתפים קוד משותף בתיקיית `RideOnClient/rideon-client/shared`.

### שרת (Server)

- **ASP.NET Core Web API** ב-C#, בפרויקט `RideOnServer` (`.NET 8`, ראו
  [RideOnServer.csproj](RideOnServer/RideOnServer.csproj)).
- אימות משתמשים מבוסס **JWT** (`Microsoft.AspNetCore.Authentication.JwtBearer`).
- תיעוד API אוטומטי דרך **Swagger / Swashbuckle** (`/swagger` בזמן ריצה).
- Rate Limiting מובנה (`Microsoft.AspNetCore.RateLimiting`) על נקודות קצה רגישות (למשל חיפוש
  משתמשים לפי מספר זהות).
- שליחת מיילים (איפוס סיסמה וכו') דרך **MailKit / SMTP**.
- ייצוא נתונים ל-Excel דרך **ClosedXML**.

### שכבות השרת (Layers)

```
Controller  →  BL (Business Logic)  →  DAL (Data Access)  →  Stored Procedure  →  PostgreSQL
```

| שכבה | תיקייה | אחריות |
|---|---|---|
| Controllers | [`RideOnServer/Controllers`](RideOnServer/Controllers) | קבלת בקשות HTTP, ולידציית קלט, אכיפת הרשאות לפי תפקיד, החזרת תשובות JSON |
| BL | [`RideOnServer/BL`](RideOnServer/BL) | לוגיקה עסקית: מודלים, שירותים (Email, JWT, Password), אלגוריתמי תזמון וחיזוי |
| DAL | [`RideOnServer/DAL`](RideOnServer/DAL) | גישה לבסיס הנתונים דרך Npgsql, קריאה ל-Stored Procedures |
| Stored Procedures | [`RideOnDB/StoredProcedures/PostgreSQL`](RideOnDB/StoredProcedures/PostgreSQL) | לוגיקה עסקית משמעותית המבוצעת בתוך בסיס הנתונים (PL/pgSQL) |
| PostgreSQL | Supabase (מרוחק) | אחסון הנתונים |

### שירותים חיצוניים

| שירות | היכן משתמשים | הערה |
|---|---|---|
| **Supabase PostgreSQL** | DAL בשרת, דרך Npgsql | בסיס הנתונים הראשי של המערכת |
| **Supabase Storage** | `HorsesController` (העלאת תעודות בריאות) | Bucket ייעודי לתעודות בריאות |
| **SMTP (Email)** | `EmailService` | שליחת מיילים (למשל איפוס סיסמה) |
| **Google Maps JavaScript API** | Web (`@react-google-maps/api`) ו-Mobile (`RanchLocationPickerMobile.jsx`) | בחירת מיקום חווה על מפה |
| **Render** | אחסון השרת בפרודקשן | ראו [הערות פריסה](#הערות-פריסה-deployment) |

---

## מבנה הריפוזיטורי

מבנה התיקיות המרכזיות בלבד (לא כל קובץ בפרויקט):

```
RideOn-Project/
├── RideOnServer/              # שרת ASP.NET Core (C#) — Controllers, BL, DAL, Program.cs, Dockerfile
├── RideOnServer.Tests/        # פרויקט בדיקות xUnit לשרת (בדיקות יחידה + "contract tests")
├── RideOnDB/
│   ├── schema.sql             # תיעוד הסכמה (עיון בלבד — לא סקריפט הרצה, ראו הערה בהמשך)
│   ├── migrations/            # סקריפטי מיגרציה מצטברים (ALTER וכו')
│   └── StoredProcedures/PostgreSQL/   # קבצי Stored Procedures בפועל (PL/pgSQL)
├── RideOnClient/
│   └── rideon-client/
│       ├── web/                # קליינט Web — React + Vite
│       ├── mobile/             # קליינט מובייל — React Native + Expo
│       └── shared/              # קוד/נכסים משותפים בין web ל-mobile
├── data/                       # נתוני מחקר/אימון עבור מודל חיזוי הכניסות (CSV, לא נטען בזמן ריצה)
├── models/                     # קבצי מודל מאומן (pkl/json) עבור חיזוי כניסות — חומר עזר, לא נטען אוטומטית ע"י השרת
├── Smart_Element/              # מחברת Jupyter (Data Science) לניתוח/הכנת נתונים למודל החיזוי
└── docs/                       # מסמכי עזר נוספים (שאילתות SQL למודל, מסמך אודות Paid Time וכו')
```

> **הערה:** תיקיות `data/`, `models/` ו-`Smart_Element/` הן חומרי מחקר/אימון עבור מודל חיזוי
> הכניסות. השרת עצמו (`RideOnServer/BL/PredictionService.cs`) מכיל את לוגיקת החיזוי המוטמעת
> ב-C#, ואינו טוען את קבצי ה-`.pkl`/`.json` הללו בזמן ריצה.

---

## דרישות מקדימות

| רכיב | גרסה נדרשת | מקור האימות |
|---|---|---|
| **.NET SDK** | **.NET 8** (`net8.0`) | [`RideOnServer.csproj`](RideOnServer/RideOnServer.csproj), [`Dockerfile`](RideOnServer/Dockerfile) — `mcr.microsoft.com/dotnet/sdk:8.0` |
| **Node.js / npm** | לא מוצמדת גרסה בריפוזיטורי (אין `engines` ב-`package.json`, אין `.nvmrc`) | יש להשתמש בגרסת **Node LTS** עדכנית שתומכת ב-Vite 7 ו-Expo SDK 54 (בפועל נבדק מול Node 18+/20+) |
| **Git** | כל גרסה עדכנית | — |
| **Expo Go** (לבדיקה על מכשיר פיזי) או אמולטור Android/iOS | — | נדרש כדי להריץ את קליינט המובייל |
| **גישה לפרויקט Supabase** (URL + מפתחות) | — | נדרש כדי להריץ את השרת מול בסיס נתונים אמיתי; ראו [בסיס הנתונים / Supabase](#בסיס-הנתונים--supabase) |
| **Docker** (אופציונלי) | — | קיים `Dockerfile` בפרויקט השרת; ריצה עם Docker אינה חובה |

---

## התקנה ראשונית

```bash
git clone https://github.com/Danielle444/RideOn-Project.git
cd RideOn-Project
```

מכאן, יש להגדיר בנפרד כל אחד משלושת החלקים: שרת, Web, Mobile — ראו הסעיפים הבאים.

---

## השרת (RideOnServer) — הרצה

### הרצה ישירה עם ה-.NET SDK

```bash
cd RideOnServer
dotnet restore
dotnet build
dotnet run
```

לאחר ההרצה, השרת מאזין (לפי `Properties/launchSettings.json`) על:

- `http://localhost:5268`
- `https://localhost:7281`

וממשק ה-Swagger UI נפתח אוטומטית תחת הנתיב `/swagger`.

> לפני ההרצה יש להגדיר את הגדרות ה-Configuration הנדרשות (ראו הסעיף הבא) — אחרת השרת ייכשל
> בעת ניסיון חיבור לבסיס הנתונים.

### הרצה עם Docker

בריפוזיטורי קיים [`RideOnServer/Dockerfile`](RideOnServer/Dockerfile) המבצע Build ו-Publish
של השרת (`.NET 8 SDK` ל-Build, `.NET 8 ASP.NET Runtime` ל-Runtime), ומאזין בתוך הקונטיינר על
פורט `10000` (`ASPNETCORE_URLS=http://+:10000`).

```bash
cd RideOnServer
docker build -t rideon-server .
docker run -p 10000:10000 --env-file <path-to-your-env-file> rideon-server
```

> תיעוד זה בלבד — אין הנחה שסביבת ההרצה במכללה תומכת ב-Docker. זו אפשרות שהריפוזיטורי תומך
> בה, לא דרישה.

---

## הגדרות ו-Secrets של השרת

**חשוב:** הריפוזיטורי **אינו** מכיל ערכי סוד אמיתיים (סיסמאות, מפתחות, מחרוזות חיבור).
`appsettings.json` הנוכחי מכיל רק הגדרות Logging כלליות, ו-`appsettings.Development.json`
מכיל ערך לא-רגיש אחד בלבד (`App:WebBaseUrl`). כל שאר הערכים חייבים להיות מסופקים דרך
משתני סביבה (Environment Variables), User Secrets, או קובץ `appsettings` מקומי שאינו נכלל
ב-Git.

השרת קורא הגדרות בסדר הבא (סטנדרטי ל-ASP.NET Core, ראו
[`DAL/DBServices.cs`](RideOnServer/DAL/DBServices.cs)):
`appsettings.json` → `appsettings.Development.json` (אופציונלי) → User Secrets → **משתני
סביבה** (העדיפות הגבוהה ביותר בפועל בסביבות הריצה של הפרויקט).

| מפתח (Key) | מטרה | חובה? | סוד? |
|---|---|---|---|
| `ConnectionStrings:DefaultConnection` | מחרוזת חיבור ל-PostgreSQL (Supabase) | כן | **כן** |
| `Jwt:Issuer` | Issuer של טוקן JWT | כן | לא |
| `Jwt:Audience` | Audience של טוקן JWT | כן | לא |
| `Jwt:Key` | מפתח חתימת JWT (סימטרי) | כן | **כן** |
| `Jwt:Subject` | ערך ברירת מחדל ל-Subject בטוקן | כן | לא |
| `Jwt:ExpirationHours` | תוקף הטוקן בשעות | לא (יש נפילה לברירת מחדל בקוד) | לא |
| `Email:SmtpHost` | שרת SMTP לשליחת מייל | כן (לפיצ'רי מייל) | לא |
| `Email:SmtpPort` | פורט SMTP | כן (לפיצ'רי מייל) | לא |
| `Email:SmtpUsername` | שם משתמש SMTP | כן (לפיצ'רי מייל) | **כן** |
| `Email:SmtpPassword` | סיסמת SMTP | כן (לפיצ'רי מייל) | **כן** |
| `Email:FromAddress` | כתובת השולח במיילים | כן (לפיצ'רי מייל) | לא |
| `Email:FromName` | שם השולח במיילים | כן (לפיצ'רי מייל) | לא |
| `Supabase:Url` | כתובת ה-Supabase project | כן (להעלאת תעודות בריאות) | לא (URL ציבורי) |
| `Supabase:ServiceRoleKey` | מפתח Service-Role של Supabase | כן (להעלאת תעודות בריאות) | **כן — קריטי** |
| `Supabase:HealthCertificatesBucket` | שם ה-Bucket לתעודות בריאות | לא (ברירת מחדל: `health-certificates`) | לא |
| `ClientBaseUrl` | כתובת בסיס לקישורים ללקוח (למשל בקישורי איפוס סיסמה) | לא (ברירת מחדל: `http://localhost:5173`) | לא |
| `App:WebBaseUrl` | כתובת בסיס נוספת המשמשת חלקים אחרים בקוד | לא (ברירת מחדל: `http://localhost:5173`) | לא |

### הגדרה דרך משתני סביבה

`AddEnvironmentVariables()` ב-ASP.NET Core תומך במיפוי היררכי סטנדרטי של `IConfiguration`
באמצעות תו הפרדה כפול-קו-תחתון (`__`) במקום `:`. לדוגמה:

```bash
ConnectionStrings__DefaultConnection=<your-postgres-connection-string>
Jwt__Issuer=<your-issuer>
Jwt__Audience=<your-audience>
Jwt__Key=<your-jwt-signing-key>
Supabase__Url=<your-supabase-project-url>
Supabase__ServiceRoleKey=<your-supabase-service-role-key>
```

**לעולם אין להזין כאן ערכים אמיתיים בתוך קבצים שנשמרים ל-Git.** יש להשתמש במשתני סביבה של
מערכת ההפעלה, ב-`dotnet user-secrets`, או בקובץ `.env` מקומי מחוץ למעקב Git.

---

## ה-Web Client — הרצה

נתיב הפרויקט: [`RideOnClient/rideon-client/web`](RideOnClient/rideon-client/web)

```bash
cd RideOnClient/rideon-client/web
npm ci
npm run dev      # הרצת סביבת פיתוח (Vite dev server)
npm run build    # בניית גרסת Production
```

שרת הפיתוח של Vite עולה בברירת המחדל שלו על `http://localhost:5173` (לא מוגדר פורט מותאם-אישית
ב-[`vite.config.js`](RideOnClient/rideon-client/web/vite.config.js)).

### הגדרות Web (משתני סביבה)

יש ליצור קובץ `.env` בתיקיית `RideOnClient/rideon-client/web` (הקובץ מוחרג מ-Git דרך
`.gitignore` המקומי של התיקייה). המפתחות בפועל בשימוש בקוד:

| מפתח | מטרה |
|---|---|
| `VITE_API_BASE_URL` | כתובת ה-API של השרת שאליו הקליינט פונה |
| `VITE_GOOGLE_MAPS_API_KEY` | מפתח Google Maps JavaScript API |

דוגמה (ללא ערכים אמיתיים):

```
VITE_API_BASE_URL=<SERVER_API_URL>
VITE_GOOGLE_MAPS_API_KEY=<GOOGLE_MAPS_KEY>
```

### הערה לפריסת Production

הריפוזיטורי אינו מכיל קובץ תצורה ייעודי לאירוח (לדוגמה `vercel.json`, `netlify.toml` או
`_redirects`). אירוח Static של אפליקציית ה-Web (שהיא Single Page Application עם
`react-router-dom`) בפרודקשן **דורש הגדרת SPA fallback routing** בצד השרת/הפלטפורמה המארחת,
כך שכל נתיב יוחזר אל `index.html` — הגדרה זו צריכה להתווסף בהתאם לפלטפורמת האירוח שתיבחר.

---

## המובייל (Expo) — הרצה

נתיב הפרויקט: [`RideOnClient/rideon-client/mobile`](RideOnClient/rideon-client/mobile)

```bash
cd RideOnClient/rideon-client/mobile
npm ci
npx expo start
```

- `npx expo start` מציג קוד QR: ניתן לסרוק אותו באפליקציית **Expo Go** (Android/iOS) כדי
  להריץ את האפליקציה על מכשיר פיזי, ללא צורך ב-Build מקומי.
- להרצה על אמולטור Android: `npm run android` (מריץ `expo start --android`).
- להרצה על סימולטור iOS: `npm run ios`.
- הפרויקט משתמש כיום ב-Expo (SDK 54) ללא תצורת **EAS Build** מנוהלת בריפוזיטורי — כלומר אין
  כרגע pipeline מוגדר ל-Production build מנוהל דרך EAS.

### חיבור לשרת (`apiBaseUrl.js`)

**חשוב מאוד:** בניגוד ל-Web, כתובת ה-API במובייל אינה נקראת ממשתנה סביבה אלא **מוגדרת בקוד
המקור** בקובץ
[`RideOnClient/rideon-client/mobile/src/config/apiBaseUrl.js`](RideOnClient/rideon-client/mobile/src/config/apiBaseUrl.js),
ומצביעה כיום על שרת ה-Production החי ב-Render:

```js
const API_BASE_URL = "https://rideon-project.onrender.com/api";
```

כדי להריץ את המובייל מול שרת אחר (למשל שרת מקומי שהורצתם בעצמכם), יש **לשנות ידנית** את הערך
בקובץ הזה ולהפעיל מחדש את קליינט המובייל (Reload / restart של Expo).

### Google Maps במובייל

מפתח Google Maps JavaScript API עבור רכיב בחירת מיקום החווה
(`src/components/profile/RanchLocationPickerMobile.jsx`) **מוטמע כערך קבוע בקוד המקור**, ולא
נקרא ממשתנה סביבה. זהו נתון תפעולי לתשומת לב לצורך פריסה/רוטציית מפתחות עתידית — ערך המפתח
עצמו אינו מובא כאן.

---

## בסיס הנתונים / Supabase

המערכת החיה (Working system) פועלת מול **PostgreSQL המתארח ב-Supabase**. ארגון בסיס הנתונים:

- **טבלאות/סכמה** — מתועדות ב-[`RideOnDB/schema.sql`](RideOnDB/schema.sql).
- **Stored Procedures** — קבצי PL/pgSQL בפועל תחת
  [`RideOnDB/StoredProcedures/PostgreSQL`](RideOnDB/StoredProcedures/PostgreSQL) (מאות קבצים).
  חלק ניכר מהלוגיקה העסקית (חישובי תשלומים, שיבוצים, ולידציות) מבוצע בפועל **בתוך** ה-SP-ים,
  ולא רק בשכבת ה-BL של השרת.
- **מיגרציות** — סקריפטי `ALTER`/תוספות מצטברות תחת
  [`RideOnDB/migrations`](RideOnDB/migrations), המתעדים שינויי סכמה הדרגתיים לאורך זמן.

### סביבת Supabase קיימת

אם סופקו לכם פרטי חיבור תקפים (Connection String + מפתחות Supabase), השרת יכול להתחבר
ישירות לבסיס הנתונים **הקיים** של הפרויקט, לפי ההגדרות שתוארו בסעיף
[הגדרות ו-Secrets של השרת](#הגדרות-ו-secrets-של-השרת).

### התקנת בסיס נתונים חדש (Fresh Install)

בשורת הכותרת של [`RideOnDB/schema.sql`](RideOnDB/schema.sql) מצוין במפורש:

> "This schema is for context only and is not meant to be run."

בהתאם לכך: **הריפוזיטורי אינו מספק כרגע סקריפט Bootstrap יחיד ומאומת ליצירת בסיס נתונים חדש
מאפס** (כולל כל הטבלאות, האילוצים, וסדר הרצה נכון של מאות ה-Stored Procedures). מי שרוצה
להקים סביבת Supabase עצמאית חדשה יצטרך לבנות תהליך כזה בעצמו על בסיס `schema.sql`,
`migrations/` ו-`StoredProcedures/PostgreSQL/` — סדר ההרצה הנכון בין קבצי ה-SP אינו מתועד
ולא נבדק כאן, ולכן אינו מומלץ לניסיון "עיוור".

לצורך בדיקה/הדגמה של הפרויקט, מומלץ להשתמש בסביבת Supabase הקיימת של הצוות (ראו לעיל).

---

## הפעלת כל חלקי המערכת לצורך בדיקה / הדגמה

לצורך הדגמה מלאה יש להריץ שלושה תהליכים במקביל, בשלושה טרמינלים נפרדים:

**טרמינל 1 — שרת:**
```bash
cd RideOnServer
dotnet run
```

**טרמינל 2 — Web:**
```bash
cd RideOnClient/rideon-client/web
npm run dev
```

**טרמינל 3 — מובייל:**
```bash
cd RideOnClient/rideon-client/mobile
npx expo start
```

לאחר ההרצה:

- יש לפתוח דפדפן בכתובת ש-Vite מציג (בדרך כלל `http://localhost:5173`) עבור ה-Web.
- יש לסרוק את קוד ה-QR שמוצג בטרמינל של Expo באמצעות **Expo Go** עבור המובייל.
- ה-Web מדבר עם השרת דרך `VITE_API_BASE_URL` (ראו לעיל); המובייל מדבר עם השרת דרך הכתובת
  המוגדרת ב-`apiBaseUrl.js` (כברירת מחדל — שרת ה-Production ב-Render, לא בהכרח השרת המקומי
  שהרצתם!).
- בסיס הנתונים (Supabase) הוא משותף לכל הרכיבים ונשאר כפי שהוגדר בקונפיגורציית השרת.

**משתמשי הדגמה:** פרטי כניסה לחשבונות הדגמה אינם שמורים בריפוזיטורי. פרטי משתמשי הדגמה יש
לקבל מצוות הפרויקט.

---

## בדיקות ו-Build

### שרת

```bash
cd RideOnServer
dotnet build
dotnet test ../RideOnServer.Tests/RideOnServer.Tests.csproj
```

חלק ניכר מבדיקות השרת ([`RideOnServer.Tests`](RideOnServer.Tests)) הן "Contract Tests"
שבודקות התנהגות/מבנה קוד ישירות מקבצי המקור (ללא חיבור בפועל ל-DB חי), לצד בדיקות יחידה
רגילות — כך שניתן להריץ את חלקן הגדול ללא סביבת בסיס נתונים מוגדרת.

### Web

```bash
cd RideOnClient/rideon-client/web
npm run build     # Production build
npm run test      # vitest run — כפי שמוגדר ב-package.json
npm run lint      # ESLint
```

### מובייל

```bash
cd RideOnClient/rideon-client/mobile
npm run test               # vitest run — כפי שמוגדר ב-package.json
npx expo export --platform android
```

`expo export` מבצע Bundling של אפליקציית האנדרואיד (דרך Metro) ומאמת שהקוד ניתן לבנייה, ללא
צורך ב-EAS.

---

## בסיס בדיקות ידוע (Known Test Baseline)

נמדד על Checkout נקי (clean checkout) של הריפוזיטורי:

| רכיב | סה"כ | עוברות | נכשלות |
|---|---|---|---|
| **Server** (`dotnet test`) | 1254 | 1222 | 32 |
| **Web** (`vitest run`) | 827 | 825 | 2 (ב-`classesView.utils.test.js`) |
| **Mobile** (`vitest run`) | 1275 | 1275 | 0 |

Build-ים — כולם עוברים: `dotnet build` (Server), `npm run build` (Web, Production),
`npx expo export --platform android` (Mobile).

**סיכום:** כל ה-Build-ים עוברים, וכל בדיקות המובייל עוברות במלואן. ב-Server וב-Web קיימות
כשלי בדיקה קיימים המשקפים **סטייה בין ציפיות הבדיקה לקוד הנוכחי (contract/test-expectation
drift)** — לא כשלי תלות חסרה או קונפיגורציית סביבה שגויה.

---

## הערות פריסה (Deployment)

מודל הפריסה הנוכחי, על בסיס עדות בריפוזיטורי:

- **Server** — מיועד לפריסה כ-Container (יש `Dockerfile` תקין), ומוגדר לפרודקשן על גבי
  **Render** (ראו כתובת ה-API הקבועה ב-`apiBaseUrl.js` של המובייל:
  `https://rideon-project.onrender.com/api`).
- **בסיס נתונים / אחסון קבצים** — **Supabase** (PostgreSQL + Storage).
- **Mobile** — זרימת עבודה מבוססת **Expo** (Expo Go לפיתוח/בדיקה); אין תצורת EAS Production
  מתועדת בריפוזיטורי כרגע.
- **Web** — לא אותרה בריפוזיטורי אינדיקציה חד-משמעית (קובץ תצורה של פלטפורמת אירוח ספציפית)
  לגבי היכן ה-Web מאורח בפרודקשן.

פריסה לשרת מכללה (או כל סביבה חדשה) דורשת בפועל:

- תמיכה ב-**.NET 8**, עם או בלי Docker.
- הגדרת **משתני סביבה** מאובטחים לכל המפתחות שתוארו בסעיף
  [הגדרות ו-Secrets של השרת](#הגדרות-ו-secrets-של-השרת).
- **קישוריות רשת יוצאת (outbound)** אל שירותי Supabase (בסיס נתונים + Storage).
- אירוח Static עבור ה-Web (build של Vite) **עם** הגדרת SPA fallback routing בצד המארח.
- הגדרת **HTTPS / Reverse Proxy** בצד המארח, ככל שנדרש — הקונפיגורציה הזו אינה חלק
  מהריפוזיטורי ואינה מסופקת אוטומטית.

חשוב: מסמך זה **אינו** מניח או קובע ששרת המכללה כבר תומך בדרישות אלו — יש לוודא זאת מול צוות
התשתית הרלוונטי.

---

## אבטחה

- **ערכי סוד של פרודקשן אינם נשמרים ב-Git** באופן מכוון (ראו `.gitignore` בכל אחד משלושת
  הפרויקטים).
- כל הגדרות הסוד (מחרוזת חיבור ל-DB, מפתח JWT, פרטי SMTP, מפתח Service-Role של Supabase)
  חייבות להיות מוזרמות דרך משתני סביבה או מנגנון secrets מאובטח אחר בצד השרת — לעולם לא
  לקומיט לתוך `appsettings.json`.
- **מפתח JWT (`Jwt:Key`) אסור בהחלט להיות מקומיט ל-Git.**
- **מפתח ה-Service-Role של Supabase (`Supabase:ServiceRoleKey`) אסור בשום אופן להיחשף לצד
  הלקוח (Web/Mobile)** — הוא משמש אך ורק בצד השרת להעלאת תעודות בריאות ל-Storage. מפתחות
  ציבוריים (למשל `VITE_GOOGLE_MAPS_API_KEY`) אינם שקולים ברמת הרגישות למפתח Service-Role,
  אך גם הם אינם אמורים להיחשף מעבר לנדרש.

---

## מגבלות ידועות / הערות למסירה

- **אין כרגע סקריפט Bootstrap יחיד ומאומת** להקמת בסיס נתונים Supabase חדש מאפס (ראו
  [בסיס הנתונים / Supabase](#בסיס-הנתונים--supabase)).
- **כתובת ה-API בקליינט המובייל מוגדרת בקוד המקור** (`apiBaseUrl.js`) ולא כמשתנה סביבה —
  מעבר לשרת backend אחר דורש שינוי ידני בקובץ זה והפעלה מחדש של קליינט המובייל.
- **אין תצורת EAS Production** מתועדת/עוקבת בריפוזיטורי עבור בניית גרסאות מובייל מנוהלות.
- **ערכי סוד של פרודקשן חיצוניים לריפוזיטורי** לחלוטין, ויש לקבלם בנפרד מצוות הפרויקט.
- מפתח Google Maps במובייל מוטמע כערך קבוע בקוד המקור (ראו [אבטחה](#אבטחה)).

---

## פרויקט גמר

פותח במסגרת פרויקט גמר אקדמי.
