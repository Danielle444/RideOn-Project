import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { getPostLoginRoute } from "../../../../shared/auth/utils/authNavigation";
import { validateLoginForm } from "../../../../shared/auth/validations/loginValidation";
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen() {
  const navigate = useNavigate();
  const { loginAndInitialize } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      const result = await loginAndInitialize(username, password, rememberMe);

      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      navigate(getPostLoginRoute(result.user, result.activeRole), {
        replace: true,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#F5EDE8]"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h2 className="mb-6 text-center text-2xl font-bold text-[#4E342E]">
          התחברות למערכת
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-[#5D4037]">
              שם משתמש
            </label>
            <input
              type="text"
              value={username}
              onChange={function (e) {
                setUsername(e.target.value);
              }}
              className="w-full rounded-xl border border-[#D7CCC8] px-4 py-2 text-right focus:border-[#795548] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#5D4037]">
              סיסמה
            </label>

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
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D6E63] hover:text-[#5D4037] transition-colors"
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

            <button
              type="button"
              onClick={function () {
                navigate("/forgot-password");
              }}
              className="text-[#795548] hover:underline"
            >
              שכחתי סיסמה
            </button>
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
            {isLoading ? "מתחבר..." : "התחבר"}
          </button>
        </form>

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
      </div>
    </div>
  );
}