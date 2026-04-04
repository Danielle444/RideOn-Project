export default function DataTableShell(props) {
  const widthMode = props.widthMode || "full";

  return (
    <div
      className={
        "mt-4 overflow-x-auto rounded-2xl border border-[#ECE2DC] bg-white " +
        (widthMode === "fit" ? "w-fit max-w-full" : "w-full")
      }
    >
      <table
        className={
          props.tableClassName ||
          (widthMode === "fit"
            ? "text-right"
            : "w-full min-w-[920px] text-right")
        }
      >
        {props.children}
      </table>
    </div>
  );
}