import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { getPostLoginRoute } from "../../../../shared/auth/utils/authNavigation";
import { validateLoginForm } from "../../../../shared/auth/validations/loginValidation";
import { useAuth } from "../../context/AuthContext";

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
      className="flex min-h-screen items-center justify-center bg-[#F5EDE8]"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h2 className="mb-4 text-center text-2xl font-bold text-[#4E342E]">
          התחברות למערכת
        </h2>

        {isSuperUserMode && (
          <p className="mb-4 text-center text-sm font-semibold text-[#8B0000]">
            מצב מנהל מערכת
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-[#5D4037]">
              {isSuperUserMode ? "כתובת מייל" : "שם משתמש"}
            </label>
            <input
              type={isSuperUserMode ? "email" : "text"}
              value={username}
              onChange={function (e) {
                setUsername(e.target.value);
              }}
              className="w-full rounded-xl border border-[#D7CCC8] px-4 py-2 text-right focus:border-[#795548] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#5D4037]">סיסמה</label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={function (e) {
                  setPassword(e.target.value);
                }}
                className="w-full rounded-xl border border-[#D7CCC8] px-4 py-2 pl-11 text-right focus:border-[#795548] focus:outline-none"
              />

              <button
                type="button"
                onClick={function () {
                  setShowPassword(function (prev) {
                    return !prev;
                  });
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D6E63] transition-colors hover:text-[#5D4037]"
                title={showPassword ? "הסתרת סיסמה" : "הצגת סיסמה"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-[#5D4037]">
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

            {!isSuperUserMode && (
              <button
                type="button"
                onClick={function () {
                  setShowForgotPopup(true);
                }}
                className="text-[#795548] hover:underline"
              >
                שכחתי סיסמה
              </button>
            )}
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
            {isLoading
              ? "מתחבר..."
              : isSuperUserMode
              ? "כניסת מנהל מערכת"
              : "התחבר"}
          </button>
        </form>

        {!isSuperUserMode && (
          <p className="mt-6 text-center text-sm text-[#6D4C41]">
            אין לך חשבון?{" "}
            <span
              onClick={function () {
                navigate("/register");
              }}
              className="cursor-pointer font-semibold text-[#795548] hover:underline"
            >
              להרשמה
            </span>
          </p>
        )}

        <div className="mt-6 text-center text-xs text-[#BCAAA4]">
          <span
            onClick={toggleSuperUserMode}
            className="cursor-pointer select-none hover:text-[#8D6E63]"
            title="כניסת מנהל מערכת"
          >
            © RideOn
          </span>
        </div>
      </div>

      {showForgotPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-bold text-[#4E342E]">איפוס סיסמה</h3>
            <p className="mb-6 text-sm text-[#5D4037]">
              להמשך תהליך איפוס הסיסמה, תועבר למסך הבא. להמשיך?
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
    </div>
  );
}