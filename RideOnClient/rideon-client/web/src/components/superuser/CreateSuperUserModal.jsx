import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";

export default function CreateSuperUserModal(props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (props.isOpen) {
      setEmail("");
      setPassword("");
    }
  }, [props.isOpen]);

  if (!props.isOpen) {
    return null;
  }

  function handleSubmit(e) {
    e.preventDefault();
    props.onSubmit({
      email: email.trim(),
      password,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-lg rounded-[28px] border border-[#E6DCD5] bg-white shadow-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#EFE5DF] px-6 py-5">
          <h2 className="text-2xl font-bold text-[#3F312B]">יצירת משתמש מערכת</h2>

          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full p-2 text-[#7E675E] hover:bg-[#F6F1EE] transition-colors"
            title="סגירה"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                אימייל
              </label>
              <input
                type="email"
                value={email}
                onChange={function (e) {
                  setEmail(e.target.value);
                }}
                placeholder="admin@example.com"
                className="h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm placeholder:text-[#A08D84] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                סיסמה זמנית
              </label>
              <input
                type="password"
                value={password}
                onChange={function (e) {
                  setPassword(e.target.value);
                }}
                placeholder="הקלידי סיסמה זמנית"
                className="h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm placeholder:text-[#A08D84] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                required
              />
              <p className="mt-2 text-sm leading-6 text-[#8A746A]">
                המשתמש החדש יידרש להחליף את הסיסמה בכניסה הראשונה.
              </p>
            </div>

            {props.errorMessage ? (
              <div className="rounded-2xl border border-[#E7BABA] bg-[#FDF4F4] px-4 py-3 text-sm text-[#A54848]">
                {props.errorMessage}
              </div>
            ) : null}

            {props.successMessage ? (
              <div className="rounded-2xl border border-[#B9D9C0] bg-[#F4FBF5] px-4 py-3 text-sm text-[#2F6B3B]">
                {props.successMessage}
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={props.onClose}
              className="rounded-xl border border-[#D8CBC3] bg-white px-5 py-2.5 font-semibold text-[#5D4037] hover:bg-[#F8F5F2] transition-colors"
            >
              ביטול
            </button>

            <button
              type="submit"
              disabled={props.loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#8B6352] px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-[#7A5547] disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
            >
              {props.loading ? <Loader2 size={16} className="animate-spin" /> : null}
              יצירת משתמש
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}