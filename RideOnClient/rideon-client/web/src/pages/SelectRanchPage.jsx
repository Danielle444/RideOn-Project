import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  LogOut,
  Building2,
  Smartphone,
  BadgeCheck,
} from "lucide-react";
import {
  getUser,
  getRememberMe,
  saveActiveRole,
  clearAuthStorage,
} from "../services/storageService";
import {
  mapRoleOptionForWeb,
  getWebSupportedRoleOptions,
} from "../../../shared/auth/utils/platformRoles";

export default function SelectRanchPage() {
  const navigate = useNavigate();
  const user = getUser();
  const rememberMe = getRememberMe();

  const approvedRolesAndRanches = useMemo(function () {
    if (!user || !Array.isArray(user.approvedRolesAndRanches)) {
      return [];
    }

    return user.approvedRolesAndRanches;
  }, [user]);

  const roleOptionsForWeb = useMemo(function () {
    const mapped = approvedRolesAndRanches.map(mapRoleOptionForWeb);

    return mapped.sort(function (a, b) {
      if (a.isSupportedOnWeb && !b.isSupportedOnWeb) {
        return -1;
      }

      if (!a.isSupportedOnWeb && b.isSupportedOnWeb) {
        return 1;
      }

      return 0;
    });
  }, [approvedRolesAndRanches]);

  const supportedWebRoles = useMemo(function () {
    return getWebSupportedRoleOptions(approvedRolesAndRanches);
  }, [approvedRolesAndRanches]);

  const [errorMessage, setErrorMessage] = useState("");

  useEffect(
    function () {
      if (!user) {
        return;
      }

      if (
        approvedRolesAndRanches.length === 1 &&
        supportedWebRoles.length === 1
      ) {
        saveActiveRole(supportedWebRoles[0], rememberMe);
        navigate("/competitions", { replace: true });
      }
    },
    [user, approvedRolesAndRanches, supportedWebRoles, rememberMe, navigate]
  );

  function handleLogout() {
    clearAuthStorage();
    navigate("/login");
  }

  // 🔥 הפונקציה החדשה — במקום handleContinue
  function handleRoleSelect(index) {
    setErrorMessage("");

    const selectedRole = roleOptionsForWeb[index];

    if (!selectedRole.isSupportedOnWeb) {
      setErrorMessage("התפקיד שנבחר זמין רק במובייל");
      return;
    }

    saveActiveRole(
      {
        ranchId: selectedRole.ranchId,
        ranchName: selectedRole.ranchName,
        roleId: selectedRole.roleId,
        roleName: selectedRole.roleName,
      },
      rememberMe
    );

    navigate("/competitions");
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
      <div className="w-full max-w-[1020px]">
        <div className="bg-white rounded-[28px] shadow-xl border border-[#E8D5C9] overflow-hidden">
          <div className="px-10 pt-10 pb-7 border-b border-[#F1E6DF] text-right">
            <h1 className="text-[2rem] font-bold text-[#212121] leading-tight">
              על איזו חווה את עובדת עכשיו?
            </h1>

            <p className="text-base text-[#795548] mt-2">
              בחרי את החווה והתפקיד שדרכם תרצי לעבוד בחשבון זה
            </p>
          </div>

          <div className="px-10 py-8">
            <div className="space-y-5">
              {roleOptionsForWeb.map(function (item, index) {
                const isDisabled = !item.isSupportedOnWeb;

                return (
                  <button
                    key={`${item.ranchId}-${item.roleId}-${index}`}
                    type="button"
                    disabled={isDisabled}
                    onClick={function () {
                      if (isDisabled) return;
                      handleRoleSelect(index);
                    }}
                    className={
                      "w-full rounded-[24px] border-2 px-8 py-7 text-right transition-all " +
                      (isDisabled
                        ? "border-[#E4D6CE] bg-[#F7F3F1] opacity-80 cursor-not-allowed"
                        : "border-[#E4D6CE] bg-white hover:border-[#BCAAA4] hover:bg-[#FCFAF8]")
                    }
                  >
                    <div className="flex items-center justify-between gap-5">
                      <div className="flex-1 text-right">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 size={18} className="text-[#7B5A4D]" />
                          <span className="text-[2rem] font-bold text-[#3E2723]">
                            {item.displayTitle}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[#6D4C41]">
                          <Briefcase size={16} className="text-[#8B6352]" />
                          <span className="text-lg font-semibold">
                            {item.displaySubtitle}
                          </span>
                        </div>

                        {isDisabled && (
                          <p className="mt-4 text-sm text-[#B08978]">
                            {item.platformMessage}
                          </p>
                        )}
                      </div>

                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F3ECE8] text-[#8B6352]">
                        {isDisabled ? (
                          <Smartphone size={26} />
                        ) : (
                          <BadgeCheck size={28} />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {errorMessage && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-right">
                {errorMessage}
              </div>
            )}

            <div className="mt-9 flex justify-start">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#D7CCC8] px-6 py-4 text-[#5D4037] hover:bg-[#F8F5F2]"
              >
                <LogOut size={18} />
                התנתקות
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}