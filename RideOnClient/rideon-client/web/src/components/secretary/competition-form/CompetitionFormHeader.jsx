export default function CompetitionFormHeader(props) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-[2.2rem] font-bold text-[#3F312B]">
        {props.competitionId ? "עריכת תחרות" : "הקמת תחרות"}
      </h1>

      <button
        type="button"
        onClick={props.onBack}
        className="rounded-xl border border-[#BCAAA4] px-5 py-3 font-semibold text-[#6D4C41] transition-colors hover:bg-[#F8F5F2]"
      >
        חזרה ללוח תחרויות
      </button>
    </div>
  );
}