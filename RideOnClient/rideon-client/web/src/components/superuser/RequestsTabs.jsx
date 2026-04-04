const tabs = [
  { key: "admin", label: "בקשות אדמין" },
  { key: "secretary", label: "בקשות מזכירה" },
  { key: "ranch", label: "בקשות חוות" },
];

export default function RequestsTabs(props) {
  return (
    <div className="mt-8 border-b border-[#E8DDD6]">
      <div className="flex flex-wrap gap-2">
        {tabs.map(function (tab) {
          const isActive = props.activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={function () {
                props.onChange(tab.key);
              }}
              className={
                "relative px-5 py-3 text-[1rem] font-semibold transition-colors " +
                (isActive
                  ? "text-[#5D4037]"
                  : "text-[#8A746A] hover:text-[#6B574F]")
              }
            >
              {tab.label}

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