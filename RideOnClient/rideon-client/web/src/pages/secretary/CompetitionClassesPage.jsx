import { useParams } from "react-router-dom";
import { ArrowRight, RefreshCw, RotateCcw } from "lucide-react";

import CompetitionWorkspaceLayout from "../../components/secretary/competition-workspace/CompetitionWorkspaceLayout";
import TableActionButton from "../../components/common/table/TableActionButton";
import SecretaryClassesOverviewTable from "../../components/secretary/classes/SecretaryClassesOverviewTable";
import SecretaryClassesViewTabs from "../../components/secretary/classes/SecretaryClassesViewTabs";
import ScheduleDayNotices from "../../components/secretary/classes/ScheduleDayNotices";
import PlannedVsActualPanel from "../../components/secretary/classes/PlannedVsActualPanel";
import DayRecommendationsPanel from "../../components/secretary/classes/DayRecommendationsPanel";
import RegistrationWindowPanel from "../../components/secretary/classes/RegistrationWindowPanel";
import PlanningForecastCards from "../../components/secretary/classes/PlanningForecastCards";
import {
  CLASSES_VIEW_ACTUALS,
  CLASSES_VIEW_FINANCIAL,
  CLASSES_VIEW_PLANNING,
} from "../../utils/classesView.utils";
import SecretaryClassEntriesTable from "../../components/secretary/classes/SecretaryClassEntriesTable";
import SecretaryClassEntriesSummaryCards from "../../components/secretary/classes/SecretaryClassEntriesSummaryCards";
import ClassInCompetitionModal from "../../components/secretary/ClassInCompetitionModal";
import ToastMessage from "../../components/common/ToastMessage";
import useSecretaryCompetitionClassesPage from "../../hooks/secretary/useSecretaryCompetitionClassesPage";
import { useActiveRole } from "../../context/ActiveRoleContext";

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("he-IL");
}

function getDayName(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("he-IL", {
    weekday: "long",
  });
}

function getClassTitle(item) {
  if (!item) {
    return "";
  }

  return item.className || item.ClassName || "";
}

function getClassDate(item) {
  if (!item) {
    return "";
  }

  return String(item.classDateTime || item.ClassDateTime || "").substring(
    0,
    10,
  );
}

function getOrderInDay(item) {
  if (!item) {
    return "";
  }

  return item.orderInDay || item.OrderInDay || "";
}

function getFilterButtonClass(isActive) {
  return (
    "rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors " +
    (isActive
      ? "border-[#8B6352] bg-[#8B6352] text-white"
      : "border-[#E2D5CE] bg-white text-[#6B574F] hover:bg-[#FAF5F1]")
  );
}

export default function CompetitionClassesPage() {
  var params = useParams();
  var activeRoleContext = useActiveRole();

  var competitionId = Number(params.competitionId);
  var ranchId = activeRoleContext.activeRole?.ranchId || null;

  var page = useSecretaryCompetitionClassesPage({
    competitionId: competitionId,
    ranchId: ranchId,
  });

  function renderTitle() {
    if (page.viewMode === "class" && page.selectedClass) {
      return "מקצה: " + getClassTitle(page.selectedClass);
    }

    if (page.viewMode === "group" && page.selectedGroup) {
      return (
        "כניסות למס׳ " +
        page.selectedGroup.orderInDay +
        " - " +
        formatDate(page.selectedGroup.classDate)
      );
    }

    return "מקצים";
  }

  function renderSubtitle() {
    if (page.viewMode === "class" && page.selectedClass) {
      return (
        getDayName(getClassDate(page.selectedClass)) +
        " · " +
        formatDate(getClassDate(page.selectedClass)) +
        " · מס׳ " +
        getOrderInDay(page.selectedClass)
      );
    }

    if (page.viewMode === "group" && page.selectedGroup) {
      return "כל הכניסות לכל המקצים באותו יום ובאותו מספר סדר";
    }

    return "ניהול וצפייה במקצים עבור התחרות הפעילה";
  }

  return (
    <CompetitionWorkspaceLayout activeItemKey="classes">
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#3F312B]">
              {renderTitle()}
            </h1>
            <p className="text-sm text-[#8D6E63]">{renderSubtitle()}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {page.viewMode !== "classes" ? (
              <>
                <TableActionButton
                  label="חזרה למקצים"
                  icon={<ArrowRight size={15} />}
                  onClick={page.backToClasses}
                  disabled={page.savingDrawOrder || page.generatingDrawPreview}
                />

                <button
                  type="button"
                  onClick={function () {
                    if (page.cancelledFilter === "only") {
                      page.setCancelledFilter("hide");
                    } else {
                      page.setCancelledFilter("only");
                    }
                  }}
                  className={
                    "rounded-2xl border px-4 py-2 text-sm font-bold transition-colors " +
                    (page.cancelledFilter === "only"
                      ? "border-[#A54848] bg-[#F9E5E5] text-[#A54848]"
                      : "border-[#E2D5CE] bg-white text-[#6B574F] hover:bg-[#FAF5F1]")
                  }
                  title="הצג רק הרשמות שבוטלו"
                >
                  {page.cancelledFilter === "only"
                    ? "הצג רק פעילות"
                    : "הצג הרשמות מבוטלות"}
                </button>
              </>
            ) : null}

            <TableActionButton
              label="רענון"
              icon={<RefreshCw size={15} />}
              onClick={page.loadPageData}
              loading={page.loadingClasses || page.loadingEntries}
              disabled={page.savingDrawOrder || page.generatingDrawPreview}
            />
          </div>
        </div>

        {page.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {page.error}
          </div>
        ) : null}

        {page.viewMode === "classes" ? (
          <>
            <section className="rounded-3xl border border-[#EFE5DF] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#3F312B]">
                    ימים בתחרות
                  </h2>
                  <p className="text-xs text-[#8D6E63]">
                    בחרי יום כדי לראות את המקצים שלו
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {page.availableDates.map(function (date) {
                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={function () {
                          page.changeSelectedDate(date);
                        }}
                        className={
                          "rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors " +
                          (page.selectedDate === date
                            ? "border-[#8B6352] bg-[#8B6352] text-white"
                            : "border-[#E2D5CE] bg-white text-[#6B574F] hover:bg-[#FAF5F1]")
                        }
                      >
                        {getDayName(date)} · {formatDate(date)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <SecretaryClassesViewTabs
              activeView={page.activeView}
              isViewAvailable={page.isViewAvailable}
              onChangeView={page.changeActiveView}
            />

            {/* The paid/unpaid actuals cards are meaningless before registration closes --
                nothing has been paid yet -- so the planning view gets forecast cards
                instead. Financial keeps the money-flavoured actuals cards. */}
            {page.activeView === CLASSES_VIEW_PLANNING ? (
              <PlanningForecastCards forecast={page.planningForecast} />
            ) : (
              <SecretaryClassEntriesSummaryCards
                summary={page.visibleClassesSummary}
                titlePrefix="כניסות ביום"
              />
            )}

            {page.activeView === CLASSES_VIEW_ACTUALS ? (
              <PlannedVsActualPanel summary={page.plannedVsActualSummary} />
            ) : null}

            {/* Only meaningful while registration is open, which is also the only time the
                analysis returns isOpen -- the panel hides itself otherwise. */}
            {page.activeView !== CLASSES_VIEW_FINANCIAL ? (
              <RegistrationWindowPanel
                analysis={page.registrationWindow}
                competitionName={
                  page.competitionDetails
                    ? page.competitionDetails.competitionName ||
                      page.competitionDetails.CompetitionName
                    : ""
                }
              />
            ) : null}

            {page.activeView !== CLASSES_VIEW_FINANCIAL ? (
              <DayRecommendationsPanel
                recommendations={page.dayRecommendations}
                responses={page.recommendationResponses}
                onRespond={page.respondToRecommendation}
              />
            ) : null}

            {/* The notices belong to the schedule, so they follow it: absent from the
                financial view, present in both time-phase views. */}
            {page.activeView !== CLASSES_VIEW_FINANCIAL ? (
              <ScheduleDayNotices
                notices={page.scheduleDayNotices}
                onApplySuggestion={page.applyStartTimeSuggestion}
                applyingSuggestionClassId={page.applyingSuggestionClassId}
              />
            ) : null}

            <section className="rounded-3xl border border-[#EFE5DF] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#3F312B]">
                    סינון מקצים
                  </h2>
                  <p className="text-xs text-[#8D6E63]">
                    סינון וחיפוש בתוך היום שנבחר
                  </p>
                </div>

                <TableActionButton
                  label="ניקוי סינון"
                  icon={<RotateCcw size={15} />}
                  onClick={page.clearClassFilters}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr_1fr_1fr]">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                    חיפוש מקצה
                  </label>
                  <input
                    type="text"
                    value={page.classSearchText}
                    onChange={function (event) {
                      page.setClassSearchText(event.target.value);
                    }}
                    placeholder="שם מקצה, שופט, מגרש או מסלול..."
                    className="h-11 w-full rounded-2xl border border-[#E2D5CE] bg-white px-4 text-right text-sm text-[#3F312B] outline-none transition-colors focus:border-[#8B6352]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                    פרס
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={function () {
                        page.setClassPrizeFilter("all");
                      }}
                      className={getFilterButtonClass(
                        page.classPrizeFilter === "all",
                      )}
                    >
                      הכל
                    </button>

                    <button
                      type="button"
                      onClick={function () {
                        page.setClassPrizeFilter("withPrize");
                      }}
                      className={getFilterButtonClass(
                        page.classPrizeFilter === "withPrize",
                      )}
                    >
                      עם פרס
                    </button>

                    <button
                      type="button"
                      onClick={function () {
                        page.setClassPrizeFilter("withoutPrize");
                      }}
                      className={getFilterButtonClass(
                        page.classPrizeFilter === "withoutPrize",
                      )}
                    >
                      בלי פרס
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                    כניסות
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={function () {
                        page.setClassEntriesFilter("all");
                      }}
                      className={getFilterButtonClass(
                        page.classEntriesFilter === "all",
                      )}
                    >
                      הכל
                    </button>

                    <button
                      type="button"
                      onClick={function () {
                        page.setClassEntriesFilter("withEntries");
                      }}
                      className={getFilterButtonClass(
                        page.classEntriesFilter === "withEntries",
                      )}
                    >
                      יש כניסות
                    </button>

                    <button
                      type="button"
                      onClick={function () {
                        page.setClassEntriesFilter("withoutEntries");
                      }}
                      className={getFilterButtonClass(
                        page.classEntriesFilter === "withoutEntries",
                      )}
                    >
                      אין כניסות
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                    הגרלה
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={function () {
                        page.setClassDrawFilter("all");
                      }}
                      className={getFilterButtonClass(
                        page.classDrawFilter === "all",
                      )}
                    >
                      הכל
                    </button>

                    <button
                      type="button"
                      onClick={function () {
                        page.setClassDrawFilter("withDraw");
                      }}
                      className={getFilterButtonClass(
                        page.classDrawFilter === "withDraw",
                      )}
                    >
                      יש הגרלה
                    </button>

                    <button
                      type="button"
                      onClick={function () {
                        page.setClassDrawFilter("withoutDraw");
                      }}
                      className={getFilterButtonClass(
                        page.classDrawFilter === "withoutDraw",
                      )}
                    >
                      אין הגרלה
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <SecretaryClassesOverviewTable
              items={page.visibleClasses}
              loading={page.loadingClasses}
              getPredictionForClass={page.getPredictionForClass}
              onOpenClassEntries={page.openClassEntries}
              onOpenGroupEntries={page.openGroupEntries}
              getEntriesCountForClass={page.getEntriesCountForClass}
              getEntriesCountForGroup={page.getEntriesCountForGroup}
              getClassStatus={page.getClassStatus}
              onEditClass={page.openEditClassModal}
              onDeleteClass={page.handleDeleteClass}
              showScheduleColumns={page.showScheduleColumns}
              scheduleViewMode={page.scheduleViewMode}
              onScheduleViewModeChange={page.setScheduleViewMode}
              getScheduleForClass={page.getScheduleForClass}
              activeView={page.activeView}
              isReiningField={page.isReiningField}
              getPlannedVsActualForClass={page.getPlannedVsActualForClass}
            />
          </>
        ) : (
          <SecretaryClassEntriesTable
            items={page.selectedEntries}
            summary={page.entriesSummary}
            loading={page.loadingEntries}
            searchText={page.searchText}
            paymentFilter={page.paymentFilter}
            canEditDrawOrder={page.viewMode === "group"}
            canEditEntry={page.viewMode === "class"}
            hasDrawOrder={page.selectedGroupHasDrawOrder}
            drawOrderEditMode={page.drawOrderEditMode}
            savingDrawOrder={page.savingDrawOrder}
            drawOrderError={page.drawOrderError}
            minimumGap={page.minimumGap}
            drawOrderWarnings={page.drawOrderWarnings}
            drawOrderSummaryMessage={page.drawOrderSummaryMessage}
            generatingDrawPreview={page.generatingDrawPreview}
            onMinimumGapChange={page.setMinimumGap}
            onSearchTextChange={page.setSearchText}
            onPaymentFilterChange={page.setPaymentFilter}
            onStartDrawOrderEdit={page.startDrawOrderEditMode}
            onCancelDrawOrderEdit={page.cancelDrawOrderEditMode}
            onMoveDrawOrderEntry={page.moveDrawOrderEntry}
            onMoveDrawOrderEntryToEntry={page.moveDrawOrderEntryToEntry}
            onUpdateDraftDrawOrder={page.updateDraftDrawOrder}
            onGenerateSmartDrawOrderPreview={page.generateSmartDrawOrderPreview}
            onSaveDrawOrder={page.saveDrawOrder}
            onClearDrawOrder={page.clearDrawOrder}
            onDeleteEntry={page.handleDeleteEntry}
          />
        )}
      </div>

      <ClassInCompetitionModal
        isOpen={page.classModalOpen}
        onClose={page.closeClassModal}
        onSubmit={page.handleSubmitClass}
        onShowToast={page.showToast}
        initialValue={page.editClassItem}
        defaultJudgeIds={page.selectedCompetitionJudgeIds}
        classTypes={page.classTypes}
        judges={page.judges}
        prizeTypes={page.prizeTypes}
        patterns={page.patterns}
        arenas={page.arenas}
        fieldName={page.selectedFieldName}
        isReiningField={page.isReiningField}
        competitionStartDate={page.competitionStartDate}
        competitionEndDate={page.competitionEndDate}
        error={page.classModalError}
        saving={page.savingClass}
      />

      <ToastMessage
        isOpen={page.toast.isOpen}
        type={page.toast.type}
        message={page.toast.message}
        onClose={page.closeToast}
      />
    </CompetitionWorkspaceLayout>
  );
}