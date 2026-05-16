function getGroupStats(group) {
  const total = group.items.length;

  const assigned = group.items.filter(function (item) {
    return item.isAssigned;
  }).length;

  const horses = group.items.filter(function (item) {
    return !item.isForTack;
  }).length;

  const tack = group.items.filter(function (item) {
    return item.isForTack;
  }).length;

  return {
    total: total,
    assigned: assigned,
    horses: horses,
    tack: tack,
  };
}

export default function StallAssignmentRanchTabs({
  ranchGroups,
  selectedRanchId,
  onSelectRanch,
}) {
  if (!ranchGroups || ranchGroups.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ranchGroups.map(function (group) {
        const stats = getGroupStats(group);
        const isActive = group.ranchId === selectedRanchId;

        return (
          <button
            key={group.ranchId}
            type="button"
            onClick={function () {
              onSelectRanch(group.ranchId);
            }}
            className={[
              "rounded-2xl border px-4 py-2 text-right transition-all",
              isActive
                ? "border-[#7B5A4D] bg-[#7B5A4D] text-white shadow-sm"
                : "border-[#D7CCC8] bg-white text-[#5D4037] hover:bg-[#FAF5F1]",
            ].join(" ")}
          >
            <div className="text-sm font-bold">{group.ranchName}</div>
            <div
              className={
                isActive ? "text-xs text-white/80" : "text-xs text-[#8D6E63]"
              }
            >
              {stats.horses} סוסים · {stats.tack} ציוד · {stats.assigned}/
              {stats.total} שובצו
            </div>
          </button>
        );
      })}
    </div>
  );
}
