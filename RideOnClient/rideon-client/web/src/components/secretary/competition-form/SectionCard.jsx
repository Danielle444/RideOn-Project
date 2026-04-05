import { ChevronDown, ChevronUp } from "lucide-react";

export default function SectionCard(props) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#E6DCD5] bg-white shadow-sm">
      <button
        type="button"
        onClick={props.onToggle}
        disabled={props.isDisabled}
        className={
          "flex w-full items-center justify-between px-7 py-6 text-right transition-opacity " +
          (props.isDisabled ? "cursor-not-allowed opacity-60" : "")
        }
      >
        <div className="flex items-center gap-3 text-[#4E342E]">
          {props.isOpen ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
          <span className="text-[1.75rem] font-bold">{props.title}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#F8EBDD] px-4 py-1 text-sm font-semibold text-[#D0832D]">
            {props.statusText}
          </span>
        </div>
      </button>

      {props.isOpen ? (
        <div className="border-t border-[#EFE5DF] px-8 py-8">{props.children}</div>
      ) : null}
    </div>
  );
}