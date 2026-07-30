import { useEffect, useState } from "react";
import { Check, FileText, ExternalLink } from "lucide-react";
import CompetitionWorkspaceLayout from "../../components/secretary/competition-workspace/CompetitionWorkspaceLayout";
import { useActiveRole } from "../../context/ActiveRoleContext";
import {
  getHealthCertificates,
  approveHealthCertificate,
} from "../../services/healthCertificateService";
import ConfirmDialog from "../../components/superuser/ConfirmDialog";
import ToastMessage from "../../components/common/ToastMessage";

// Both failures are reported with a fixed Hebrew sentence. Nothing from the
// response body reaches the screen: the endpoint can surface database text,
// Supabase URLs and English SP messages, none of which belong in front of a
// secretary.
const LOAD_ERROR_MESSAGE = "אירעה שגיאה בטעינת תעודות הבריאות. יש לנסות שוב.";
const APPROVE_ERROR_MESSAGE = "אירעה שגיאה באישור תעודת הבריאות";

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
  return {
    label: "לא הועלה",
    color: "text-[#8A7268] bg-[#F5F0ED] border-[#E6DCD5]",
  };
}

function HealthCertificatesContent({ competitionId, ranchId }) {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [actionLoadingKey, setActionLoadingKey] = useState(null);
  const [toast, setToast] = useState({
    isOpen: false,
    type: "success",
    message: "",
  });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  useEffect(
    function () {
      if (!competitionId) return;
      if (!ranchId) return;
      loadCertificates();
    },
    [competitionId, ranchId],
  );

  function showToast(type, message) {
    setToast({ isOpen: true, type: type, message: message });
  }

  function closeToast() {
    setToast(function (prev) {
      return { ...prev, isOpen: false };
    });
  }

  async function loadCertificates() {
    try {
      setLoading(true);
      setLoadError(false);
      const response = await getHealthCertificates(competitionId, ranchId);
      setCertificates(response.data?.data || []);
    } catch {
      // A failed request is NOT an empty competition. Without this the page
      // rendered "אין סוסים רשומים לתחרות זו" for a 403, a 500 or a dropped
      // connection alike.
      setCertificates([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  function handleApproveClick(cert) {
    setConfirmDialog({
      isOpen: true,
      title: "אישור תעודת בריאות",
      message: `האם לאשר את תעודת הבריאות של ${cert.horseName}?`,
      onConfirm: async function () {
        const key = `${cert.horseId}-${competitionId}`;
        try {
          setActionLoadingKey(key);
          await approveHealthCertificate(cert.horseId, competitionId, ranchId);
          closeConfirmDialog();
          await loadCertificates();
        } catch {
          showToast("error", APPROVE_ERROR_MESSAGE);
        } finally {
          setActionLoadingKey(null);
        }
      },
    });
  }

  function closeConfirmDialog() {
    setConfirmDialog({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: null,
    });
  }

  return (
    <>
      <ToastMessage
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={closeToast}
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

          <div className="px-6 py-6">
            {loading && (
              <p className="text-center text-[#8A7268] py-10">טוען תעודות...</p>
            )}

            {!loading && loadError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                {LOAD_ERROR_MESSAGE}
              </div>
            )}

            {!loading && !loadError && certificates.length === 0 && (
              <div className="text-center py-16">
                <p className="text-[#8A7268] text-sm">
                  אין סוסים רשומים לתחרות זו
                </p>
              </div>
            )}

            {!loading && !loadError && certificates.length > 0 && (
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
                    {certificates.map(function (cert, index) {
                      const key = `${cert.horseId}-${competitionId}`;
                      const isLoading = actionLoadingKey === key;
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
                                <button
                                  onClick={function () {
                                    handleApproveClick(cert);
                                  }}
                                  disabled={isLoading}
                                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[10px] bg-[#4CAF50] hover:bg-[#43A047] text-white text-sm font-semibold transition-colors disabled:opacity-60"
                                >
                                  <Check size={14} />
                                  {isLoading ? "מאשר..." : "אשר"}
                                </button>
                              )}
                            {cert.hcApprovalStatus === "Approved" && (
                              <span className="text-sm text-green-600 font-medium">
                                אושר
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
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onCancel={closeConfirmDialog}
        onConfirm={confirmDialog.onConfirm}
      />
    </>
  );
}
