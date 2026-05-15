function getTabClass(isActive) {
  return (
    "rounded-2xl border px-5 py-2 text-sm font-bold transition-colors " +
    (isActive
      ? "border-[#8B6352] bg-[#8B6352] text-white shadow-sm"
      : "border-[#E2D5CE] bg-white text-[#6B574F] hover:bg-[#FAF5F1]")
  );
}

export default function ChangeRequestsTabs(props) {
  var tabs = Array.isArray(props.tabs) ? props.tabs : [];

  return (
    <section className="rounded-3xl border border-[#EFE5DF] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#3F312B]">סטטוס בקשות</h2>
          <p className="text-xs text-[#8D6E63]">
            מעבר בין בקשות ממתינות, מאושרות ונדחות
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map(function (tab) {
            return (
              <button
                key={tab.key}
                type="button"
                onClick={function () {
                  props.onChange(tab.key);
                }}
                className={getTabClass(props.activeStatus === tab.key)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
