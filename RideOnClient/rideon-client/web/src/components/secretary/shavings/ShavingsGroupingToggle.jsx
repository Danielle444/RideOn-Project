// Ranch | Status grouping toggle — Spec 2 (CAP-2). URL-bound via the hook's setGroup.
const OPTIONS = [
  { key: "ranch", label: "לפי חווה" },
  { key: "status", label: "לפי סטטוס" },
];

export default function ShavingsGroupingToggle(props) {
  const group = props.group;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-bold text-[#6D4C41]">קיבוץ</span>

      <div className="inline-flex rounded-full border border-[#E3D7D0] bg-[#F7F1EC] p-1">
        {OPTIONS.map(function (option) {
          const isActive = group === option.key;

          return (
            <button
              key={option.key}
              type="button"
              onClick={function () {
                props.onChange(option.key);
              }}
              className={
                "rounded-full px-4 py-1.5 text-sm font-bold transition-colors " +
                (isActive
                  ? "bg-white text-[#3F312B] shadow-sm"
                  : "text-[#8A7268] hover:text-[#5D4037]")
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
