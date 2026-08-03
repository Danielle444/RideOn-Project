import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import {
  validateRegistrationToken,
  completeRegistration,
} from "../../services/registrationService";
import { authTheme } from "../../../../shared/auth/theme/authTheme";
import Field from "../../components/common/Field";
import AuthButton from "../../components/common/AuthButton";

const { palette } = authTheme;

export default function CompleteRegistrationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cellPhone, setCellPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(function () {
    if (!token) {
      setIsValidating(false);
      setTokenError("קישור חסר. בקש מהמנהל לשלוח קישור חדש.");
      return;
    }

    validateRegistrationToken(token)
      .then(function () {
        setTokenValid(true);
      })
      .catch(function () {
        setTokenError("הקישור אינו תקף או שפג תוקפו. בקש מהמנהל לשלוח קישור חדש.");
      })
      .finally(function () {
        setIsValidating(false);
      });
  }, [token]);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage("שם פרטי ושם משפחה הם שדות חובה");
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage("הסיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("הסיסמאות אינן תואמות");
      return;
    }

    setIsLoading(true);

    try {
      await completeRegistration({
        token,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        cellPhone: cellPhone.trim() || null,
      });
      setSuccess(true);
    } catch (err) {
      setErrorMessage(
        err?.response?.data || "אירעה שגיאה. נסה שוב או פנה למנהל."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (isValidating) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: palette.background }}
        dir="rtl"
      >
        <p style={{ color: palette.text }}>בודק קישור...</p>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: palette.background }}
        dir="rtl"
      >
        <div
          className="w-full max-w-md rounded-2xl p-8 shadow-lg text-center"
          style={{ backgroundColor: palette.surface }}
        >
          <h2
            className="mb-4 text-2xl font-bold"
            style={{ color: palette.heading }}
          >
            קישור לא תקף
          </h2>
          <p style={{ color: palette.text }}>{tokenError}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: palette.background }}
        dir="rtl"
      >
        <div
          className="w-full max-w-md rounded-2xl p-8 shadow-lg text-center"
          style={{ backgroundColor: palette.surface }}
        >
          <div className="mb-4 text-5xl">&#10003;</div>
          <h2
            className="mb-3 text-2xl font-bold"
            style={{ color: palette.heading }}
          >
            ההרשמה הושלמה בהצלחה
          </h2>
          <p style={{ color: palette.text }}>
            חשבונך נוצר וממתין לאישור מנהל המערכת.
          </p>
          <p className="mt-2 text-sm" style={{ color: palette.mutedText }}>
            תקבל הודעה ברגע שהחשבון יאושר ותוכל להתחבר.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: palette.background }}
      dir="rtl"
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 shadow-lg"
        style={{ backgroundColor: palette.surface }}
      >
        <h2
          className="mb-2 text-center text-2xl font-bold"
          style={{ color: palette.heading }}
        >
          השלמת הרשמה
        </h2>
        <p
          className="mb-6 text-center text-sm"
          style={{ color: palette.mutedText }}
        >
          מלא את הפרטים ובחר סיסמה כדי לסיים את יצירת החשבון שלך.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Field label="שם פרטי">
                <input
                  type="text"
                  value={firstName}
                  onChange={function (e) {
                    setFirstName(e.target.value);
                  }}
                  className="w-full rounded-xl px-4 py-2 text-right focus:outline-none"
                  style={{
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: palette.border,
                  }}
                  onFocus={function (e) {
                    e.currentTarget.style.borderColor = palette.primary;
                  }}
                  onBlur={function (e) {
                    e.currentTarget.style.borderColor = palette.border;
                  }}
                />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="שם משפחה">
                <input
                  type="text"
                  value={lastName}
                  onChange={function (e) {
                    setLastName(e.target.value);
                  }}
                  className="w-full rounded-xl px-4 py-2 text-right focus:outline-none"
                  style={{
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: palette.border,
                  }}
                  onFocus={function (e) {
                    e.currentTarget.style.borderColor = palette.primary;
                  }}
                  onBlur={function (e) {
                    e.currentTarget.style.borderColor = palette.border;
                  }}
                />
              </Field>
            </div>
          </div>

          <Field label="טלפון נייד (אופציונלי)">
            <input
              type="tel"
              value={cellPhone}
              onChange={function (e) {
                setCellPhone(e.target.value);
              }}
              placeholder="050-0000000"
              className="w-full rounded-xl px-4 py-2 text-right focus:outline-none"
              style={{
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: palette.border,
              }}
              onFocus={function (e) {
                e.currentTarget.style.borderColor = palette.primary;
              }}
              onBlur={function (e) {
                e.currentTarget.style.borderColor = palette.border;
              }}
            />
          </Field>

          <Field label="סיסמה">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={function (e) {
                  setPassword(e.target.value);
                }}
                className="w-full rounded-xl px-4 py-2 pl-11 text-right focus:outline-none"
                style={{
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: palette.border,
                }}
                onFocus={function (e) {
                  e.currentTarget.style.borderColor = palette.primary;
                }}
                onBlur={function (e) {
                  e.currentTarget.style.borderColor = palette.border;
                }}
              />
              <button
                type="button"
                onClick={function () {
                  setShowPassword(function (p) {
                    return !p;
                  });
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: palette.mutedText }}
                onMouseEnter={function (e) {
                  e.currentTarget.style.color = palette.text;
                }}
                onMouseLeave={function (e) {
                  e.currentTarget.style.color = palette.mutedText;
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>

          <Field label="אימות סיסמה">
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={function (e) {
                  setConfirmPassword(e.target.value);
                }}
                className="w-full rounded-xl px-4 py-2 pl-11 text-right focus:outline-none"
                style={{
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: palette.border,
                }}
                onFocus={function (e) {
                  e.currentTarget.style.borderColor = palette.primary;
                }}
                onBlur={function (e) {
                  e.currentTarget.style.borderColor = palette.border;
                }}
              />
              <button
                type="button"
                onClick={function () {
                  setShowConfirm(function (p) {
                    return !p;
                  });
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: palette.mutedText }}
                onMouseEnter={function (e) {
                  e.currentTarget.style.color = palette.text;
                }}
                onMouseLeave={function (e) {
                  e.currentTarget.style.color = palette.mutedText;
                }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>

          {errorMessage && (
            <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
              {errorMessage}
            </div>
          )}

          <AuthButton type="submit" disabled={isLoading}>
            {isLoading ? "שומר..." : "סיים הרשמה"}
          </AuthButton>
        </form>
      </div>
    </div>
  );
}
