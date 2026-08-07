import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { getPostLoginRoute } from "../../../../shared/auth/utils/authNavigation";
import { validateLoginForm } from "../../../../shared/auth/validations/loginValidation";
import { authTheme } from "../../../../shared/auth/theme/authTheme";
import logo from "../../../../shared/assets/logo.png";
import { useAuth } from "../../context/AuthContext";
import Field from "../../components/common/Field";
import AuthButton from "../../components/common/AuthButton";

const { palette } = authTheme;

export default function LoginScreen() {
  const navigate = useNavigate();
  const { loginAndInitialize, loginSuperUser } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSuperUserMode, setIsSuperUserMode] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPopup, setShowForgotPopup] = useState(false);

  function getSuperUserRoute(user) {
    if (user && user.mustChangePassword) {
      return "/change-password";
    }

    return "/superuser/requests";
  }
  //OrenNoteToFix - This is the third time we have seen this exact function! As discussed in the previous file, you should definitely pull this out into shared/auth/utils/authNavigation.js and import it here.

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    const validationError = validateLoginForm(username, password);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsLoading(true);

    try {
      let result;

      if (isSuperUserMode) {
        result = await loginSuperUser(username, password, rememberMe);
      } else {
        result = await loginAndInitialize(username, password, rememberMe);
      }

      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      if (result.user && result.user.userType === "superUser") {
        navigate(getSuperUserRoute(result.user), {
          replace: true,
        });
        return;
      }

      navigate(getPostLoginRoute(result.user, result.activeRole), {
        replace: true,
      });
    } finally {
      setIsLoading(false);
    }
  }

  function toggleSuperUserMode() {
    setIsSuperUserMode(function (prev) {
      return !prev;
    });

    setErrorMessage("");
    setUsername("");
    setPassword("");
    setRememberMe(false);
    setShowPassword(false);
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center"
      style={{ backgroundColor: palette.background }}
      dir="rtl"
    >
      <img
        src={logo}
        alt="RideOn"
        className="h-24 sm:h-28 object-contain mb-4"
      />

      <div
        className="w-full max-w-md rounded-2xl p-8 shadow-lg"
        style={{ backgroundColor: palette.surface }}
      >
        <h2
          className="mb-4 text-center text-2xl font-bold"
          style={{ color: palette.heading }}
        >
          התחברות למערכת
        </h2>

        {isSuperUserMode && (
          <p
            className="mb-4 text-center text-sm font-semibold"
            style={{ color: palette.danger.text }}
          >
            מצב מנהל מערכת
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={isSuperUserMode ? "כתובת מייל" : "שם משתמש"}>
            <input
              type={isSuperUserMode ? "email" : "text"}
              value={username}
              onChange={function (e) {
                setUsername(e.target.value);
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
                  setShowPassword(function (prev) {
                    return !prev;
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
                title={showPassword ? "הסתרת סיסמה" : "הצגת סיסמה"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>

          <div
            className="flex items-center justify-between text-sm"
            style={{ color: palette.text }}
          >
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={function (e) {
                  setRememberMe(e.target.checked);
                }}
              />
              זכור אותי
            </label>

            <button
              type="button"
              onClick={function () {
                setShowForgotPopup(true);
              }}
              className="hover:underline"
              style={{ color: palette.primary }}
            >
              שכחתי סיסמה
            </button>
          </div>

          {errorMessage && (
            <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
              {errorMessage}
            </div>
          )}

          <AuthButton type="submit" disabled={isLoading}>
            {isLoading
              ? "מתחבר..."
              : isSuperUserMode
              ? "כניסת מנהל מערכת"
              : "התחבר"}
          </AuthButton>
        </form>

        {!isSuperUserMode && (
          <p
            className="mt-6 text-center text-sm"
            style={{ color: palette.text }}
          >
            אין לך חשבון?{" "}
            <Link
              onClick={function () {
                navigate("/register");
              }}
              className="cursor-pointer font-semibold hover:underline"
              style={{ color: palette.primary }}
            >
              להרשמה
            </Link>
          </p>
        )}

        <div
          className="mt-6 text-center text-xs"
          style={{ color: palette.subtleText }}
        >
          <span
            onClick={toggleSuperUserMode}
            className="cursor-pointer select-none transition-colors"
            style={{ color: palette.subtleText }}
            onMouseEnter={function (e) {
              e.currentTarget.style.color = palette.mutedText;
            }}
            onMouseLeave={function (e) {
              e.currentTarget.style.color = palette.subtleText;
            }}
            title="כניסת מנהל מערכת"
          >
            © RideOn
          </span>
        </div>
      </div>

      {showForgotPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          dir="rtl"
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-xl"
            style={{ backgroundColor: palette.surface }}
          >
            <h3
              className="mb-3 text-lg font-bold"
              style={{ color: palette.heading }}
            >
              איפוס סיסמה
            </h3>
            <p className="mb-6 text-sm" style={{ color: palette.text }}>
              להמשך תהליך איפוס הסיסמה, תועבר למסך הבא. להמשיך?
            </p>
            <div className="flex gap-3 justify-end">
              <AuthButton
                variant="outline"
                fullWidth={false}
                onClick={function () {
                  setShowForgotPopup(false);
                }}
              >
                ביטול
              </AuthButton>
              <AuthButton
                fullWidth={false}
                onClick={function () {
                  setShowForgotPopup(false);
                  navigate(
                    isSuperUserMode
                      ? "/superuser-forgot-password"
                      : "/forgot-password"
                  );
                }}
              >
                {isSuperUserMode ? "כן, שלח לי קוד" : "כן, שלח לי קישור"}
              </AuthButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
