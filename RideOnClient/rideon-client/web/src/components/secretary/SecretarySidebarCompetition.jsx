import logo from "../../../../shared/assets/logo.png";
import {
  CalendarDays,
  Clock3,
  Users,
  Package,
  FileHeart,
  History,
  CreditCard,
  BarChart3,
  ChevronRight,
} from "lucide-react";

export default function SecretarySidebarCompetition(props) {
  const items = [
    { key: "classes", label: "מקצים", icon: CalendarDays },
    { key: "paid-time", label: "פייד-טיים", icon: Clock3 },
    { key: "stalls", label: "תאים", icon: Users },
    { key: "shavings", label: "הזמנות נסורת", icon: Package },
    { key: "health-certificates", label: "תעודות בריאות", icon: FileHeart },
    { key: "change-tracking", label: "מעקב שינויים", icon: History },
    { key: "payments", label: "תשלומים", icon: CreditCard },
    { key: "competition-summary", label: "סיכום תחרות", icon: BarChart3 },
  ];

  const roleAndRanchText = [props.roleName, props.ranchName]
    .filter(Boolean)
    .join(" · ");

  return (
    <aside className="w-[290px] border-l border-[#D9CDC6] bg-white flex flex-col">
      <div className="pt-8 pb-6 px-6 border-b border-[#EEE3DD]">
        {" "}
        <div className="flex flex-col items-center">
          <img src={logo} alt="RideOn" className="h-28 object-contain mb-3" />
        </div>
        <div className="text-center">
          <p className="text-[1.35rem] font-bold text-[#5D4037] leading-8">
            {props.userName}
          </p>

          <p className="mt-2 text-[1.02rem] font-medium text-[#8B6352] leading-7">
            {roleAndRanchText || "לא נבחר תפקיד וחווה"}
          </p>
        </div>
      </div>

      <nav className="flex-1 py-5">
        {items.map(function (item) {
          const Icon = item.icon;
          const isActive = props.activeItemKey === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={function () {
                props.onNavigate(item.key);
              }}
              className={
                "w-full flex items-center justify-between px-8 py-5 text-[1.2rem] font-semibold transition-colors " +
                (isActive
                  ? "bg-[#8B6352] text-white"
                  : "text-[#5D4037] hover:bg-[#F8F5F2]")
              }
            >
              <span>{item.label}</span>
              <Icon size={22} />
            </button>
          );
        })}

        <div className="mt-4 border-t border-[#EEE3DD] pt-4">
          <button
            type="button"
            onClick={props.onBackToCompetitions}
            className="w-full flex items-center justify-between px-8 py-5 text-[1.2rem] font-semibold text-[#5D4037] hover:bg-[#F8F5F2] transition-colors"
          >
            <span>חזרה ללוח תחרויות</span>
            <ChevronRight size={22} />
          </button>
        </div>
      </nav>
    </aside>
  );
}
