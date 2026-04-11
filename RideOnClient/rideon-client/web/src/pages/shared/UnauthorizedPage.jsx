import { useNavigate } from "react-router-dom";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F3F1] px-4">
      <div className="w-full max-w-[420px] rounded-[28px] border border-[#E6DCD5] bg-white shadow-md text-center px-8 py-10">
        <div className="flex justify-center mb-4 text-[#A14A4A]">
          <ShieldX size={48} />
        </div>

        <h1 className="text-xl font-bold text-[#3F312B]">
          אין לך הרשאה
        </h1>

        <p className="mt-2 text-sm text-[#8A7268]">
          אין לך גישה למסך הזה במערכת
        </p>

        <button
          onClick={function () {
            navigate("/competitions");
          }}
          className="mt-6 px-5 py-2.5 rounded-2xl bg-[#7B5A4D] text-white font-semibold hover:bg-[#6B4D42]"
        >
          חזרה למערכת
        </button>
      </div>
    </div>
  );
}