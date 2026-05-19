import { RefreshCw } from "lucide-react";
import { useParams } from "react-router-dom";

import CompetitionWorkspaceLayout from "../../components/secretary/competition-workspace/CompetitionWorkspaceLayout";
import TableActionButton from "../../components/common/table/TableActionButton";
import ChangeRequestsTabs from "../../components/secretary/change-tracking/ChangeRequestsTabs";
import ChangeRequestsSummaryCards from "../../components/secretary/change-tracking/ChangeRequestsSummaryCards";
import ChangeRequestsFilters from "../../components/secretary/change-tracking/ChangeRequestsFilters";
import ChangeRequestsTable from "../../components/secretary/change-tracking/ChangeRequestsTable";
import ChangeRequestDetailsModal from "../../components/secretary/change-tracking/ChangeRequestDetailsModal";
import useCompetitionChangeTrackingPage from "../../hooks/secretary/useCompetitionChangeTrackingPage";
import { useActiveRole } from "../../context/ActiveRoleContext";

export default function CompetitionChangeTrackingPage() {
  var params = useParams();
  var activeRoleContext = useActiveRole();

  var competitionId = Number(params.competitionId);
  var ranchId = activeRoleContext.activeRole?.ranchId || null;

  var page = useCompetitionChangeTrackingPage({
    competitionId: competitionId,
    ranchId: ranchId,
  });

  return (
    <CompetitionWorkspaceLayout activeItemKey="change-tracking">
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#3F312B]">מעקב שינויים</h1>

            <p className="text-sm text-[#8D6E63]">
              ניהול בקשות שינוי וביטול עבור התחרות הפעילה
            </p>

            <p className="mt-1 text-xs font-semibold text-[#8B6352]">
              בקשות ממתינות בכל תחרויות החווה:{" "}
              {page.loadingCount ? "טוען..." : page.pendingCount}
            </p>
          </div>

          <TableActionButton
            label="רענון"
            icon={<RefreshCw size={15} />}
            onClick={page.loadPageData}
            loading={page.loading}
          />
        </div>

        {page.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {page.error}
          </div>
        ) : null}

        <ChangeRequestsTabs
          tabs={page.tabs}
          activeStatus={page.activeStatus}
          onChange={page.changeStatus}
        />

        <ChangeRequestsSummaryCards summary={page.summary} />

        <ChangeRequestsFilters
          searchText={page.searchText}
          sourceFilter={page.sourceFilter}
          typeFilter={page.typeFilter}
          onSearchTextChange={page.setSearchText}
          onSourceFilterChange={page.setSourceFilter}
          onTypeFilterChange={page.setTypeFilter}
          onClear={page.clearFilters}
        />

        <ChangeRequestsTable
          items={page.visibleItems}
          loading={page.loading}
          activeStatus={page.activeStatus}
          onViewDetails={page.openRequestDetails}
        />

        <ChangeRequestDetailsModal
          item={page.selectedRequest}
          onClose={page.closeRequestDetails}
        />
      </div>
    </CompetitionWorkspaceLayout>
  );
}
