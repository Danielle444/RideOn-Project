import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../../services/authService";

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
      <div className="flex min-h-screen items-center justify-center bg-[#F5EDE8]" dir="rtl">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <h2 className="mb-4 text-2xl font-bold text-[#4E342E]">בדוק את תיבת הדואר</h2>
          <p className="text-[#5D4037] mb-6">
            אם המייל קיים במערכת, ישלח אליך קישור לאיפוס הסיסמה.
          </p>
          <button
            onClick={function () { navigate("/login"); }}
            className="text-[#795548] hover:underline text-sm"
          >
            חזרה לכניסה
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5EDE8]" dir="rtl">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h2 className="mb-2 text-center text-2xl font-bold text-[#4E342E]">שכחתי סיסמה</h2>
        <p className="mb-6 text-center text-sm text-[#8D6E63]">
          הזן את כתובת המייל שלך ונשלח לך קישור לאיפוס הסיסמה.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#795548] py-2 text-white transition hover:bg-[#6D4C41] disabled:opacity-60"
          >
            {isLoading ? "שולח..." : "שלח קישור לאיפוס"}
          </button>
        </form>

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
