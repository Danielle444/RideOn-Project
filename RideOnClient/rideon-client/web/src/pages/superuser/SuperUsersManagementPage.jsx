import { useEffect, useState } from "react";
import SuperUserLayout from "../../components/superuser/SuperUserLayout";
import SuperUsersTable from "../../components/superuser/SuperUsersTable";
import CreateSuperUserModal from "../../components/superuser/CreateSuperUserModal";
import ToastMessage from "../../components/common/ToastMessage";
import {
  createSuperUser,
  getAllSuperUsers,
} from "../../services/superUserService";
import { getErrorMessage } from "../../utils/competitionForm.utils";

export default function SuperUsersManagementPage() {
  const [rows, setRows] = useState([]);
  // Start loading=true so the table shows a spinner on first paint instead of its empty row
  // before the mount fetch runs. loadSuperUsers (called unconditionally on mount) sets loading
  // true→false, so this always resolves.
  const [loading, setLoading] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createErrorMessage, setCreateErrorMessage] = useState("");
  const [createSuccessMessage, setCreateSuccessMessage] = useState("");

  const [toast, setToast] = useState({
    isOpen: false,
    type: "success",
    message: "",
  });

  function showToast(type, message) {
    setToast({ isOpen: true, type, message });
  }

  function closeToast() {
    setToast({ isOpen: false, type: "success", message: "" });
  }

  async function loadSuperUsers() {
    try {
      setLoading(true);
      const response = await getAllSuperUsers();
      setRows(response.data || []);
    } catch (err) {
      console.error("Failed loading super users:", err);
      showToast("error", getErrorMessage(err, "שגיאה בטעינת מנהלי המערכת"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(function () {
    loadSuperUsers();
  }, []);

  function openCreateModal() {
    setCreateErrorMessage("");
    setCreateSuccessMessage("");
    setIsCreateModalOpen(true);
  }

  function closeCreateModal() {
    if (createLoading) {
      return;
    }

    setIsCreateModalOpen(false);
    setCreateErrorMessage("");
    setCreateSuccessMessage("");
  }

  async function handleCreateSuperUser(formData) {
    try {
      setCreateLoading(true);
      setCreateErrorMessage("");
      setCreateSuccessMessage("");

      await createSuperUser(formData);

      setCreateSuccessMessage("משתמש המערכת נוצר בהצלחה");
      await loadSuperUsers();

      setTimeout(function () {
        setIsCreateModalOpen(false);
        setCreateSuccessMessage("");
      }, 900);
    } catch (err) {
      console.error("Create super user failed:", err);
      setCreateErrorMessage(getErrorMessage(err, "שגיאה ביצירת משתמש המערכת"));
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <SuperUserLayout activeItemKey="super-users">
      <div className="rounded-[26px] border border-[#E6DCD5] bg-white shadow-sm overflow-hidden">
        <div className="px-8 pt-8 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-[2rem] font-bold text-[#3F312B]">
                מנהלי מערכת
              </h1>
              <p className="mt-2 text-[0.98rem] text-[#8A746A]">
                צפייה במנהלי מערכת קיימים ויצירת משתמש חדש
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-xl bg-[#8B6352] px-5 py-3 font-semibold text-white shadow-sm hover:bg-[#7A5547] transition-colors"
            >
              + יצירת משתמש
            </button>
          </div>
        </div>

        <div className="border-t border-[#EFE5DF] px-6 pb-4">
          <SuperUsersTable rows={rows} loading={loading} />
        </div>
      </div>

      <CreateSuperUserModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onSubmit={handleCreateSuperUser}
        loading={createLoading}
        errorMessage={createErrorMessage}
        successMessage={createSuccessMessage}
      />

      <ToastMessage
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={closeToast}
      />
    </SuperUserLayout>
  );
}