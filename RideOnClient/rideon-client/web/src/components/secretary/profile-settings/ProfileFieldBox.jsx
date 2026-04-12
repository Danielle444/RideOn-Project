export default function ProfileFieldBox(props) {
  if (props.editable) {
    return (
      <div className="rounded-2xl border border-[#E7DCD5] bg-white px-4 py-3 min-h-[86px]">
        <label className="text-sm font-semibold text-[#7B5A4D]">
          {props.label}
        </label>
        <input
          value={props.value}
          onChange={props.onChange}
          disabled={props.disabled}
          className={
            "mt-2 h-10 w-full rounded-xl border px-4 shadow-sm focus:outline-none focus:ring-2 " +
            (props.disabled
              ? "border-[#E6DCD5] bg-[#F7F3F1] text-[#8A7268] cursor-not-allowed"
              : "border-[#D8CBC3] bg-white text-[#3F312B] focus:ring-[#D2B7A7]") +
            (props.textAlign === "left" ? " text-left" : " text-right")
          }
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E7DCD5] bg-white px-4 py-3 min-h-[86px]">
      <div className="text-sm font-semibold text-[#7B5A4D]">{props.label}</div>
      <div className="mt-2 text-[0.98rem] text-[#3F312B] break-words leading-6">
        {props.value || "—"}
      </div>
    </div>
  );
}