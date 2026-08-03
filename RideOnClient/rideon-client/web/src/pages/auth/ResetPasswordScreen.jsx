import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { resetPassword } from "../../services/authService";
import { authTheme } from "../../../../shared/auth/theme/authTheme";
import Field from "../../components/common/Field";
import AuthButton from "../../components/common/AuthButton";

const { palette } = authTheme;

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

    setIsLoading(true);

    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(function () {
        navigate("/login");
      }, 3000);
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

  if (!token) {
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
          <p className="mb-6" style={{ color: palette.text }}>
            קישור האיפוס חסר או אינו תקף. בקש קישור חדש.
          </p>
          <span
            onClick={function () {
              navigate("/forgot-password");
            }}
            className="cursor-pointer font-semibold hover:underline text-sm"
            style={{ color: palette.primary }}
          >
            לבקשת קישור חדש
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
          איפוס סיסמה
        </h2>
        <p
          className="mb-6 text-center text-sm"
          style={{ color: palette.mutedText }}
        >
          בחר סיסמה חדשה לחשבון שלך.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
        </form>
      </div>
    </div>
  );
}
