import { useEffect, useState } from "react";
import SuperUserLayout from "../../components/superuser/SuperUserLayout";
import RequestsTabs from "../../components/superuser/RequestsTabs";
import RequestsFiltersBar from "../../components/superuser/RequestsFiltersBar";
import RequestsTable from "../../components/superuser/RequestsTable";
import ConfirmDialog from "../../components/superuser/ConfirmDialog";
import {
  getRoleRequests,
  getRanchRequests,
  updateRoleRequestStatus,
  updateRanchRequestStatus,
} from "../../services/superUserService";

export default function UserRequestsPage() {
  const [activeTab, setActiveTab] = useState("ranch");
  const [status, setStatus] = useState("Pending");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingKey, setActionLoadingKey] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const pageTitle = "ניהול בקשות משתמשים וחוות";

  async function loadData() {
    try {
      setLoading(true);

      if (activeTab === "ranch") {
        const response = await getRanchRequests(status, search);
        setRows(response.data || []);
      } else {
        const roleId = activeTab === "admin" ? 2 : 3;
        const response = await getRoleRequests(roleId, status, search);
        setRows(response.data || []);
      }
    } catch (err) {
      console.error("Failed loading requests:", err);
      alert(err.response?.data || "שגיאה בטעינת הנתונים");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [activeTab, status, search]);

  function handleSearchClick() {
    setSearch(searchInput.trim());
  }

  function handleTabChange(tabKey) {
    setActiveTab(tabKey);
    setStatus("Pending");
    setSearch("");
    setSearchInput("");
    setRows([]);
  }

  function getRowKey(item) {
    if (activeTab === "ranch") {
      return `ranch-${item.requestId}`;
    }

    return `role-${item.personId}-${item.ranchId}-${item.roleId}`;
  }

  async function handleApprove(item) {
    const rowKey = getRowKey(item);

    try {
      setActionLoadingKey(rowKey);

      if (activeTab === "ranch") {
        await updateRanchRequestStatus({
          requestId: item.requestId,
          newStatus: "Approved",
        });
      } else {
        await updateRoleRequestStatus({
          personId: item.personId,
          ranchId: item.ranchId,
          roleId: item.roleId,
          roleStatus: "Approved",
        });
      }

      await loadData();
    } catch (err) {
      console.error("Approve failed:", err);
      alert(err.response?.data || "שגיאה באישור הבקשה");
    } finally {
      setActionLoadingKey("");
    }
  }

  async function handleReject(item) {
    const rowKey = getRowKey(item);

    try {
      setActionLoadingKey(rowKey);

      if (activeTab === "ranch") {
        await updateRanchRequestStatus({
          requestId: item.requestId,
          newStatus: "Rejected",
        });
      } else {
        await updateRoleRequestStatus({
          personId: item.personId,
          ranchId: item.ranchId,
          roleId: item.roleId,
          roleStatus: "Rejected",
        });
      }

      await loadData();
    } catch (err) {
      console.error("Reject failed:", err);
      alert(err.response?.data || "שגיאה בדחיית הבקשה");
    } finally {
      setActionLoadingKey("");
    }
  }

  function handleUndoApprove(item) {
    setConfirmDialog({
      isOpen: true,
      title: "ביטול אישור בקשה",
      message: "האם את בטוחה שברצונך לבטל את האישור של הבקשה?",
      onConfirm: async function () {
        const rowKey = getRowKey(item);

        try {
          setActionLoadingKey(rowKey);

          if (activeTab === "ranch") {
            await updateRanchRequestStatus({
              requestId: item.requestId,
              newStatus: "Rejected",
            });
          } else {
            await updateRoleRequestStatus({
              personId: item.personId,
              ranchId: item.ranchId,
              roleId: item.roleId,
              roleStatus: "Rejected",
            });
          }

          setConfirmDialog({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: null,
          });

          await loadData();
        } catch (err) {
          console.error("Undo approve failed:", err);
          alert(err.response?.data || "שגיאה בביטול האישור");
        } finally {
          setActionLoadingKey("");
        }
      },
    });
  }

  function handleApproveRejected(item) {
    setConfirmDialog({
      isOpen: true,
      title: "אישור בקשה שנדחתה",
      message: "האם את בטוחה שברצונך לאשר מחדש את הבקשה?",
      onConfirm: async function () {
        const rowKey = getRowKey(item);

        try {
          setActionLoadingKey(rowKey);

          if (activeTab === "ranch") {
            await updateRanchRequestStatus({
              requestId: item.requestId,
              newStatus: "Approved",
            });
          } else {
            await updateRoleRequestStatus({
              personId: item.personId,
              ranchId: item.ranchId,
              roleId: item.roleId,
              roleStatus: "Approved",
            });
          }

          setConfirmDialog({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: null,
          });

          await loadData();
        } catch (err) {
          console.error("Approve rejected request failed:", err);
          alert(err.response?.data || "שגיאה באישור מחדש של הבקשה");
        } finally {
          setActionLoadingKey("");
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
    <SuperUserLayout activeItemKey="requests">
      <div className="bg-white rounded-[26px] shadow-sm border border-[#E6DCD5] overflow-hidden">
        <div className="px-8 pt-8 pb-6">
          <h1 className="text-[2rem] font-bold text-[#3F312B] text-center">
            {pageTitle}
          </h1>

          <RequestsTabs activeTab={activeTab} onChange={handleTabChange} />

          <RequestsFiltersBar
            status={status}
            onStatusChange={setStatus}
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            onSearchClick={handleSearchClick}
          />
        </div>

        <div className="border-t border-[#EFE5DF] px-6 pb-4">
          <RequestsTable
            rows={rows}
            loading={loading}
            activeTab={activeTab}
            actionLoadingKey={actionLoadingKey}
            getRowKey={getRowKey}
            onApprove={handleApprove}
            onReject={handleReject}
            onUndoApprove={handleUndoApprove}
            onApproveRejected={handleApproveRejected}
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onCancel={closeConfirmDialog}
        onConfirm={confirmDialog.onConfirm}
      />
    </SuperUserLayout>
  );
}
