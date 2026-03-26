import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/authService";
import {
  saveToken,
  saveUser,
  saveActiveRole,
  saveRememberMe,
  clearAuthStorage,
} from "../../services/storageService";
import { getApiErrorMessage } from "../../utils/auth/authApiErrors";
import { getPostLoginRoute } from "../../utils/auth/authNavigation";
import { validateLoginForm } from "../../utils/auth/loginValidation";

export default function LoginScreen() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    // ✅ ולידציה חיצונית
    const validationError = validateLoginForm(username, password);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsLoading(true);

    try {
      // ניקוי מידע ישן לפני התחברות חדשה
      clearAuthStorage();

      const response = await login(username.trim(), password);
      const data = response.data;

      const userData = {
        personId: data.personId,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        isActive: data.isActive,
        mustChangePassword: data.mustChangePassword,
        approvedRolesAndRanches: data.approvedRolesAndRanches,
      };

      saveRememberMe(rememberMe);
      saveToken(data.token, rememberMe);
      saveUser(userData, rememberMe);

      // ❗ בדיקה אם אין תפקידים מאושרים
      if (
        !data.approvedRolesAndRanches ||
        data.approvedRolesAndRanches.length === 0
      ) {
        clearAuthStorage();
        setErrorMessage("אין למשתמש תפקיד מאושר במערכת");
        return;
      }

      // אם יש רק תפקיד אחד → שמירה אוטומטית
      if (data.approvedRolesAndRanches.length === 1) {
        saveActiveRole(data.approvedRolesAndRanches[0], rememberMe);
      }

      // ✅ ניווט מרכזי אחיד
      navigate(
        getPostLoginRoute(
          userData,
          data.approvedRolesAndRanches[0] || null
        )
      );
    } catch (error) {
      // ✅ טיפול שגיאות אחיד
      setErrorMessage(
        getApiErrorMessage(error, "אירעה שגיאה בהתחברות לשרת")
      );
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
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-[#D7CCC8] px-4 py-2 text-right focus:border-[#795548] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#5D4037]">
              סיסמה
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[#D7CCC8] px-4 py-2 text-right focus:border-[#795548] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between text-sm text-[#5D4037]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              זכור אותי
            </label>

            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
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
            onClick={() => navigate("/register")}
            className="cursor-pointer font-semibold text-[#795548] hover:underline"
          >
            להרשמה
          </span>
        </p>
      </div>
    </div>
  );
}