// Shared container + header for all three competition-summary tabs. Container and header only --
// it does not own action logic. The caller renders its own action buttons and passes them through
// the optional `actions` slot.
export default function SummarySectionShell(props) {
  var actions = props.actions;

  return (
    <section className="rounded-[28px] border border-[#E6DCD5] bg-white p-8 shadow-sm">
      <div
        className={
          "mb-7 " +
          (actions ? "grid grid-cols-1 gap-5 xl:grid-cols-[1fr_260px_220px]" : "")
        }
      >
        <div>
          <h2 className="text-3xl font-black text-[#3F312B]">{props.title}</h2>

          {props.description ? (
            <p className="mt-2 text-sm text-[#8A7268]">{props.description}</p>
          ) : null}
        </div>

        {actions}
      </div>

      {props.children}
    </section>
  );
}
