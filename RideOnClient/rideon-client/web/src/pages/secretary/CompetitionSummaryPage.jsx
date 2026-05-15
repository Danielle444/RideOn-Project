import { useEffect } from "react";
import CompetitionWorkspaceLayout from "../../components/secretary/competition-workspace/CompetitionWorkspaceLayout";
import CompetitionSummarySection from "../../components/secretary/competition-summary/CompetitionSummarySection";
import { getCompetitionById } from "../../services/competitionService";
import { useActiveRole } from "../../context/ActiveRoleContext";
import useCompetitionSummaryPage from "../../hooks/secretary/useCompetitionSummaryPage";

function SummaryPageContent(props) {
  var layout = props.layout;
  var activeRole = props.activeRole;

  var page = useCompetitionSummaryPage({
    competitionId: Number(layout.competitionId),
    ranchId: activeRole?.ranchId || null,
  });

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
    [layout.competitionId, activeRole?.ranchId],
  );

  function handleCategoryClick(item) {
    console.log("summary category clicked", item);
  }

  var federationQuantity = 0;

  if (
    page.summary.federationCategories &&
    page.summary.federationCategories.length > 0
  ) {
    federationQuantity =
      page.summary.federationCategories[0].quantity ||
      page.summary.federationCategories[0].Quantity ||
      0;
  }

  return (
    <div className="mx-auto max-w-[1450px] space-y-8" dir="rtl">
      <div>
        <h1 className="text-4xl font-black text-[#3F312B]">סיכום תחרות</h1>

        <p className="mt-2 text-sm text-[#8A7268]">
          תמונת מצב מרוכזת של הכנסות, תשלומים וקטגוריות בתחרות
        </p>
      </div>

      {page.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {page.error}
        </div>
      ) : null}

      {page.loading ? (
        <div className="rounded-[28px] border border-[#E6DCD5] bg-white px-8 py-12 text-center text-[#7B5A4D] shadow-sm">
          טוען סיכום תחרות...
        </div>
      ) : (
        <>
          <CompetitionSummarySection
            title="מארגן"
            description="הכנסות המארגן ממקצים, פייד־טיים, תאים ונסורת"
            totals={page.summary.organizer}
            categories={page.summary.organizerCategories}
            actionType="cash"
            onCategoryClick={handleCategoryClick}
          />

          <CompetitionSummarySection
            title="התאחדות"
            description="חלק ההתאחדות מתוך הרשמות המקצים"
            totals={page.summary.federation}
            categories={page.summary.federationCategories}
            actionType="invoice"
            showQuantity={true}
            quantity={federationQuantity}
            showCategoriesTable={false}
          />
        </>
      )}
    </div>
  );
}

export default function CompetitionSummaryPage() {
  var activeRoleContext = useActiveRole();
  var activeRole = activeRoleContext.activeRole;

  return (
    <CompetitionWorkspaceLayout activeItemKey="competition-summary">
      {function (layout) {
        return <SummaryPageContent layout={layout} activeRole={activeRole} />;
      }}
    </CompetitionWorkspaceLayout>
  );
}
