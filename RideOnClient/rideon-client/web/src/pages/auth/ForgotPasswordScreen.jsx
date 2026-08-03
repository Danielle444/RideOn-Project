import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../../services/authService";
import { authTheme } from "../../../../shared/auth/theme/authTheme";
import Field from "../../components/common/Field";
import AuthButton from "../../components/common/AuthButton";

const { palette } = authTheme;

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
            בדוק את תיבת הדואר
          </h2>
          <p className="mb-6" style={{ color: palette.text }}>
            אם המייל קיים במערכת, ישלח אליך קישור לאיפוס הסיסמה.
          </p>
          <button
            onClick={function () {
              navigate("/login");
            }}
            className="hover:underline text-sm"
            style={{ color: palette.primary }}
          >
            חזרה לכניסה
          </button>
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
          שכחתי סיסמה
        </h2>
        <p
          className="mb-6 text-center text-sm"
          style={{ color: palette.mutedText }}
        >
          הזן את כתובת המייל שלך ונשלח לך קישור לאיפוס הסיסמה.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            {isLoading ? "שולח..." : "שלח קישור לאיפוס"}
          </AuthButton>
        </form>

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
