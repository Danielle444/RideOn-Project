import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { superUserForgotPassword, superUserResetPassword } from "../../services/authService";

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
      setTimeout(function () { navigate("/login"); }, 3000);
    } catch (err) {
      setErrorMessage(err?.response?.data || "הקוד אינו תקף או פג תוקפו. נסה שנית.");
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5EDE8]" dir="rtl">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h2 className="mb-2 text-center text-2xl font-bold text-[#4E342E]">איפוס סיסמה — מנהל מערכת</h2>
        <p className="mb-6 text-center text-sm font-semibold text-[#8B0000]">מצב מנהל מערכת</p>

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <p className="text-sm text-[#8D6E63] text-center">
              הזן את כתובת המייל שלך ונשלח אליך קוד לאיפוס הסיסמה.
            </p>
            <div>
              <label className="mb-1 block text-sm text-[#5D4037]">כתובת מייל</label>
              <input
                type="email"
                value={email}
                onChange={function (e) { setEmail(e.target.value); }}
                className="w-full rounded-xl border border-[#D7CCC8] px-4 py-2 text-right focus:border-[#795548] focus:outline-none"
                placeholder="example@email.com"
              />
            </div>

            {errorMessage && (
              <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{errorMessage}</div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#795548] py-2 text-white transition hover:bg-[#6D4C41] disabled:opacity-60"
            >
              {isLoading ? "שולח..." : "שלח קוד לאיפוס"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-sm text-[#8D6E63] text-center">
              קוד אימות נשלח ל-{email}. הזן אותו יחד עם הסיסמה החדשה.
            </p>

            <div>
              <label className="mb-1 block text-sm text-[#5D4037]">קוד אימות (6 ספרות)</label>
              <input
                type="text"
                value={otpCode}
                onChange={function (e) { setOtpCode(e.target.value); }}
                maxLength={6}
                className="w-full rounded-xl border border-[#D7CCC8] px-4 py-2 text-center tracking-widest text-lg focus:border-[#795548] focus:outline-none"
                placeholder="123456"
              />
            </div>

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
              <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{errorMessage}</div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#795548] py-2 text-white transition hover:bg-[#6D4C41] disabled:opacity-60"
            >
              {isLoading ? "מאפס..." : "אפס סיסמה"}
            </button>

            <button
              type="button"
              onClick={function () { setStep(1); setErrorMessage(""); }}
              className="w-full text-sm text-[#795548] hover:underline"
            >
              שלח קוד מחדש
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-[#6D4C41]">
          <span
            onClick={function () { navigate("/login"); }}
            className="cursor-pointer font-semibold text-[#795548] hover:underline"
          >
            חזרה לכניסה
          </span>
        </p>
      </div>
    </div>
  );
}
