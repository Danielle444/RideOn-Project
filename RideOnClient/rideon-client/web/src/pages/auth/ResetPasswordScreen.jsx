import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { resetPassword } from "../../services/authService";

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
      setTimeout(function () { navigate("/login"); }, 3000);
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
      <div className="flex min-h-screen items-center justify-center bg-[#F5EDE8]" dir="rtl">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <h2 className="mb-4 text-2xl font-bold text-[#4E342E]">הסיסמה אופסה בהצלחה</h2>
          <p className="text-[#5D4037]">מועבר למסך הכניסה...</p>
          <span
            onClick={function () { navigate("/login"); }}
            className="cursor-pointer mt-4 block text-sm font-semibold text-[#795548] hover:underline"
          >
            לחץ כאן אם לא הועברת אוטומטית
          </span>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5EDE8]" dir="rtl">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <h2 className="mb-4 text-2xl font-bold text-[#4E342E]">קישור לא תקף</h2>
          <p className="text-[#5D4037] mb-6">קישור האיפוס חסר או אינו תקף. בקש קישור חדש.</p>
          <span
            onClick={function () { navigate("/forgot-password"); }}
            className="cursor-pointer font-semibold text-[#795548] hover:underline text-sm"
          >
            לבקשת קישור חדש
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5EDE8]" dir="rtl">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h2 className="mb-2 text-center text-2xl font-bold text-[#4E342E]">איפוס סיסמה</h2>
        <p className="mb-6 text-center text-sm text-[#8D6E63]">בחר סיסמה חדשה לחשבון שלך.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-[#5D4037]">סיסמה חדשה</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={function (e) { setNewPassword(e.target.value); }}
                className="w-full rounded-xl border border-[#D7CCC8] px-4 py-2 pl-11 text-right focus:border-[#795548] focus:outline-none"
              />
              <button
                type="button"
                onClick={function () { setShowNew(function (p) { return !p; }); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D6E63] hover:text-[#5D4037]"
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#5D4037]">אימות סיסמה</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={function (e) { setConfirmPassword(e.target.value); }}
                className="w-full rounded-xl border border-[#D7CCC8] px-4 py-2 pl-11 text-right focus:border-[#795548] focus:outline-none"
              />
              <button
                type="button"
                onClick={function () { setShowConfirm(function (p) { return !p; }); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D6E63] hover:text-[#5D4037]"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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
            {isLoading ? "מאפס..." : "אפס סיסמה"}
          </button>
        </form>
      </div>
    </div>
  );
}
