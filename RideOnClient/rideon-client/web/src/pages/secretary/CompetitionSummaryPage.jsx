import { useEffect, useRef, useState } from "react";
import CompetitionWorkspaceLayout from "../../components/secretary/competition-workspace/CompetitionWorkspaceLayout";
import CompetitionSummarySection from "../../components/secretary/competition-summary/CompetitionSummarySection";
import FinancialProjectionTabs, {
  TAB_PROJECTION,
  TAB_ACTUAL,
  TAB_COMPARISON,
} from "../../components/secretary/competition-summary/FinancialProjectionTabs";
import FinancialProjectionPanel from "../../components/secretary/competition-summary/FinancialProjectionPanel";
import FinancialComparisonPanel from "../../components/secretary/competition-summary/FinancialComparisonPanel";
import { FINANCIAL_PROJECTION_COPY } from "../../components/secretary/competition-summary/financialProjectionCopy";
import SummaryDetailsModal from "../../components/secretary/competition-summary/SummaryDetailsModal";
import SummaryPaymentsBreakdownModal from "../../components/secretary/competition-summary/SummaryPaymentsBreakdownModal";
import CashDeskModal from "../../components/secretary/competition-summary/CashDeskModal";
import { getCompetitionById } from "../../services/competitionService";
import { useActiveRole } from "../../context/ActiveRoleContext";
import useCompetitionSummaryPage from "../../hooks/secretary/useCompetitionSummaryPage";
import FederationMatchingSuggestionsModal from "../../components/secretary/competition-summary/FederationMatchingSuggestionsModal";
import {
  resolveFinancialActiveView,
  resolveEffectiveFinancialView,
} from "../../utils/financialSummaryView.utils";

function SummaryPageContent(props) {
  var layout = props.layout;
  var activeRole = props.activeRole;

  var page = useCompetitionSummaryPage({
    competitionId: Number(layout.competitionId),
    ranchId: activeRole?.ranchId || null,
  });

  // D5: land on Actual once registration is closed, else Prediction. financialRegistrationClosed
  // is NOT known synchronously -- it derives from finCompetition, which useCompetitionSummaryPage
  // fetches asynchronously and starts as null (isRegistrationClosed(null) is false), so a
  // useState initializer here would always see "open" and could never resolve to Actual for a
  // closed competition. resolveFinancialActiveView is re-run below every time registration-closed
  // becomes known, is skipped once the secretary has picked a tab herself, and always re-resolves
  // on a competition switch (mirrors resolveDefaultClassesView / hasChosenView on the classes page).
  var [activeView, setActiveView] = useState(TAB_PROJECTION);
  var [hasChosenView, setHasChosenView] = useState(false);
  var lastCompetitionIdRef = useRef(layout.competitionId);

  var hasActualData = page.financialActual
    ? page.financialActual.hasActualData
    : false;

  var financialViewAvailability = {
    projection: true,
    actual: !!page.financialRegistrationClosed,
    comparison: !!page.financialRegistrationClosed && !!hasActualData,
  };

  // Guard against landing on a view that is not available (e.g. state changed under us). The tab
  // strip and the page body both key off this same value, never off the raw activeView.
  var effectiveView = resolveEffectiveFinancialView(
    activeView,
    financialViewAvailability,
  );

  useEffect(
    function () {
      var resolution = resolveFinancialActiveView({
        previousCompetitionId: lastCompetitionIdRef.current,
        competitionId: layout.competitionId,
        hasChosenView: hasChosenView,
        currentActiveView: activeView,
        registrationClosed: page.financialRegistrationClosed,
      });

      lastCompetitionIdRef.current = layout.competitionId;
      setActiveView(resolution.activeView);
      setHasChosenView(resolution.hasChosenView);
    },
    [
      layout.competitionId,
      page.financialRegistrationClosed,
      hasChosenView,
      activeView,
    ],
  );

  function changeActiveView(nextView) {
    setHasChosenView(true);
    setActiveView(nextView);
  }

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

      {/* Phase 8 read-time income projection. Its tab format is borrowed from the classes
          view, but it lives here on the summary page, where the money already lives. The tab
          strip itself renders regardless of the summary's own loading state -- its data loads
          independently. Each view now owns the full page body below (D1): Prediction and
          Comparison never wait on the organizer/federation summary load; only Actual does. */}
      <FinancialProjectionTabs
        activeView={effectiveView}
        onChangeView={changeActiveView}
        registrationClosed={page.financialRegistrationClosed}
        hasActualData={hasActualData}
      />

      {effectiveView === TAB_PROJECTION ? (
        <div className="space-y-4">
          <FinancialProjectionPanel projection={page.financialProjection} />

          {hasActualData ? (
            <p className="rounded-xl border border-[#EFE3DC] bg-[#FBF7F4] px-4 py-2 text-xs text-[#8D6E63]">
              {FINANCIAL_PROJECTION_COPY.projectionActualsPointer}
            </p>
          ) : null}
        </div>
      ) : null}

      {effectiveView === TAB_ACTUAL ? (
        page.loading ? (
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
              onActionClick={page.openCashDetails}
              onCategoryClick={page.openOrganizerCategoryDetails}
              onPaidAmountClick={page.openOrganizerPaidBreakdown}
            />

            <CompetitionSummarySection
              title="התאחדות"
              description="חלק ההתאחדות מתוך הרשמות המקצים"
              totals={page.summary.federation}
              categories={page.summary.federationCategories}
              actionType="invoice"
              actionLoading={page.federationInvoiceImporting}
              actionError={page.federationInvoiceImportError}
              actionSuccess={page.federationInvoiceImportSuccess}
              invoiceImportResult={page.federationInvoiceImportResult}
              showQuantity={true}
              quantity={federationQuantity}
              showCategoriesTable={false}
              onInvoiceFileSelected={page.importFederationInvoices}
              onSecondaryActionClick={page.openFederationMatchingModal}
              secondaryActionLabel="התאמת קבלות"
              onExpectedAmountClick={page.openFederationClassesDetails}
            />
          </>
        )
      ) : null}

      {effectiveView === TAB_COMPARISON ? (
        <FinancialComparisonPanel actual={page.financialActual} />
      ) : null}

      <SummaryDetailsModal
        modal={page.detailsModal}
        detailsItems={page.detailsItems}
        detailsLoading={page.detailsLoading}
        detailsError={page.detailsError}
        detailsDayGroups={page.detailsDayGroups}
        selectedDay={page.selectedDay}
        selectedDayItems={page.selectedDayItems}
        paidTimeProductColumns={page.paidTimeProductColumns}
        selectedDetailItem={page.selectedDetailItem}
        entryItems={page.entryItems}
        entriesLoading={page.entriesLoading}
        entriesError={page.entriesError}
        onClose={page.closeDetailsModal}
        onDetailRowClick={page.openEntriesForDetail}
        onOpenDay={page.openDetailsDay}
        onBackToDetails={page.backToDetailsList}
        onBackToDayList={page.backToDayList}
      />

      <SummaryPaymentsBreakdownModal
        modal={page.paymentsModal}
        breakdownItems={page.paymentBreakdownItems}
        batchItems={page.paymentBatchItems}
        batchMethods={page.paymentBatchMethods}
        batchCharges={page.paymentBatchCharges}
        loading={page.paymentsLoading}
        error={page.paymentsError}
        onClose={page.closePaymentsModal}
        onBack={page.backInPaymentsModal}
        onOpenAllBatches={function () {
          page.openPaymentBatches(null);
        }}
        onOpenMethodBatches={page.openPaymentBatches}
        onOpenBatchDetails={page.openPaymentBatchDetails}
      />

      <CashDeskModal
        open={page.cashDeskOpen}
        overview={page.cashDeskOverview}
        loading={page.cashDeskLoading}
        saving={page.cashDeskSaving}
        error={page.cashDeskError}
        success={page.cashDeskSuccess}
        onClose={page.closeCashDesk}
        onSaveCount={page.saveCashCount}
        onSaveSafeTransfer={page.saveCashSafeTransfer}
      />

      <FederationMatchingSuggestionsModal
        open={page.federationMatchingOpen}
        items={page.federationMatchingItems}
        loading={page.federationMatchingLoading}
        approving={page.federationMatchingApproving}
        error={page.federationMatchingError}
        success={page.federationMatchingSuccess}
        activeTab={page.federationMatchingActiveTab}
        manualCreditSearchText={page.manualCreditSearchText}
        manualCredits={page.manualCredits}
        manualCreditsLoading={page.manualCreditsLoading}
        selectedManualCredit={page.selectedManualCredit}
        manualPayerSearchText={page.manualPayerSearchText}
        manualPayers={page.manualPayers}
        manualPayersLoading={page.manualPayersLoading}
        selectedManualPayer={page.selectedManualPayer}
        manualFederationCharges={page.manualFederationCharges}
        manualChargesLoading={page.manualChargesLoading}
        manualAllocationAmount={page.manualAllocationAmount}
        onClose={page.closeFederationMatchingModal}
        onReload={page.loadFederationMatchingSuggestions}
        onApprove={page.approveFederationMatchingSuggestion}
        onChangeTab={page.changeFederationMatchingTab}
        onManualCreditSearchTextChange={page.changeManualCreditSearchText}
        onSearchManualCredits={page.searchManualFederationCredits}
        onSelectManualCredit={page.selectManualCredit}
        onManualPayerSearchTextChange={page.changeManualPayerSearchText}
        onSearchManualPayers={page.searchManualPayers}
        onSelectManualPayer={page.selectManualPayer}
        onManualAllocationAmountChange={page.changeManualAllocationAmount}
        onApproveManualAllocation={page.approveManualFederationAllocation}
      />
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
