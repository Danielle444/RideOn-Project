import { Monitor, Smartphone } from "lucide-react";

export default function ProfilesListSection(props) {
  function renderStatusBadge(roleStatus) {
    const normalized = String(roleStatus || "").toLowerCase();

    if (normalized === "approved") {
      return (
        <span className="inline-flex rounded-full border border-[#CFE6D8] bg-[#F7FBF8] px-3 py-1 text-sm font-semibold text-[#2F6F4F]">
          מאושר
        </span>
      );
    }

    if (normalized === "pending") {
      return (
        <span className="inline-flex rounded-full border border-[#E9D8B5] bg-[#FFF9ED] px-3 py-1 text-sm font-semibold text-[#9A6A00]">
          ממתין
        </span>
      );
    }

    return (
      <span className="inline-flex rounded-full border border-[#E1D6D0] bg-[#FAF7F5] px-3 py-1 text-sm font-semibold text-[#8A7268]">
        {roleStatus || "לא ידוע"}
      </span>
    );
  }

  function renderPlatformCell(profile) {
    if (profile.platformType === "pending") {
      return <span className="text-sm text-[#B5A39A]">—</span>;
    }

    if (profile.platformType === "web") {
      return (
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#4E6A5B]">
          <Monitor size={15} />
          זמין בווב
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#6A63A8]">
        <Smartphone size={15} />
        זמין רק במובייל
      </span>
    );
  }

  return (
    <div className="rounded-[22px] border border-[#E7DCD5] bg-white overflow-hidden">
      <div className="hidden lg:grid grid-cols-[1.5fr_0.8fr_1fr] gap-4 px-5 py-3 bg-[#F8F4F1] border-b border-[#EFE5DF] text-sm font-bold text-[#7B5A4D] text-right">
        <div className="pr-2">פרופיל</div>
        <div className="text-center">סטטוס</div>
        <div className="text-right pr-2">זמינות</div>
      </div>

      <div className="divide-y divide-[#EFE5DF]">
        {props.items.map(function (item, index) {
          const isActive =
            item.ranchId === props.activeRole?.ranchId &&
            item.roleId === props.activeRole?.roleId;

          return (
            <div
              key={`${item.ranchId}-${item.roleId}-${index}`}
              className={
                "px-5 py-4 transition-colors " +
                (isActive ? "bg-[#FAF7F4]" : "bg-white")
              }
            >
              <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_0.8fr_1fr] gap-4 items-center text-right">
                <div className="pr-2">
                  <div className="text-lg font-bold text-[#3F312B]">
                    {item.ranchName}
                  </div>
                  <div className="mt-1 text-sm text-[#7B5A4D]">
                    {item.roleName}
                  </div>
                </div>

                <div className="flex justify-start lg:justify-center">
                  {renderStatusBadge(item.roleStatus)}
                </div>

                <div className="pr-2 flex items-center justify-start text-right">
                  {renderPlatformCell(item)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}