export default function CompetitionFormHeader(props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-[2.2rem] font-bold text-[#3F312B]">
          {props.competitionId ? "עריכת תחרות" : "הקמת תחרות"}
        </h1>

        {!props.competitionId ? (
          <p className="mt-1 text-sm text-[#8A7268]">
            ניתן להקים תחרות חדשה ידנית או לשכפל תחרות קיימת מאותו ענף.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!props.competitionId ? (
          <button
            type="button"
            onClick={props.onDuplicate}
            className="rounded-xl border border-[#BCAAA4] bg-white px-5 py-3 font-semibold text-[#6D4C41] transition-colors hover:bg-[#F8F5F2]"
          >
            שכפול מתחרות קיימת
          </button>
        ) : null}

        <button
          type="button"
          onClick={props.onBack}
          className="rounded-xl border border-[#BCAAA4] px-5 py-3 font-semibold text-[#6D4C41] transition-colors hover:bg-[#F8F5F2]"
        >
          חזרה ללוח תחרויות
        </button>
      </div>
    </div>
  );
}
