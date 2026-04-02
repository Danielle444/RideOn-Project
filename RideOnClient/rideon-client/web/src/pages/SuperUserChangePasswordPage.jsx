import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function SuperUserChangePasswordPage() {
  const navigate = useNavigate();
  const { changeSuperUserPasswordAndRefresh, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!currentPassword || !newPassword) {
      setErrorMessage("יש למלא את כל השדות");
      return;
    }

    setIsLoading(true);

    try {
      const result = await changeSuperUserPasswordAndRefresh(
        currentPassword,
        newPassword,
      );

      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      setSuccessMessage("הסיסמה הוחלפה בהצלחה");
      navigate("/superuser-dashboard", { replace: true });
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
        <h2 className="mb-4 text-center text-2xl font-bold text-[#4E342E]">
          החלפת סיסמת מנהל מערכת
        </h2>

        <p className="mb-6 text-center text-sm text-[#6D4C41]">
          נדרשת החלפת סיסמה לפני הכניסה למערכת
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-[#5D4037]">
              סיסמה נוכחית
            </label>

            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={function (e) {
                  setCurrentPassword(e.target.value);
                }}
                className="w-full rounded-xl border border-[#D7CCC8] px-4 py-2 pl-11 text-right focus:border-[#795548] focus:outline-none"
              />

              <button
                type="button"
                onClick={function () {
                  setShowCurrentPassword(function (prev) {
                    return !prev;
                  });
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D6E63] transition-colors hover:text-[#5D4037]"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#5D4037]">
              סיסמה חדשה
            </label>

            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={function (e) {
                  setNewPassword(e.target.value);
                }}
                className="w-full rounded-xl border border-[#D7CCC8] px-4 py-2 pl-11 text-right focus:border-[#795548] focus:outline-none"
              />

              <button
                type="button"
                onClick={function () {
                  setShowNewPassword(function (prev) {
                    return !prev;
                  });
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D6E63] transition-colors hover:text-[#5D4037]"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl bg-green-50 px-4 py-2 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#795548] py-2 text-white transition hover:bg-[#6D4C41] disabled:opacity-60"
          >
            {isLoading ? "שומר..." : "שמור סיסמה חדשה"}
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full rounded-xl border border-[#D7CCC8] py-2 text-[#5D4037] transition hover:bg-[#F8F3F0]"
          >
            התנתק
          </button>
        </form>
      </div>
    </div>
  );
}
