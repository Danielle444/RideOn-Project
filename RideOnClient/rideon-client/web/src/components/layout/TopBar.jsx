import { Bell, LogOut } from "lucide-react";

export default function TopBar(props) {
  const notificationCount = props.notificationCount || 0;
  const hasNotifications = notificationCount > 0;

  return (
    <div className="h-12 bg-gradient-to-l from-[#7B5243] to-[#5D4037] flex items-center justify-between px-5 text-white">
      <div />

      <div className="flex items-center gap-2 h-full">
        <div className="relative flex items-center h-full">
          <button
            type="button"
            onClick={props.onNotificationsClick}
            className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            title="התראות"
          >
            <Bell size={18} />

            {hasNotifications ? (
              <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C44E4E] text-white text-[11px] font-bold flex items-center justify-center leading-none">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            ) : null}
          </button>

          {props.notificationsOpen ? (
            <div className="absolute left-0 top-full mt-3 w-[320px] rounded-2xl border border-[#E6DCD5] bg-white shadow-lg overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-[#EFE5DF] bg-[#FAF7F5]">
                <h3 className="text-sm font-bold text-[#3F312B]">התראות</h3>
              </div>

              <div className="py-2">
                {props.notificationItems && props.notificationItems.length > 0 ? (
                  props.notificationItems.map(function (item) {
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={function () {
                          props.onNotificationItemClick(item.key);
                        }}
                        className="w-full px-4 py-3 text-right hover:bg-[#FBF8F6] transition-colors"
                      >
                        <div className="text-sm font-semibold text-[#3F312B]">
                          {item.title}
                        </div>
                        <div className="mt-1 text-sm text-[#7A655C]">
                          {item.subtitle}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-4 text-sm text-[#7A655C] text-right">
                    אין התראות חדשות
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={props.onLogout}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          title="התנתקות"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}