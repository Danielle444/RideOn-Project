import { useNavigate } from 'react-router-dom';
import { getUser, getActiveRole, clearAuthStorage } from '../services/storageService';

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = getUser();
  const activeRole = getActiveRole();

  function handleLogout() {
    clearAuthStorage();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-[#F8F5F2] p-6" dir="rtl">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-4 text-3xl font-bold text-[#4E342E]">דשבורד</h1>

        <p className="mb-2 text-lg text-[#5D4037]">
          שלום {user?.firstName} {user?.lastName}
        </p>

        <p className="mb-2 text-[#6D4C41]">
          שם משתמש: {user?.username}
        </p>

        <p className="mb-2 text-[#6D4C41]">
          חווה פעילה: {activeRole?.ranchName || 'לא נבחרה חווה'}
        </p>

        <p className="mb-6 text-[#6D4C41]">
          תפקיד פעיל: {activeRole?.roleName || 'לא נבחר תפקיד'}
        </p>

        <button
          onClick={handleLogout}
          className="rounded-xl bg-[#795548] px-5 py-2.5 text-white transition hover:bg-[#6D4C41]"
        >
          התנתקות
        </button>
      </div>
    </div>
  );
}