// Shared figure card for all three competition-summary tabs. Presentation-only -- the caller
// passes an already-formatted `value` node; this component never formats money or counts itself.
export default function SummaryFigureCard(props) {
  var colorClass = props.colorClass || "text-[#7B5A4D]";
  var isStatic = !props.onClick;
  var available = props.available !== false;

  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={isStatic}
      className={
        "min-w-0 rounded-2xl border border-[#E3D7D0] bg-white px-6 py-5 text-right shadow-sm disabled:cursor-default " +
        (props.onClick ? "cursor-pointer transition-colors hover:bg-[#FCF8F5]" : "")
      }
    >
      <p className="text-sm font-bold text-[#6D4C41]">{props.title}</p>

      {available ? (
        <>
          <p
            className={
              "mt-3 break-words text-2xl font-black tabular-nums lg:text-3xl " +
              colorClass
            }
          >
            {props.value}
          </p>

          {props.hint ? (
            <p className="mt-2 text-xs text-[#8D6E63]">{props.hint}</p>
          ) : null}
        </>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-[#D9C7BD] bg-[#FBF7F4] px-4 py-3 text-sm text-[#8D6E63]">
          {props.prompt}
        </p>
      )}
    </button>
  );
}
