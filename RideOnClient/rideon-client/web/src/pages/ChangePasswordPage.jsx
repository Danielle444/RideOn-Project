import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, Info } from "lucide-react";
import { useUser } from "../context/UserContext";
import { useActiveRole } from "../context/ActiveRoleContext";
import { useAuth } from "../context/AuthContext";
import { getPasswordValidationMessage } from "../../../shared/auth/validations/passwordValidation";
import Field from "../components/common/Field";

export default function ChangePasswordPage() {
  const navigate = useNavigate();

  const { user } = useUser();
  const { activeRole } = useActiveRole();
  const { changePasswordAndRefresh, logout } = useAuth();

  const [showPasswordInfo, setShowPasswordInfo] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function validateForm() {
    if (!user || !user.username) {
      setErrorMessage("לא נמצאו פרטי משתמש. יש להתחבר מחדש.");
      return false;
    }

    if (
      !currentPassword.trim() ||
      !newPassword.trim() ||
      !confirmPassword.trim()
    ) {
      setErrorMessage("יש למלא את כל השדות");
      return false;
    }

    if (currentPassword === newPassword) {
      setErrorMessage("הסיסמה החדשה חייבת להיות שונה מהסיסמה הנוכחית");
      return false;
    }

    const passwordValidationMessage = getPasswordValidationMessage(newPassword);

    if (passwordValidationMessage) {
      setErrorMessage(passwordValidationMessage);
      return false;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("אימות הסיסמה אינו תואם לסיסמה החדשה");
      return false;
    }

    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const isValid = validateForm();

    if (!isValid) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await changePasswordAndRefresh(
        currentPassword,
        newPassword
      );

      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      setSuccessMessage("הסיסמה הוחלפה בהצלחה");

      setTimeout(function () {
        if (activeRole) {
          navigate("/dashboard");
        } else if (
          result.user.approvedRolesAndRanches &&
          result.user.approvedRolesAndRanches.length > 1
        ) {
          navigate("/select-ranch");
        } else if (
          result.user.approvedRolesAndRanches &&
          result.user.approvedRolesAndRanches.length === 1
        ) {
          navigate("/dashboard");
        } else {
          logout();
          navigate("/login");
        }
      }, 1200);
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-[#EFEBE9] to-[#F5EDE8]"
      >
        <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl border border-[#E8D5C9] p-8 text-center">
          <h1 className="text-2xl font-bold text-[#3E2723] mb-3">
            אין נתוני משתמש
          </h1>
          <p className="text-[#795548] mb-6">
            לא נמצאו פרטי התחברות שמורים. יש להתחבר מחדש.
          </p>

          <button
            onClick={function () {
              navigate("/login");
            }}
            className="w-full bg-[#5D4037] hover:bg-[#4E342E] text-white font-semibold py-3 rounded-xl transition-all shadow-sm"
          >
            חזרה להתחברות
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-[#EFEBE9] to-[#F5EDE8]"
    >
      <div className="w-full max-w-[460px]">
        <div className="bg-white rounded-2xl shadow-xl border border-[#E8D5C9] overflow-hidden">
          <div className="px-8 pt-8 pb-6 border-b border-[#F5EBE4]">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3ECE8] text-[#5D4037]">
                <LockKeyhole size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#212121]">
                  החלפת סיסמה
                </h1>
                <p className="text-sm text-[#795548] mt-1">
                  יש להחליף סיסמה לפני הכניסה למערכת
                </p>
              </div>
            </div>

            <p className="text-sm text-[#8D6E63]">
              משתמש: <span className="font-semibold">{user.username}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#4E342E] mb-1.5">
                סיסמה נוכחית
              </label>

              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={function (e) {
                    setCurrentPassword(e.target.value);
                  }}
                  placeholder="הזיני סיסמה נוכחית"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#D7CCC8] bg-[#FAFAFA] text-right text-[#212121] placeholder-[#BCAAA4] focus:outline-none focus:border-[#795548] focus:bg-white focus:ring-2 focus:ring-[#795548]/15 transition-all text-sm pl-12"
                />

                <button
                  type="button"
                  onClick={function () {
                    setShowCurrentPassword(function (prev) {
                      return !prev;
                    });
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8D6E63] hover:text-[#5D4037] transition-colors"
                >
                  {showCurrentPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <Field
              label="סיסמה חדשה"
              info={<Info size={14} />}
              showInfoPopup={showPasswordInfo}
              onInfoClick={function () {
                setShowPasswordInfo(function (prev) {
                  return !prev;
                });
              }}
              onCloseInfo={function () {
                setShowPasswordInfo(false);
              }}
              infoPopup={
                showPasswordInfo ? (
                  <div className="absolute top-6 right-0 z-30 w-72 rounded-xl border border-[#E0D2C8] bg-white shadow-lg p-3 text-right">
                    <div className="absolute -top-2 right-3 h-3 w-3 rotate-45 border-l border-t border-[#E0D2C8] bg-white" />

                    <p className="text-xs font-semibold text-[#5D4037] mb-2">
                      הסיסמה חייבת לכלול:
                    </p>

                    <ul className="text-xs text-[#6D4C41] space-y-1 leading-5">
                      <li>• לפחות 8 תווים</li>
                      <li>• לפחות אות אנגלית גדולה אחת</li>
                      <li>• לפחות אות אנגלית קטנה אחת</li>
                      <li>• לפחות ספרה אחת</li>
                      <li>• ללא רווחים</li>
                    </ul>
                  </div>
                ) : null
              }
            >
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={function (e) {
                    setNewPassword(e.target.value);
                  }}
                  placeholder="הזיני סיסמה חדשה"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#D7CCC8] bg-[#FAFAFA] text-right text-[#212121] placeholder-[#BCAAA4] focus:outline-none focus:border-[#795548] focus:bg-white focus:ring-2 focus:ring-[#795548]/15 transition-all text-sm pl-12"
                />

                <button
                  type="button"
                  onClick={function () {
                    setShowNewPassword(function (prev) {
                      return !prev;
                    });
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8D6E63] hover:text-[#5D4037] transition-colors"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>

            <div>
              <label className="block text-sm font-semibold text-[#4E342E] mb-1.5">
                אימות סיסמה חדשה
              </label>

              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={function (e) {
                    setConfirmPassword(e.target.value);
                  }}
                  placeholder="הזיני שוב את הסיסמה החדשה"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#D7CCC8] bg-[#FAFAFA] text-right text-[#212121] placeholder-[#BCAAA4] focus:outline-none focus:border-[#795548] focus:bg-white focus:ring-2 focus:ring-[#795548]/15 transition-all text-sm pl-12"
                />

                <button
                  type="button"
                  onClick={function () {
                    setShowConfirmPassword(function (prev) {
                      return !prev;
                    });
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8D6E63] hover:text-[#5D4037] transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#5D4037] hover:bg-[#4E342E] disabled:bg-[#BCAAA4] text-white font-semibold py-3 rounded-xl transition-all shadow-sm"
            >
              {isLoading ? "שומר..." : "שמירת סיסמה חדשה"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}