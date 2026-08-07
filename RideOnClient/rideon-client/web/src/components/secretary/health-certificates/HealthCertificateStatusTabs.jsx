// Same visual convention as ChangeRequestsTabs (secretary/change-tracking),
// with an added per-tab count. Kept as its own small component rather than
// extending ChangeRequestsTabs so this feature stays self-contained and the
// unrelated change-tracking page is not touched by this change.

function getTabClass(isActive) {
  return (
    "rounded-2xl border px-5 py-2 text-sm font-bold transition-colors " +
    (isActive
      ? "border-[#8B6352] bg-[#8B6352] text-white shadow-sm"
      : "border-[#E2D5CE] bg-white text-[#6B574F] hover:bg-[#FAF5F1]")
  );
}

export default function HealthCertificateStatusTabs(props) {
  var tabs = Array.isArray(props.tabs) ? props.tabs : [];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(function (tab) {
        var isActive = props.activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={function () {
              props.onChange(tab.key);
            }}
            className={getTabClass(isActive)}
          >
            {tab.label} ({tab.count})
          </button>
        );
      })}
    </div>
  );
}
