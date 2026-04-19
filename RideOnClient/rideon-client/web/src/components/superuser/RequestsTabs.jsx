const tabs = [
  { key: "admin", label: "בקשות אדמין" },
  { key: "secretary", label: "בקשות מזכירה" },
  { key: "ranch", label: "בקשות חוות" },
  { key: "payer", label: "רישום משלמים" },
];

export default function RequestsTabs(props) {
  function getPendingCount(tabKey) {
    if (!props.pendingCounts) {
      return 0;
    }

    return props.pendingCounts[tabKey] || 0;
  }

  return (
    <div className="mt-8 border-b border-[#E8DDD6]">
      <div className="flex flex-wrap gap-2">
        {tabs.map(function (tab) {
          const isActive = props.activeTab === tab.key;
          const pendingCount = getPendingCount(tab.key);
          const hasPending = pendingCount > 0;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={function () {
                props.onChange(tab.key);
              }}
              className={
                "relative px-5 py-3 text-[1rem] font-semibold transition-colors flex items-center gap-2 " +
                (isActive
                  ? "text-[#5D4037]"
                  : "text-[#8A746A] hover:text-[#6B574F]")
              }
            >
              <span>{tab.label}</span>

              {hasPending ? (
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#C44E4E]" />
              ) : null}

              {isActive && (
                <span className="absolute bottom-0 right-0 left-0 h-[3px] rounded-full bg-[#8B6352]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}