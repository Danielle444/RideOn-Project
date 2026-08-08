# Neutral-Hebrew String Sweep (D2)

**Decision:** neutral phrasing — no masculine/feminine address anywhere in the registration flow.

**Neutralization strategy (apply consistently):**
- Field placeholders → **noun only** (`"בחרי סיסמה"` → `"סיסמה"`).
- Actions/CTAs → **plural imperative** (the standard Hebrew-UI neutral) — `"בחרו"`, `"הזינו"`, `"מלאו"`.
- System result messages → **passive** — `"תישלח הודעה"` instead of `"תקבל הודעה"`.
- Login/nav CTAs → **noun** — `"כניסה"` instead of `"התחבר"`.

The scope covers **both** `RegisterScreen.jsx` files, the mobile subtitle/labels, and
`CompleteRegistrationPage.jsx` (verify its strings too). Implementer should also `grep` the
two screens for any string ending in `י`/`ה` (fem) or a masculine 2nd-person verb to catch
stragglers — the list below is the verified set, not necessarily exhaustive.

---

## Web — `web/src/pages/auth/RegisterScreen.jsx`

| Line (approx) | Current | Proposed (neutral) |
|---|---|---|
| 482 | `הבקשה נשלחה בהצלחה! תקבל הודעה לאחר אישור מנהל המערכת.` | `הבקשה נשלחה בהצלחה! תישלח הודעה לאחר אישור מנהל המערכת.` |
| 794 | placeholder `בחרי סיסמה` | `סיסמה` |
| 818 | placeholder `הזינו סיסמה שוב` | `הזנת סיסמה שוב` (or keep plural `הזינו סיסמה שוב` — already neutral-plural) |

Most other web strings are already neutral (`בחרו שם משתמש`, passive autofill notices) — leave them.

## Mobile — `mobile/src/screens/auth/RegisterScreen.jsx`

| Line (approx) | Current | Proposed (neutral) |
|---|---|---|
| 973 | subtitle `מלאי את הפרטים ושלחי בקשת הרשמה` | `מילוי הפרטים ושליחת בקשת הרשמה` |
| 585 | success `הבקשה נשלחה בהצלחה` | align with web: `הבקשה נשלחה בהצלחה! תישלח הודעה לאחר אישור מנהל המערכת.` (and drop the duplicate `Alert.alert` — finding #3) |
| 988 | placeholder `הזן 9 ספרות` | `9 ספרות` |
| 1003 | placeholder `הזן שם פרטי` | `שם פרטי` |
| 1013 | placeholder `הזן שם משפחה` | `שם משפחה` |
| 784 | date placeholder `בחרי תאריך לידה` | `תאריך לידה` |
| 1069 | placeholder `בחרי שם משתמש` | `שם משתמש` |
| 1083 | placeholder `בחרי סיסמה` | `סיסמה` |
| 1102 | placeholder `הזיני שוב את הסיסמה` | `סיסמה שוב` |
| 874 | picker `בחרי חווה` | `בחירת חווה` |
| 907 | picker `בחרי תפקיד` | `בחירת תפקיד` |
| 1236 | ranch-modal placeholder `הזיני שם חווה` | `שם חווה` |
| 1188 | bottom link `כבר יש לך חשבון? התחבר` | `כבר יש חשבון? כניסה` |

## Web — `web/src/pages/auth/CompleteRegistrationPage.jsx` (payer completion)

| Line (approx) | Current | Proposed (neutral) |
|---|---|---|
| 32 | `קישור חסר. בקש מהמנהל לשלוח קישור חדש.` | `קישור חסר. יש לבקש מהמנהל קישור חדש.` |
| 41 | `הקישור אינו תקף או שפג תוקפו. בקש מהמנהל לשלוח קישור חדש.` | `הקישור אינו תקף או שפג תוקפו. יש לבקש מהמנהל קישור חדש.` |
| 80 | `אירעה שגיאה. נסה שוב או פנה למנהל.` | `אירעה שגיאה. יש לנסות שוב או לפנות למנהל.` |
| 116 | `תקבל הודעה ברגע שהחשבון יאושר ותוכל להתחבר.` | `תישלח הודעה ברגע שהחשבון יאושר ותתאפשר כניסה.` |
| 128 | `מלא את הפרטים ובחר סיסמה כדי לסיים…` | `מילוי הפרטים ובחירת סיסמה כדי לסיים…` |

Note: `LoginScreen.jsx` and forgot/reset-password pages are also in the D5 design scope — audit
their strings for gendered forms during the same sweep.

---

**Note:** the two Register success messages should be **unified** as part of removing the mobile
`Alert.alert` duplicate (finding #3) — pick the neutral web wording as canonical and mirror it on
mobile. (This is the messaging-channel fix, not the dropped copy-drift finding #5.)
