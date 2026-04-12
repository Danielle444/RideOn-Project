import { ChevronDown, ChevronUp } from "lucide-react";

export default function SettingsSectionHeader(props) {
  const Icon = props.icon;
  const isExpanded = props.expandedSection === props.sectionKey;

  return (
    <button
      type="button"
      onClick={function () {
        props.onToggle(props.sectionKey);
      }}
      className="w-full px-6 py-5 flex items-center justify-between gap-4 text-right hover:bg-[#FCFAF8] transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F3ECE8] text-[#7B5A4D]">
          <Icon size={18} />
        </div>

        <div className="text-right min-w-0">
          <h2 className="text-lg font-bold text-[#3F312B] truncate">
            {props.title}
          </h2>
          <p className="mt-1 text-sm text-[#8A7268] truncate">
            {props.subtitle}
          </p>
        </div>
      </div>

      <div className="shrink-0 text-[#7B5A4D]">
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>
    </button>
  );
}