import { Loader2 } from "lucide-react";

export default function TableActionButton(props) {
  const variant = props.variant || "neutral";

  const styles = {
    neutral:
      "border-[#DDD1CA] text-[#6B574F] hover:bg-[#F8F5F2]",
    success:
      "border-[#BFD5C3] text-[#2F6B3B] hover:bg-[#F3FAF4]",
    danger:
      "border-[#E4C1C1] text-[#A54848] hover:bg-[#FFF6F6]",
  };

  const isIconOnly = props.iconOnly === true;

  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      className={
        (isIconOnly
          ? "h-9 w-9 rounded-full "
          : "px-3.5 py-2 rounded-xl text-sm font-medium ") +
        "border bg-white shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 " +
        styles[variant]
      }
    >
      {props.loading ? <Loader2 size={16} className="animate-spin" /> : props.icon}
      {!isIconOnly ? props.label : null}
    </button>
  );
}