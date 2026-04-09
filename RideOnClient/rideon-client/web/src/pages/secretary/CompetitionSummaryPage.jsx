import { useEffect } from "react";
import CompetitionWorkspaceLayout from "../../components/secretary/competition-workspace/CompetitionWorkspaceLayout";
import { getCompetitionById } from "../../services/competitionService";
import { useActiveRole } from "../../context/ActiveRoleContext";

export default function CompetitionSummaryPage() {
  const activeRoleContext = useActiveRole();
  const activeRole = activeRoleContext.activeRole;

  return (
    <CompetitionWorkspaceLayout activeItemKey="competition-summary">
      {function (layout) {
        useEffect(
          function () {
            async function loadCompetition() {
              if (!layout.competitionId || !activeRole?.ranchId) {
                return;
              }

              try {
                var response = await getCompetitionById(
                  layout.competitionId,
                  activeRole.ranchId,
                );

                var competitionData = response.data || null;

                if (!competitionData) {
                  return;
                }

                layout.setCurrentCompetition({
                  competitionId: competitionData.competitionId,
                  competitionName: competitionData.competitionName || "",
                });
              } catch {
                return;
              }
            }

            loadCompetition();
          },
          [layout.competitionId, activeRole],
        );

        return (
          <div className="mx-auto max-w-[1450px] space-y-6">
            <div className="rounded-[28px] border border-[#E6DCD5] bg-white shadow-sm overflow-hidden">
              <div className="border-b border-[#EFE5DF] px-8 py-7">
                <h1 className="text-[2rem] font-bold text-[#3F312B]">
                  סיכום תחרות
                </h1>

                <p className="mt-2 text-sm text-[#8A7268]">
                  מסך ברירת המחדל לאחר כניסה לתחרות
                </p>
              </div>

              <div className="px-8 py-8 grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className="rounded-[24px] border border-[#EADFD8] bg-[#FCFAF8] p-6">
                  <p className="text-sm font-semibold text-[#7B5A4D]">
                    שם התחרות
                  </p>
                  <p className="mt-2 text-[1.2rem] font-bold text-[#3F312B]">
                    {layout.currentCompetition?.competitionName || "—"}
                  </p>
                </div>

                <div className="rounded-[24px] border border-[#EADFD8] bg-[#FCFAF8] p-6">
                  <p className="text-sm font-semibold text-[#7B5A4D]">
                    מזהה תחרות
                  </p>
                  <p className="mt-2 text-[1.2rem] font-bold text-[#3F312B]">
                    {layout.competitionId || "—"}
                  </p>
                </div>

                <div className="rounded-[24px] border border-[#EADFD8] bg-[#FCFAF8] p-6">
                  <p className="text-sm font-semibold text-[#7B5A4D]">
                    חווה פעילה
                  </p>
                  <p className="mt-2 text-[1.2rem] font-bold text-[#3F312B]">
                    {activeRole?.ranchName || "—"}
                  </p>
                </div>
              </div>

              <div className="px-8 pb-8">
                <div className="rounded-[24px] border border-dashed border-[#D8CBC3] bg-white px-6 py-10 text-right">
                  <p className="text-lg font-bold text-[#5D4037]">
                    בסיס מסך סיכום התחרות הוכן
                  </p>

                  <p className="mt-2 text-sm leading-7 text-[#8A7268]">
                    כאן נכניס בהמשך מדדי תחרות, תקציר סטטוסים, חריגים, תשלומים,
                    מסמכים, מקצים, פייד־טיים ותמונת מצב כללית.
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