import { Bell, LogOut } from "lucide-react";

export default function TopBar(props) {
  return (
    <div className="h-12 bg-gradient-to-l from-[#7B5243] to-[#5D4037] flex items-center justify-between px-5 text-white">
      <div />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={props.onNotificationsClick}
          className="relative hover:opacity-80 transition-opacity"
          title="התראות"
        >
          <Bell size={18} />
        </button>

        <button
          type="button"
          onClick={props.onLogout}
          className="hover:opacity-80 transition-opacity"
          title="התנתקות"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}