import { useEffect, useMemo, useState } from "react";
import { Search, Check, X, Pencil, Trash2 } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout";
import secretaryGeneralMenu from "../../components/secretary/secretaryGeneralMenu";
import ToastMessage from "../../components/common/ToastMessage";
import { useUser } from "../../context/UserContext";
import { useActiveRole } from "../../context/ActiveRoleContext";
import { getSecretaryDisplayName } from "../../utils/secretaryDisplay.utils";
import {
  getWorkersByRanch,
  getWorkerById,
  updateWorker,
  updateWorkerRoleStatus,
  removeWorkerAssignment,
} from "../../services/workerService";

export default function WorkersManagementPage() {
  const userContext = useUser();
  const activeRoleContext = useActiveRole();

  const user = userContext.user;
  const activeRole = activeRoleContext.activeRole;

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingKey, setActionLoadingKey] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [editForm, setEditForm] = useState({
    personId: 0,
    ranchId: 0,
    firstName: "",
    lastName: "",
    gender: "",
    cellPhone: "",
    email: "",
  });

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const [toast, setToast] = useState({
    isOpen: false,
    type: "success",
    message: "",
  });

  const userName = getSecretaryDisplayName(user);
  const subtitle =
    [activeRole?.roleName, activeRole?.ranchName].filter(Boolean).join(" · ") ||
    "לא נבחר תפקיד וחווה";

  const currentRanchId = useMemo(
    function () {
      return activeRole?.ranchId || null;
    },
    [activeRole],
  );

  useEffect(
    function () {
      if (!currentRanchId) {
        return;
      }

      loadWorkers();
    },
    [currentRanchId, statusFilter, search],
  );

  async function loadWorkers() {
    if (!currentRanchId) {
      return;
    }

    try {
      setLoading(true);

      var response = await getWorkersByRanch({
        ranchId: currentRanchId,
        status: statusFilter || null,
        search: search || null,
      });

      setWorkers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setWorkers([]);
      showToast("error", getErrorMessage(error, "שגיאה בטעינת העובדים"));
    } finally {
      setLoading(false);
    }
  }

  function getErrorMessage(error, fallbackMessage) {
    return error?.response?.data || fallbackMessage;
  }

  function showToast(type, message) {
    setToast({
      isOpen: true,
      type: type,
      message: message,
    });
  }

  function closeToast() {
    setToast({
      isOpen: false,
      type: "success",
      message: "",
    });
  }

  function handleSearchClick() {
    setSearch(searchInput.trim());
  }

  function handleResetFilters() {
    setStatusFilter("");
    setSearchInput("");
    setSearch("");
  }

  function getWorkerRowKey(item) {
    return String(item.personId) + "-" + String(item.ranchId);
  }

  function getActionKey(item, actionName) {
    return getWorkerRowKey(item) + "-" + actionName;
  }

  function openConfirmDialog(title, message, onConfirm) {
    setConfirmDialog({
      isOpen: true,
      title: title,
      message: message,
      onConfirm: onConfirm,
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

  async function handleApprove(item) {
    var actionKey = getActionKey(item, "approve");

    try {
      setActionLoadingKey(actionKey);

      await updateWorkerRoleStatus({
        personId: item.personId,
        ranchId: item.ranchId,
        roleStatus: "Approved",
      });

      showToast("success", "שיוך העובד אושר בהצלחה");
      await loadWorkers();
    } catch (error) {
      console.error(error);
      showToast("error", getErrorMessage(error, "שגיאה באישור העובד"));
    } finally {
      setActionLoadingKey("");
    }
  }

  async function handleReject(item) {
    var actionKey = getActionKey(item, "reject");

    try {
      setActionLoadingKey(actionKey);

      await updateWorkerRoleStatus({
        personId: item.personId,
        ranchId: item.ranchId,
        roleStatus: "Rejected",
      });

      showToast("success", "שיוך העובד נדחה בהצלחה");
      await loadWorkers();
    } catch (error) {
      console.error(error);
      showToast("error", getErrorMessage(error, "שגיאה בדחיית העובד"));
    } finally {
      setActionLoadingKey("");
    }
  }

  function handleUndoApprove(item) {
    openConfirmDialog(
      "ביטול אישור עובד",
      "האם את בטוחה שברצונך לבטל את אישור השיוך של העובד לחווה?",
      async function () {
        closeConfirmDialog();
        await handleReject(item);
      },
    );
  }

  function handleApproveRejected(item) {
    openConfirmDialog(
      "אישור עובד שנדחה",
      "האם את בטוחה שברצונך לאשר מחדש את השיוך של העובד לחווה?",
      async function () {
        closeConfirmDialog();
        await handleApprove(item);
      },
    );
  }

  function handleRemoveAssignment(item) {
    openConfirmDialog(
      "הסרת שיוך עובד",
      "האם את בטוחה שברצונך להסיר את השיוך של העובד מהחווה הפעילה? הפעולה לא תמחק את האדם מהמערכת.",
      async function () {
        var actionKey = getActionKey(item, "remove");

        try {
          closeConfirmDialog();
          setActionLoadingKey(actionKey);

          await removeWorkerAssignment({
            personId: item.personId,
            ranchId: item.ranchId,
          });

          showToast("success", "שיוך העובד הוסר בהצלחה");
          await loadWorkers();
        } catch (error) {
          console.error(error);
          showToast("error", getErrorMessage(error, "שגיאה בהסרת השיוך"));
        } finally {
          setActionLoadingKey("");
        }
      },
    );
  }

  async function handleOpenEdit(item) {
    try {
      var response = await getWorkerById(item.personId, item.ranchId);
      var worker = response.data;

      setEditingWorker(worker);
      setEditForm({
        personId: worker.personId,
        ranchId: worker.ranchId,
        firstName: worker.firstName || "",
        lastName: worker.lastName || "",
        gender: worker.gender || "",
        cellPhone: worker.cellPhone || "",
        email: worker.email || "",
      });
      setEditModalOpen(true);
    } catch (error) {
      console.error(error);
      showToast("error", getErrorMessage(error, "שגיאה בטעינת פרטי העובד"));
    }
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setEditingWorker(null);
    setEditForm({
      personId: 0,
      ranchId: 0,
      firstName: "",
      lastName: "",
      gender: "",
      cellPhone: "",
      email: "",
    });
  }

  function handleEditFieldChange(fieldName, value) {
    setEditForm(function (prev) {
      return {
        ...prev,
        [fieldName]: value,
      };
    });
  }

  async function handleSaveEdit() {
    try {
      setEditSaving(true);

      await updateWorker(editForm.personId, {
        personId: editForm.personId,
        ranchId: editForm.ranchId,
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        gender: editForm.gender.trim() || null,
        cellPhone: editForm.cellPhone.trim() || null,
        email: editForm.email.trim() || null,
      });

      showToast("success", "פרטי העובד עודכנו בהצלחה");
      closeEditModal();
      await loadWorkers();
    } catch (error) {
      console.error(error);
      showToast("error", getErrorMessage(error, "שגיאה בעדכון פרטי העובד"));
    } finally {
      setEditSaving(false);
    }
  }

  function renderStatusPill(roleStatus) {
    if (roleStatus === "Approved") {
      return (
        <span className="inline-flex rounded-full border border-[#CFE6D8] bg-[#F7FBF8] px-3 py-1 text-sm font-semibold text-[#2F6F4F]">
          מאושר
        </span>
      );
    }

    if (roleStatus === "Pending") {
      return (
        <span className="inline-flex rounded-full border border-[#E9D8B5] bg-[#FFF9ED] px-3 py-1 text-sm font-semibold text-[#9A6A00]">
          ממתין
        </span>
      );
    }

    if (roleStatus === "Rejected") {
      return (
        <span className="inline-flex rounded-full border border-[#E1D6D0] bg-[#FAF7F5] px-3 py-1 text-sm font-semibold text-[#8A7268]">
          נדחה
        </span>
      );
    }

    return (
      <span className="inline-flex rounded-full border border-[#E1D6D0] bg-[#FAF7F5] px-3 py-1 text-sm font-semibold text-[#8A7268]">
        {roleStatus || "לא ידוע"}
      </span>
    );
  }

  function renderActionButton(config) {
    return (
      <button
        type="button"
        disabled={config.disabled}
        onClick={config.onClick}
        className={
          "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60 " +
          config.className
        }
      >
        {config.icon}
        {config.label}
      </button>
    );
  }

  if (!activeRole) {
    return null;
  }

  return (
    <AppLayout
      userName={userName}
      subtitle={subtitle}
      menuItems={secretaryGeneralMenu}
      activeItemKey="workers-management"
    >
      <div className="rounded-[28px] border border-[#E6DCD5] bg-white shadow-sm overflow-hidden">
        <div className="px-8 pt-8 pb-6 border-b border-[#EFE5DF]">
          <h1 className="text-[2rem] font-bold text-[#3F312B] text-center">
            ניהול עובדים
          </h1>

          <div className="mt-8 flex flex-wrap items-center justify-start gap-3 rounded-2xl bg-[#FBF8F6] border border-[#ECE2DC] px-4 py-4">
            <select
              value={statusFilter}
              onChange={function (e) {
                setStatusFilter(e.target.value);
              }}
              className="h-11 min-w-[160px] rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
            >
              <option value="">כל הסטטוסים</option>
              <option value="Pending">ממתינים</option>
              <option value="Approved">מאושרים</option>
              <option value="Rejected">נדחו</option>
            </select>

            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={function (e) {
                  setSearchInput(e.target.value);
                }}
                onKeyDown={function (e) {
                  if (e.key === "Enter") {
                    handleSearchClick();
                  }
                }}
                placeholder="חיפוש לפי שם, ת״ז, אימייל, טלפון או שם משתמש"
                className="w-[360px] h-11 rounded-xl border border-[#D8CBC3] bg-white pr-11 pl-4 text-[#3F312B] placeholder:text-[#A08D84] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
              />
              <Search
                size={17}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E786E]"
              />
            </div>

            <button
              type="button"
              onClick={handleSearchClick}
              className="h-11 px-5 rounded-xl bg-[#8B6352] text-white font-semibold shadow-sm hover:bg-[#7A5547] transition-colors"
            >
              חפש
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="h-11 px-5 rounded-xl border border-[#D8CBC3] bg-white text-[#5D4037] font-semibold shadow-sm hover:bg-[#F8F5F2] transition-colors"
            >
              איפוס
            </button>
          </div>
        </div>

        <div className="px-6 pb-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-right">
              <thead>
                <tr className="bg-[#FAF7F5] border-b border-[#E8DDD6] text-[#6A5248] text-sm">
                  <th className="px-5 py-4 font-bold">שם</th>
                  <th className="px-5 py-4 font-bold">ת"ז</th>
                  <th className="px-5 py-4 font-bold">אימייל</th>
                  <th className="px-5 py-4 font-bold">טלפון</th>
                  <th className="px-5 py-4 font-bold">שם משתמש</th>
                  <th className="px-5 py-4 font-bold">סטטוס</th>
                  <th className="px-5 py-4 font-bold text-center">פעולות</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-[#8A7268]"
                    >
                      טוענת עובדים...
                    </td>
                  </tr>
                ) : null}

                {!loading && workers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-[#8A7268]"
                    >
                      לא נמצאו עובדים להצגה
                    </td>
                  </tr>
                ) : null}

                {!loading &&
                  workers.map(function (item, index) {
                    var currentStatus = item.roleStatus;
                    var editLoading = actionLoadingKey === getActionKey(item, "edit");
                    var approveLoading =
                      actionLoadingKey === getActionKey(item, "approve");
                    var rejectLoading =
                      actionLoadingKey === getActionKey(item, "reject");
                    var removeLoading =
                      actionLoadingKey === getActionKey(item, "remove");

                    return (
                      <tr
                        key={getWorkerRowKey(item)}
                        className={
                          "border-b border-[#F1E8E3] text-[#3F312B] transition-colors hover:bg-[#FCFAF8] " +
                          (index % 2 === 0 ? "bg-white" : "bg-[#FFFEFD]")
                        }
                      >
                        <td className="px-5 py-5 font-medium">{item.fullName}</td>
                        <td className="px-5 py-5">{item.nationalId}</td>
                        <td className="px-5 py-5">{item.email || "-"}</td>
                        <td className="px-5 py-5">{item.cellPhone || "-"}</td>
                        <td className="px-5 py-5">{item.username || "-"}</td>
                        <td className="px-5 py-5">
                          {renderStatusPill(currentStatus)}
                        </td>
                        <td className="px-5 py-5">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {renderActionButton({
                              label: "עריכה",
                              icon: <Pencil size={15} />,
                              disabled: editLoading,
                              onClick: function () {
                                handleOpenEdit(item);
                              },
                              className:
                                "border border-[#D8CBC3] bg-white text-[#5D4037] hover:bg-[#F8F5F2]",
                            })}

                            {currentStatus === "Pending"
                              ? renderActionButton({
                                  label: "אישור",
                                  icon: <Check size={15} />,
                                  disabled: approveLoading,
                                  onClick: function () {
                                    handleApprove(item);
                                  },
                                  className:
                                    "bg-[#E8F3EC] text-[#2F6F4F] hover:bg-[#DCEEE3]",
                                })
                              : null}

                            {currentStatus === "Pending"
                              ? renderActionButton({
                                  label: "דחייה",
                                  icon: <X size={15} />,
                                  disabled: rejectLoading,
                                  onClick: function () {
                                    handleReject(item);
                                  },
                                  className:
                                    "bg-[#FBEAEA] text-[#A14A4A] hover:bg-[#F5DEDE]",
                                })
                              : null}

                            {currentStatus === "Approved"
                              ? renderActionButton({
                                  label: "ביטול אישור",
                                  icon: <X size={15} />,
                                  disabled: rejectLoading,
                                  onClick: function () {
                                    handleUndoApprove(item);
                                  },
                                  className:
                                    "bg-[#FBEAEA] text-[#A14A4A] hover:bg-[#F5DEDE]",
                                })
                              : null}

                            {currentStatus === "Rejected"
                              ? renderActionButton({
                                  label: "אישור מחדש",
                                  icon: <Check size={15} />,
                                  disabled: approveLoading,
                                  onClick: function () {
                                    handleApproveRejected(item);
                                  },
                                  className:
                                    "bg-[#E8F3EC] text-[#2F6F4F] hover:bg-[#DCEEE3]",
                                })
                              : null}

                            {renderActionButton({
                              label: "הסרת שיוך",
                              icon: <Trash2 size={15} />,
                              disabled: removeLoading,
                              onClick: function () {
                                handleRemoveAssignment(item);
                              },
                              className:
                                "bg-[#F6F1EE] text-[#8B6352] hover:bg-[#EEE5E0]",
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-[760px] rounded-[28px] border border-[#E6DCD5] bg-white shadow-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-[#EFE5DF] flex items-center justify-between gap-4">
              <div className="text-right">
                <h3 className="text-xl font-bold text-[#3F312B]">
                  עריכת פרטי עובד
                </h3>
                <p className="mt-1 text-sm text-[#8A7268]">
                  עדכון פרטי העובד המשויך לחווה הפעילה
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#F8F5F2] text-[#7B5A4D]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[#E7DCD5] bg-white px-4 py-3">
                  <label className="text-sm font-semibold text-[#7B5A4D]">
                    שם פרטי
                  </label>
                  <input
                    value={editForm.firstName}
                    onChange={function (e) {
                      handleEditFieldChange("firstName", e.target.value);
                    }}
                    className="mt-2 h-10 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-right text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                  />
                </div>

                <div className="rounded-2xl border border-[#E7DCD5] bg-white px-4 py-3">
                  <label className="text-sm font-semibold text-[#7B5A4D]">
                    שם משפחה
                  </label>
                  <input
                    value={editForm.lastName}
                    onChange={function (e) {
                      handleEditFieldChange("lastName", e.target.value);
                    }}
                    className="mt-2 h-10 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-right text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                  />
                </div>

                <div className="rounded-2xl border border-[#E7DCD5] bg-white px-4 py-3">
                  <label className="text-sm font-semibold text-[#7B5A4D]">
                    טלפון
                  </label>
                  <input
                    value={editForm.cellPhone}
                    onChange={function (e) {
                      handleEditFieldChange("cellPhone", e.target.value);
                    }}
                    className="mt-2 h-10 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-right text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                  />
                </div>

                <div className="rounded-2xl border border-[#E7DCD5] bg-white px-4 py-3">
                  <label className="text-sm font-semibold text-[#7B5A4D]">
                    אימייל
                  </label>
                  <input
                    value={editForm.email}
                    onChange={function (e) {
                      handleEditFieldChange("email", e.target.value);
                    }}
                    className="mt-2 h-10 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-right text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                  />
                </div>

                <div className="rounded-2xl border border-[#E7DCD5] bg-white px-4 py-3">
                  <label className="text-sm font-semibold text-[#7B5A4D]">
                    מגדר
                  </label>
                  <input
                    value={editForm.gender}
                    onChange={function (e) {
                      handleEditFieldChange("gender", e.target.value);
                    }}
                    className="mt-2 h-10 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-right text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                  />
                </div>

                <div className="rounded-2xl border border-[#E7DCD5] bg-[#F8F5F2] px-4 py-3">
                  <label className="text-sm font-semibold text-[#7B5A4D]">
                    שם משתמש
                  </label>
                  <input
                    value={editingWorker?.username || ""}
                    disabled={true}
                    className="mt-2 h-10 w-full rounded-xl border border-[#E1D6D0] bg-[#F3ECE8] px-4 text-right text-[#8A7268] shadow-sm cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap justify-start gap-3">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={editSaving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#7B5A4D] px-5 py-2.5 text-white font-semibold shadow-sm hover:bg-[#6B4D42] disabled:opacity-60"
                >
                  {editSaving ? "שומרת..." : "שמירת שינויים"}
                </button>

                <button
                  type="button"
                  onClick={closeEditModal}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#D8CBC3] bg-white px-4 py-2.5 text-[#5D4037] font-semibold hover:bg-[#F8F5F2]"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDialog.isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-[520px] rounded-[28px] border border-[#E6DCD5] bg-white shadow-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-[#EFE5DF]">
              <h3 className="text-xl font-bold text-[#3F312B] text-right">
                {confirmDialog.title}
              </h3>
            </div>

            <div className="px-6 py-6">
              <p className="text-right text-[#6D4C41] leading-7">
                {confirmDialog.message}
              </p>

              <div className="mt-6 flex flex-wrap justify-start gap-3">
                <button
                  type="button"
                  onClick={function () {
                    if (confirmDialog.onConfirm) {
                      confirmDialog.onConfirm();
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#7B5A4D] px-5 py-2.5 text-white font-semibold shadow-sm hover:bg-[#6B4D42]"
                >
                  אישור
                </button>

                <button
                  type="button"
                  onClick={closeConfirmDialog}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#D8CBC3] bg-white px-4 py-2.5 text-[#5D4037] font-semibold hover:bg-[#F8F5F2]"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ToastMessage
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={closeToast}
      />
    </AppLayout>
  );
}