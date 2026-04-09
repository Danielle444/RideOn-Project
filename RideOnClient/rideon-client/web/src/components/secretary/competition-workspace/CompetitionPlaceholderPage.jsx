import CompetitionWorkspaceLayout from "./CompetitionWorkspaceLayout";

export default function CompetitionPlaceholderPage(props) {
  return (
    <CompetitionWorkspaceLayout activeItemKey={props.activeItemKey}>
      {function (layout) {
        return (
          <div className="mx-auto max-w-[1450px] space-y-6">
            <div className="rounded-[28px] border border-[#E6DCD5] bg-white shadow-sm overflow-hidden">
              <div className="border-b border-[#EFE5DF] px-8 py-7">
                <h1 className="text-[2rem] font-bold text-[#3F312B]">
                  {props.title}
                </h1>

                <p className="mt-2 text-sm text-[#8A7268]">
                  {props.description}
                </p>
              </div>

              <div className="px-8 py-8 space-y-5">
                <div className="rounded-[24px] border border-[#EADFD8] bg-[#FCFAF8] p-6">
                  <p className="text-sm font-semibold text-[#7B5A4D]">
                    תחרות פעילה
                  </p>

                  <p className="mt-2 text-[1.2rem] font-bold text-[#3F312B]">
                    {layout.currentCompetition?.competitionName || "לא נבחרה תחרות"}
                  </p>

                  <p className="mt-2 text-sm text-[#8A7268]">
                    מזהה תחרות: {layout.competitionId || "—"}
                  </p>
                </div>

                <div className="rounded-[24px] border border-dashed border-[#D8CBC3] bg-white px-6 py-10 text-right">
                  <p className="text-lg font-bold text-[#5D4037]">
                    בסיס העמוד הוכן
                  </p>

                  <p className="mt-2 text-sm leading-7 text-[#8A7268]">
                    {props.placeholderText}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      }}
    </CompetitionWorkspaceLayout>
  );
}