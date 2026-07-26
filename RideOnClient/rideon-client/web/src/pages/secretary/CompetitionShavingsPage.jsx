import CompetitionWorkspaceLayout from "../../components/secretary/competition-workspace/CompetitionWorkspaceLayout";

// Spec 1 retired the secretary delivery-approval flow. This page previously WAS the
// approval queue (pending-approvals + approve buttons), all backed by endpoints that no
// longer exist. It is reduced to a neutral placeholder here so navigation keeps working;
// the redesigned order list (ranch/status grouping, SLA highlighting) is Spec 2's scope.
export default function CompetitionShavingsPage() {
  return (
    <CompetitionWorkspaceLayout activeItemKey="shavings">
      {function () {
        return (
          <div className="mx-auto max-w-[1450px]">
            <div className="rounded-[28px] border border-[#E6DCD5] bg-white shadow-sm overflow-hidden">
              <div className="border-b border-[#EFE5DF] px-8 py-7">
                <h1 className="text-[2rem] font-bold text-[#3F312B]">
                  הזמנות נסורת
                </h1>
                <p className="mt-1 text-sm text-[#8A7268]">
                  אישור המזכירה בוטל. תצוגת ההזמנות המעודכנת בהכנה.
                </p>
              </div>
              <div className="px-6 py-16 text-center text-sm text-[#8A7268]">
                עמוד הנסורת יעודכן בקרוב.
              </div>
            </div>
          </div>
        );
      }}
    </CompetitionWorkspaceLayout>
  );
}
