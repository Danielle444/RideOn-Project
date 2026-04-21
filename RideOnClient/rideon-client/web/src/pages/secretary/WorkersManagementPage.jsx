import { useEffect, useMemo, useState } from "react";
import SecretaryLayout from "../../components/secretary/SecretaryLayout";
import secretaryGeneralMenu from "../../components/secretary/secretaryGeneralMenu";
import ToastMessage from "../../components/common/ToastMessage";
import ConfirmDialog from "../../components/superuser/ConfirmDialog";
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
import WorkersFiltersBar from "../../components/secretary/workers/WorkersFiltersBar";
import WorkersTable from "../../components/secretary/workers/WorkersTable";
import EditWorkerModal from "../../components/secretary/workers/EditWorkerModal";

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

      const response = await getWorkersByRanch({
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
    const actionKey = getActionKey(item, "approve");

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
    const actionKey = getActionKey(item, "reject");

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
        const actionKey = getActionKey(item, "remove");

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
      const response = await getWorkerById(item.personId, item.ranchId);
      const worker = response.data;

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

  if (!activeRole) {
    return null;
  }

  return (
    <SecretaryLayout
      userName={userName}
      subtitle={subtitle}
      menuItems={secretaryGeneralMenu}
      activeItemKey="workers-management"
      notificationCount={0}
      notificationsOpen={false}
      notificationItems={[]}
    >
      <div className="rounded-[28px] border border-[#E6DCD5] bg-white shadow-sm overflow-hidden">
        <div className="px-8 pt-8 pb-6 border-b border-[#EFE5DF]">
          <h1 className="text-[2rem] font-bold text-[#3F312B] text-center">
            ניהול עובדים
          </h1>

          <WorkersFiltersBar
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            onSearch={handleSearchClick}
            onReset={handleResetFilters}
          />
        </div>

        <div className="px-6 pb-4">
          <WorkersTable
            workers={workers}
            loading={loading}
            actionLoadingKey={actionLoadingKey}
            getActionKey={getActionKey}
            onEdit={handleOpenEdit}
            onApprove={handleApprove}
            onReject={handleReject}
            onUndoApprove={handleUndoApprove}
            onApproveRejected={handleApproveRejected}
            onRemoveAssignment={handleRemoveAssignment}
          />
        </div>
      </div>

      <EditWorkerModal
        isOpen={editModalOpen}
        editingWorker={editingWorker}
        editForm={editForm}
        editSaving={editSaving}
        onClose={closeEditModal}
        onChangeField={handleEditFieldChange}
        onSave={handleSaveEdit}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onCancel={closeConfirmDialog}
        onConfirm={confirmDialog.onConfirm}
      />

      <ToastMessage
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={closeToast}
      />
    </SecretaryLayout>
  );
}