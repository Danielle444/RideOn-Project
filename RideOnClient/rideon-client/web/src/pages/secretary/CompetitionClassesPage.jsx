import { ArrowRight, RefreshCw } from "lucide-react";
import { useParams } from "react-router-dom";

import CompetitionWorkspaceLayout from "../../components/secretary/competition-workspace/CompetitionWorkspaceLayout";
import TableActionButton from "../../components/common/table/TableActionButton";
import SecretaryClassesOverviewTable from "../../components/secretary/classes/SecretaryClassesOverviewTable";
import SecretaryClassEntriesTable from "../../components/secretary/classes/SecretaryClassEntriesTable";
import SecretaryClassEntriesSummaryCards from "../../components/secretary/classes/SecretaryClassEntriesSummaryCards";
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
              <TableActionButton
                label="חזרה למקצים"
                icon={<ArrowRight size={15} />}
                onClick={page.backToClasses}
              />
            ) : null}

            <TableActionButton
              label="רענון"
              icon={<RefreshCw size={15} />}
              onClick={page.loadPageData}
              loading={page.loadingClasses || page.loadingEntries}
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

            <SecretaryClassEntriesSummaryCards
              summary={page.visibleClassesSummary}
              titlePrefix="כניסות ביום"
            />

            <SecretaryClassesOverviewTable
              items={page.visibleClasses}
              loading={page.loadingClasses}
              onOpenClassEntries={page.openClassEntries}
              onOpenGroupEntries={page.openGroupEntries}
              getEntriesCountForClass={page.getEntriesCountForClass}
              getEntriesCountForGroup={page.getEntriesCountForGroup}
            />
          </>
        ) : (
          <SecretaryClassEntriesTable
            items={page.selectedEntries}
            summary={page.entriesSummary}
            loading={page.loadingEntries}
            searchText={page.searchText}
            paymentFilter={page.paymentFilter}
            onSearchTextChange={page.setSearchText}
            onPaymentFilterChange={page.setPaymentFilter}
          />
        )}
      </div>
    </CompetitionWorkspaceLayout>
  );
}
