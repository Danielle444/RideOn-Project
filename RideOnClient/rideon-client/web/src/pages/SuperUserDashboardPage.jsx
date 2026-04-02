import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";

export default function SuperUserDashboardPage() {
  const { logout } = useAuth();
  const { user } = useUser();

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#F5EDE8] p-8 text-[#4E342E]"
    >
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-4 text-3xl font-bold">אזור מנהל מערכת</h1>

        <p className="mb-2 text-lg">
          התחברת בהצלחה כמנהל מערכת.
        </p>

        <p className="mb-6 text-sm text-[#6D4C41]">
          {user && user.email ? `מייל מחובר: ${user.email}` : ""}
        </p>

        <button
          onClick={logout}
          className="rounded-xl bg-[#795548] px-6 py-2 text-white transition hover:bg-[#6D4C41]"
        >
          התנתק
        </button>
      </div>
    </div>
  );
}