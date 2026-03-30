import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, LogOut, MapPin, Shield } from 'lucide-react';
import {
  getUser,
  getRememberMe,
  saveActiveRole,
  clearAuthStorage
} from '../services/storageService';

export default function SelectRanchPage() {
  const navigate = useNavigate();
  const user = getUser();
  const rememberMe = getRememberMe();

  const approvedRolesAndRanches = useMemo(function () {
    if (!user || !user.approvedRolesAndRanches) {
      return [];
    }

    return user.approvedRolesAndRanches;
  }, [user]);

  const [selectedIndex, setSelectedIndex] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  function handleLogout() {
    clearAuthStorage();
    navigate('/login');
  }

  function handleContinue() {
    setErrorMessage('');

    if (selectedIndex === null) {
      setErrorMessage('יש לבחור חווה ותפקיד כדי להמשיך');
      return;
    }

    const selectedRole = approvedRolesAndRanches[selectedIndex];
    saveActiveRole(selectedRole, rememberMe);
    navigate('/dashboard');
  }

  if (!user) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-[#EFEBE9] to-[#F5EDE8]"
      >
        <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl border border-[#E8D5C9] p-8 text-center">
          <h1 className="text-2xl font-bold text-[#3E2723] mb-3">אין נתוני משתמש</h1>
          <p className="text-[#795548] mb-6">
            לא נמצאו פרטי התחברות שמורים. יש להתחבר מחדש.
          </p>

          <button
            onClick={function () {
              navigate('/login');
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
      <div className="w-full max-w-[680px]">
        <div className="bg-white rounded-2xl shadow-xl border border-[#E8D5C9] overflow-hidden">
          <div className="px-8 pt-8 pb-6 border-b border-[#F5EBE4]">
            <h1 className="text-2xl font-bold text-[#212121]">בחירת חווה ותפקיד</h1>
            <p className="text-sm text-[#795548] mt-1">
              שלום {user.firstName} {user.lastName}, בחר/י את החווה והתפקיד שדרכם תרצה/י להיכנס
            </p>
          </div>

          <div className="px-8 py-6">
            <div className="space-y-4">
              {approvedRolesAndRanches.map(function (item, index) {
                const isSelected = selectedIndex === index;

                return (
                  <button
                    key={`${item.ranchId}-${item.roleId}-${index}`}
                    type="button"
                    onClick={function () {
                      setSelectedIndex(index);
                      setErrorMessage('');
                    }}
                    className={
                      'w-full rounded-2xl border-2 p-5 text-right transition-all ' +
                      (isSelected
                        ? 'border-[#795548] bg-[#F8F5F2] shadow-md'
                        : 'border-[#E5D7CF] bg-white hover:border-[#BCAAA4] hover:bg-[#FCFAF8]')
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F3ECE8] text-[#5D4037]">
                        {isSelected ? <Check size={20} /> : <Shield size={20} />}
                      </div>

                      <div className="flex-1">
                        <div className="mb-2 flex items-center justify-start gap-2 text-[#3E2723]">
                          <MapPin size={16} />
                          <span className="text-lg font-bold">{item.ranchName}</span>
                        </div>

                        <p className="text-sm text-[#6D4C41]">
                          תפקיד: <span className="font-semibold">{item.roleName}</span>
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {errorMessage && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D7CCC8] px-5 py-3 text-[#5D4037] transition hover:bg-[#F8F5F2]"
              >
                <LogOut size={18} />
                התנתקות
              </button>

              <button
                type="button"
                onClick={handleContinue}
                className="bg-[#5D4037] hover:bg-[#4E342E] text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm"
              >
                המשך
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}