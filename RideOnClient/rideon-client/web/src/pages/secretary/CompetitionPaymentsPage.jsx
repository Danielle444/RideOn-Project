import { useEffect } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import CompetitionWorkspaceLayout from "../../components/secretary/competition-workspace/CompetitionWorkspaceLayout";
import CreatePaymentModal from "../../components/secretary/competition-payments/CreatePaymentModal";
import PayerAccountCards from "../../components/secretary/competition-payments/PayerAccountCards";
import PayersList from "../../components/secretary/competition-payments/PayersList";
import PaymentCategoriesSidebar from "../../components/secretary/competition-payments/PaymentCategoriesSidebar";
import PaymentChargesTable from "../../components/secretary/competition-payments/PaymentChargesTable";
import { getCompetitionById } from "../../services/competitionService";
import { useActiveRole } from "../../context/ActiveRoleContext";
import useCompetitionPaymentsPage from "../../hooks/secretary/useCompetitionPaymentsPage";

function getValue(item, camelKey, pascalKey, fallback) {
  if (!item) {
    return fallback;
  }

  if (item[camelKey] !== null && item[camelKey] !== undefined) {
    return item[camelKey];
  }

  if (item[pascalKey] !== null && item[pascalKey] !== undefined) {
    return item[pascalKey];
  }

  return fallback;
}

function formatMoney(value) {
  return "₪" + Number(value || 0).toLocaleString("he-IL");
}

function PaymentsPageContent(props) {
  var layout = props.layout;
  var activeRole = props.activeRole;

  var page = useCompetitionPaymentsPage({
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

  if (!page.selectedPayer) {
    return (
      <div
        className="mx-auto max-w-[1450px] space-y-8 overflow-hidden"
        dir="rtl"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-4xl font-black text-[#3F312B]">תשלומים</h1>

            <p className="mt-2 text-sm text-[#8A7268]">
              ניהול חשבונות ותשלומים לפי משלם בתחרות
            </p>
          </div>

          <button
            type="button"
            onClick={page.loadPayers}
            className="flex items-center justify-center gap-2 rounded-2xl border border-[#D8CBC3] bg-white px-5 py-3 font-bold text-[#6D4C41] transition-colors hover:bg-[#F8F3EF]"
          >
            <RefreshCw size={17} />
            רענון
          </button>
        </div>

        <PayersList
          items={page.payers}
          loading={page.payersLoading}
          error={page.payersError}
          onOpenPayer={page.openPayerAccount}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1450px] space-y-8 overflow-hidden" dir="rtl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            onClick={page.closePayerAccount}
            className="mb-4 flex items-center gap-2 rounded-2xl border border-[#D8CBC3] bg-white px-4 py-2 text-sm font-bold text-[#6D4C41] transition-colors hover:bg-[#F8F3EF]"
          >
            <ArrowRight size={16} />
            חזרה לרשימת משלמים
          </button>

          <h1 className="break-words text-4xl font-black text-[#3F312B]">
            {getValue(
              page.selectedPayer,
              "payerName",
              "PayerName",
              "חשבון משלם",
            )}
          </h1>

          <p className="mt-2 text-sm text-[#8A7268]">
            פירוט חשבון, קטגוריות ושורות חיוב לתשלום
          </p>
        </div>

        <div className="shrink-0 rounded-2xl border border-[#E6DCD5] bg-white px-6 py-4 text-right shadow-sm">
          <p className="text-xs font-bold text-[#8A7268]">נבחר לתשלום</p>
          <p className="mt-1 text-2xl font-black text-[#3F312B]">
            {formatMoney(page.selectedTotal)}
          </p>
        </div>
      </div>

      {page.accountError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {page.accountError}
        </div>
      ) : null}

      {page.paymentSuccess ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {page.paymentSuccess}
        </div>
      ) : null}

      {page.accountLoading ? (
        <div className="rounded-[28px] border border-[#E6DCD5] bg-white px-8 py-12 text-center text-[#7B5A4D] shadow-sm">
          טוען חשבון...
        </div>
      ) : (
        <>
          <PayerAccountCards
            items={page.accountSummary}
            activeOwner={page.selectedOwner}
            onSelectOwner={page.selectOwner}
          />

          <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <div className="min-w-0">
              <PaymentCategoriesSidebar
                items={page.categorySummary}
                activeOwner={page.selectedOwner}
                activeCategoryKey={page.selectedCategoryKey}
                onSelectCategory={page.selectCategory}
              />
            </div>

            <div className="min-w-0 space-y-4 overflow-hidden">
              <div className="flex min-w-0 flex-col gap-3 rounded-[24px] border border-[#E6DCD5] bg-white p-5 shadow-sm xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-[#3F312B]">
                    שורות חיוב
                  </h2>

                  <p className="mt-1 text-sm text-[#8A7268]">
                    בחירת שורת מקצה תבחר אוטומטית גם את חלק המארגן וגם את חלק
                    ההתאחדות של אותו מקצה. בנסורת, בחירת שורה אחת בוחרת את כל
                    חיוב הנסורת של אותו משלם.
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={page.clearSelectedCharges}
                    disabled={page.selectedChargeIds.length === 0}
                    className="rounded-2xl border border-[#D8CBC3] bg-white px-5 py-3 font-bold text-[#6D4C41] transition-colors hover:bg-[#F8F3EF] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ניקוי בחירה
                  </button>

                  <button
                    type="button"
                    onClick={page.openPaymentModal}
                    disabled={page.selectedChargeIds.length === 0}
                    className="rounded-2xl bg-[#8B5E4C] px-6 py-3 font-bold text-white transition-colors hover:bg-[#765041] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    הוספת תשלום
                  </button>
                </div>
              </div>

              <PaymentChargesTable
                items={page.visibleCharges}
                selectedChargeIds={page.selectedChargeIds}
                visibleSelectableChargeIds={page.visibleSelectableChargeIds}
                allVisibleChargesSelected={page.allVisibleChargesSelected}
                onToggleCharge={page.toggleCharge}
                onToggleSelectAllVisibleCharges={
                  page.toggleSelectAllVisibleCharges
                }
              />
            </div>
          </div>
        </>
      )}

      <CreatePaymentModal
        open={page.paymentModalOpen}
        selectedCharges={page.selectedCharges}
        selectedTotal={page.selectedTotal}
        paymentMethods={page.paymentMethods}
        loading={page.creatingPayment}
        error={page.paymentError}
        onClose={page.closePaymentModal}
        onSubmit={page.submitPayment}
      />
    </div>
  );
}

export default function CompetitionPaymentsPage() {
  var activeRoleContext = useActiveRole();
  var activeRole = activeRoleContext.activeRole;

  return (
    <CompetitionWorkspaceLayout activeItemKey="payments">
      {function (layout) {
        return <PaymentsPageContent layout={layout} activeRole={activeRole} />;
      }}
    </CompetitionWorkspaceLayout>
  );
}
