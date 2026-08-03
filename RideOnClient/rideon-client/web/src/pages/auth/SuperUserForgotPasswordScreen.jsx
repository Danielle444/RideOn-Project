import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { superUserForgotPassword, superUserResetPassword } from "../../services/authService";
import { authTheme } from "../../../../shared/auth/theme/authTheme";
import Field from "../../components/common/Field";
import AuthButton from "../../components/common/AuthButton";

const { palette } = authTheme;

export default function SuperUserForgotPasswordScreen() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSendOtp(event) {
    event.preventDefault();
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("נא להזין כתובת מייל");
      return;
    }

    setIsLoading(true);

    try {
      await superUserForgotPassword(email.trim());
      setStep(2);
    } catch {
      setErrorMessage("אירעה שגיאה. נסה שוב מאוחר יותר.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReset(event) {
    event.preventDefault();
    setErrorMessage("");

    if (!otpCode.trim() || !newPassword || !confirmPassword) {
      setErrorMessage("נא למלא את כל השדות");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("הסיסמאות אינן תואמות");
      return;
    }

    setIsLoading(true);

    try {
      await superUserResetPassword(email.trim(), otpCode.trim(), newPassword);
      setSuccess(true);
      setTimeout(function () {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setErrorMessage(err?.response?.data || "הקוד אינו תקף או פג תוקפו. נסה שנית.");
    } finally {
      setIsLoading(false);
    }
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
          <h2
            className="mb-4 text-2xl font-bold"
            style={{ color: palette.heading }}
          >
            הסיסמה אופסה בהצלחה
          </h2>
          <p style={{ color: palette.text }}>מועבר למסך הכניסה...</p>
          <span
            onClick={function () {
              navigate("/login");
            }}
            className="cursor-pointer mt-4 block text-sm font-semibold hover:underline"
            style={{ color: palette.primary }}
          >
            לחץ כאן אם לא הועברת אוטומטית
          </span>
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
          איפוס סיסמה — מנהל מערכת
        </h2>
        <p
          className="mb-6 text-center text-sm font-semibold"
          style={{ color: palette.danger.text }}
        >
          מצב מנהל מערכת
        </p>

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <p className="text-sm text-center" style={{ color: palette.mutedText }}>
              הזן את כתובת המייל שלך ונשלח אליך קוד לאיפוס הסיסמה.
            </p>
            <Field label="כתובת מייל">
              <input
                type="email"
                value={email}
                onChange={function (e) {
                  setEmail(e.target.value);
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
                placeholder="example@email.com"
              />
            </Field>

            {errorMessage && (
              <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
                {errorMessage}
              </div>
            )}

            <AuthButton type="submit" disabled={isLoading}>
              {isLoading ? "שולח..." : "שלח קוד לאיפוס"}
            </AuthButton>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-sm text-center" style={{ color: palette.mutedText }}>
              קוד אימות נשלח ל-{email}. הזן אותו יחד עם הסיסמה החדשה.
            </p>

            <Field label="קוד אימות (6 ספרות)">
              <input
                type="text"
                value={otpCode}
                onChange={function (e) {
                  setOtpCode(e.target.value);
                }}
                maxLength={6}
                className="w-full rounded-xl px-4 py-2 text-center tracking-widest text-lg focus:outline-none"
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
                placeholder="123456"
              />
            </Field>

            <Field label="סיסמה חדשה">
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={function (e) {
                    setNewPassword(e.target.value);
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
                    setShowNew(function (p) {
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
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
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
              {isLoading ? "מאפס..." : "אפס סיסמה"}
            </AuthButton>

            <button
              type="button"
              onClick={function () {
                setStep(1);
                setErrorMessage("");
              }}
              className="w-full text-sm hover:underline"
              style={{ color: palette.primary }}
            >
              שלח קוד מחדש
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm" style={{ color: palette.text }}>
          <span
            onClick={function () {
              navigate("/login");
            }}
            className="cursor-pointer font-semibold hover:underline"
            style={{ color: palette.primary }}
          >
            חזרה לכניסה
          </span>
        </p>
      </div>
    </div>
  );
}
