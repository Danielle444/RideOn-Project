import { Check, FileText, ExternalLink, Search, X } from "lucide-react";
import CompetitionWorkspaceLayout from "../../components/secretary/competition-workspace/CompetitionWorkspaceLayout";
import { useActiveRole } from "../../context/ActiveRoleContext";
import ConfirmDialog from "../../components/superuser/ConfirmDialog";
import ToastMessage from "../../components/common/ToastMessage";
import HealthCertificateStatusTabs from "../../components/secretary/health-certificates/HealthCertificateStatusTabs";
import HealthCertificateRejectModal from "../../components/secretary/health-certificates/HealthCertificateRejectModal";
import useCompetitionHealthCertificatesPage from "../../hooks/secretary/useCompetitionHealthCertificatesPage";

export default function CompetitionHealthCertificatesPage() {
  // Same shape as the sibling secretary pages (CompetitionShavingsPage): the
  // role comes from the context here, at page level, and is handed down as a
  // plain ranchId prop. The import was already present but never called, which
  // is what made the page throw on load.
  const activeRoleContext = useActiveRole();
  const activeRole = activeRoleContext.activeRole;

  return (
    <CompetitionWorkspaceLayout activeItemKey="health-certificates">
      {function (layout) {
        return (
          <HealthCertificatesContent
            competitionId={layout.competitionId}
            ranchId={activeRole ? activeRole.ranchId : null}
          />
        );
      }}
    </CompetitionWorkspaceLayout>
  );
}

// One empty-state message per tab, distinct from the "no horses at all"
// message below - a tab can legitimately be empty while the competition has
// participating horses (e.g. everyone in it has already been approved).
var TAB_EMPTY_MESSAGES = {
  pendingReview: "אין תעודות בריאות הממתינות לבדיקה כרגע.",
  notUploaded: "כל הסוסים המשתתפים העלו תעודת בריאות.",
  rejected: "אין תעודות בריאות שנדחו.",
  approved: "עדיין לא אושרו תעודות בריאות בתחרות זו.",
};

function getTabEmptyMessage(tabKey) {
  return TAB_EMPTY_MESSAGES[tabKey] || "";
}

function getStatusLabel(status) {
  if (status === "Approved")
    return {
      label: "מאושר",
      color: "text-green-600 bg-green-50 border-green-200",
    };
  if (status === "Pending")
    return {
      label: "ממתין לאישור",
      color: "text-amber-600 bg-amber-50 border-amber-200",
    };
  if (status === "Rejected")
    return {
      label: "נדחה",
      color: "text-red-600 bg-red-50 border-red-200",
    };
  return {
    label: "לא הועלה",
    color: "text-[#8A7268] bg-[#F5F0ED] border-[#E6DCD5]",
  };
}

function HealthCertificatesContent({ competitionId, ranchId }) {
  const page = useCompetitionHealthCertificatesPage({
    competitionId: competitionId,
    ranchId: ranchId,
  });

  const certificates = page.certificates;
  const loading = page.loading;
  const loadError = page.loadError;

  const noResultsInTab =
    !loading &&
    !loadError &&
    certificates.length > 0 &&
    page.visibleCertificates.length === 0;

  return (
    <>
      <ToastMessage
        isOpen={page.toast.isOpen}
        type={page.toast.type}
        message={page.toast.message}
        onClose={page.closeToast}
      />

      <div className="mx-auto max-w-[1450px] space-y-6">
        <div className="rounded-[28px] border border-[#E6DCD5] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#EFE5DF] px-8 py-7">
            <h1 className="text-[2rem] font-bold text-[#3F312B]">
              תעודות בריאות
            </h1>
            <p className="mt-1 text-sm text-[#8A7268]">
              תעודות הבריאות של הסוסים בתחרות — העלאה על ידי אדמין, אישור על ידי
              מזכירה
            </p>
          </div>

          {!loading && !loadError && certificates.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EFE5DF] px-8 py-5">
              <HealthCertificateStatusTabs
                tabs={page.tabs}
                activeTab={page.activeTab}
                onChange={page.setActiveTab}
              />

              <div className="relative">
                <input
                  type="text"
                  value={page.searchText}
                  onChange={function (event) {
                    page.setSearchText(event.target.value);
                  }}
                  placeholder="חיפוש לפי שם סוס או שם אורווה"
                  className="h-11 w-[300px] rounded-xl border border-[#D7CCC8] bg-white pr-11 pl-4 text-right text-[#3E2723] placeholder-[#BCAAA4] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                />
                <Search
                  size={17}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B6352]"
                />
              </div>
            </div>
          )}

          <div className="px-6 py-6">
            {loading && (
              <p className="text-center text-[#8A7268] py-10">טוען תעודות...</p>
            )}

            {!loading && loadError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                {page.LOAD_ERROR_MESSAGE}
              </div>
            )}

            {!loading && !loadError && certificates.length === 0 && (
              <div className="text-center py-16">
                <p className="text-[#8A7268] text-sm">
                  אין סוסים רשומים לתחרות זו
                </p>
              </div>
            )}

            {noResultsInTab && (
              <div className="text-center py-16">
                <p className="text-[#8A7268] text-sm">
                  {page.hasActiveSearch
                    ? "לא נמצאו תעודות בריאות התואמות את החיפוש."
                    : getTabEmptyMessage(page.activeTab)}
                </p>
              </div>
            )}

            {!loading && !loadError && page.visibleCertificates.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-right">
                  <thead>
                    <tr className="bg-[#FAF7F5] border-b border-[#E8DDD6] text-[#6A5248] text-sm">
                      <th className="px-5 py-4 font-bold">שם סוס</th>
                      <th className="px-5 py-4 font-bold">שם אורווה</th>
                      <th className="px-5 py-4 font-bold">תאריך העלאה</th>
                      <th className="px-5 py-4 font-bold">סטטוס</th>
                      <th className="px-5 py-4 font-bold">קובץ</th>
                      <th className="px-5 py-4 font-bold text-center">
                        פעולות
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.visibleCertificates.map(function (cert, index) {
                      const key = `${cert.horseId}-${competitionId}`;
                      const isLoading = page.actionLoadingKey === key;
                      const status = getStatusLabel(cert.hcApprovalStatus);

                      return (
                        <tr
                          key={key}
                          className={
                            "border-b border-[#F1E8E3] text-[#3F312B] transition-colors hover:bg-[#FCFAF8] " +
                            (index % 2 === 0 ? "bg-white" : "bg-[#FFFEFD]")
                          }
                        >
                          <td className="px-5 py-4 font-medium">
                            {cert.horseName}
                          </td>
                          <td className="px-5 py-4 text-[#8A7268]">
                            {cert.barnName || "—"}
                          </td>
                          <td className="px-5 py-4 text-sm">
                            {cert.hcUploadDate
                              ? new Date(cert.hcUploadDate).toLocaleDateString(
                                  "he-IL",
                                )
                              : "—"}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`text-xs font-semibold px-3 py-1 rounded-full border ${status.color}`}
                            >
                              {status.label}
                            </span>

                            {cert.hcApprovalStatus === "Rejected" && (
                              <div className="mt-1.5 max-w-[220px] text-xs leading-5 text-red-700">
                                {cert.hcRejectionReason}
                                {cert.hcRejectionDate && (
                                  <div className="text-[#8A7268]">
                                    {new Date(
                                      cert.hcRejectionDate,
                                    ).toLocaleDateString("he-IL")}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {cert.hcPath ? (
                              <a
                                href={cert.hcPath}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 text-[#8B6352] hover:text-[#5D4037] text-sm font-medium transition-colors"
                              >
                                <FileText size={15} />
                                <span>פתח PDF</span>
                                <ExternalLink size={12} />
                              </a>
                            ) : (
                              <span className="text-sm text-[#8A7268]">
                                לא הועלה
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            {cert.hcApprovalStatus === "Pending" &&
                              cert.hcPath && (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={function () {
                                      page.handleApproveClick(cert);
                                    }}
                                    disabled={isLoading}
                                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[10px] bg-[#4CAF50] hover:bg-[#43A047] text-white text-sm font-semibold transition-colors disabled:opacity-60"
                                  >
                                    <Check size={14} />
                                    {isLoading ? "מאשר..." : "אשר"}
                                  </button>

                                  <button
                                    onClick={function () {
                                      page.openRejectModal(cert);
                                    }}
                                    disabled={isLoading}
                                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[10px] bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                                  >
                                    <X size={14} />
                                    דחה
                                  </button>
                                </div>
                              )}
                            {cert.hcApprovalStatus === "Approved" && (
                              <span className="text-sm text-green-600 font-medium">
                                אושר
                              </span>
                            )}
                            {cert.hcApprovalStatus === "Rejected" && (
                              <span className="text-sm text-red-600 font-medium">
                                ממתין להעלאה מחדש
                              </span>
                            )}
                            {!cert.hcPath && (
                              <span className="text-sm text-[#8A7268]">
                                ממתין להעלאה
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={page.confirmDialog.isOpen}
        title={page.confirmDialog.title}
        message={page.confirmDialog.message}
        onCancel={page.closeConfirmDialog}
        onConfirm={page.confirmDialog.onConfirm}
      />

      <HealthCertificateRejectModal
        isOpen={page.rejectModal.isOpen}
        horseName={page.rejectModal.cert ? page.rejectModal.cert.horseName : ""}
        reason={page.rejectModal.reason}
        error={page.rejectModal.error}
        isSaving={page.isRejectSubmitting}
        onReasonChange={page.setRejectReason}
        onClose={page.closeRejectModal}
        onSubmit={page.submitReject}
      />
    </>
  );
}
