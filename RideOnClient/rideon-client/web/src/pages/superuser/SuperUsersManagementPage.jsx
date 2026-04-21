import { useEffect, useState } from "react";
import SuperUserLayout from "../../components/superuser/SuperUserLayout";
import SuperUsersTable from "../../components/superuser/SuperUsersTable";
import CreateSuperUserModal from "../../components/superuser/CreateSuperUserModal";
import {
  createSuperUser,
  getAllSuperUsers,
} from "../../services/superUserService";

export default function SuperUsersManagementPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createErrorMessage, setCreateErrorMessage] = useState("");
  const [createSuccessMessage, setCreateSuccessMessage] = useState("");

  async function loadSuperUsers() {
    try {
      setLoading(true);
      const response = await getAllSuperUsers();
      setRows(response.data || []);
    } catch (err) {
      console.error("Failed loading super users:", err);
      alert(err.response?.data || "שגיאה בטעינת משתמשי המערכת");
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
      setCreateErrorMessage(err.response?.data || "שגיאה ביצירת משתמש המערכת");
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
                משתמשי מערכת
              </h1>
              <p className="mt-2 text-[0.98rem] text-[#8A746A]">
                צפייה במשתמשי מערכת קיימים ויצירת משתמש חדש
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
    </SuperUserLayout>
  );
}