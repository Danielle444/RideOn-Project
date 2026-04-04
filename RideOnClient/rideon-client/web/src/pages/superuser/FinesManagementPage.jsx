import { useEffect, useMemo, useState } from "react";
import SuperUserLayout from "../../components/superuser/SuperUserLayout";
import FinesTable from "../../components/superuser/FinesTable";
import FineModal from "../../components/superuser/FineModal";
import ConfirmDialog from "../../components/superuser/ConfirmDialog";
import ToastMessage from "../../components/common/ToastMessage";
import {
  getAllFines,
  createFine,
  updateFine,
  deleteFine,
} from "../../services/superUserService";

export default function FinesManagementPage() {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [error, setError] = useState("");

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

  async function loadFines() {
    try {
      setLoading(true);
      const res = await getAllFines();
      setFines(res.data || []);
    } catch (err) {
      console.error(err);
      showToast("error", err.response?.data || "שגיאה בטעינת קנסות");
      setFines([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(function () {
    loadFines();
  }, []);

  const filteredFines = useMemo(
    function () {
      const s = search.trim().toLowerCase();

      if (!s) {
        return fines;
      }

      return fines.filter(function (item) {
        return (
          (item.fineName || "").toLowerCase().includes(s) ||
          (item.fineDescription || "").toLowerCase().includes(s) ||
          String(item.fineAmount || "").toLowerCase().includes(s)
        );
      });
    },
    [fines, search],
  );

  function showToast(type, message) {
    setToast({
      isOpen: true,
      type,
      message,
    });
  }

  function closeToast() {
    setToast({
      isOpen: false,
      type: "success",
      message: "",
    });
  }

  function openCreate() {
    setEditItem(null);
    setError("");
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditItem(item);
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditItem(null);
    setError("");
  }

  function closeConfirmDialog() {
    setConfirmDialog({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: null,
    });
  }

  async function handleSubmit(formData) {
    try {
      setError("");

      if (editItem) {
        await updateFine(formData);
        showToast("success", "הקנס עודכן בהצלחה");
      } else {
        await createFine(formData);
        showToast("success", "הקנס נוצר בהצלחה");
      }

      closeModal();
      await loadFines();
    } catch (err) {
      console.error(err);
      setError(err.response?.data || "שגיאה בשמירת הקנס");
    }
  }

  function handleDelete(item) {
    setConfirmDialog({
      isOpen: true,
      title: "מחיקת קנס",
      message: "האם את בטוחה שברצונך למחוק את הקנס?",
      onConfirm: async function () {
        try {
          await deleteFine(item.fineId);
          closeConfirmDialog();
          showToast("success", "הקנס נמחק בהצלחה");
          await loadFines();
        } catch (err) {
          console.error(err);
          closeConfirmDialog();
          showToast("error", err.response?.data || "שגיאה במחיקת הקנס");
        }
      },
    });
  }

  return (
    <SuperUserLayout activeItemKey="fines">
      <div className="rounded-[26px] border border-[#E6DCD5] bg-white shadow-sm overflow-hidden">
        <div className="px-8 pt-8 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-[2rem] font-bold text-[#3F312B]">ניהול קנסות</h1>

            <button
              type="button"
              onClick={openCreate}
              className="rounded-xl bg-[#8B6352] px-5 py-3 font-semibold text-white shadow-sm hover:bg-[#7A5547] transition-colors"
            >
              + הוספת קנס
            </button>
          </div>

          <div className="mt-8 flex justify-start">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם, תיאור או סכום"
              className="h-11 w-[320px] rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm placeholder:text-[#A08D84] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
            />
          </div>
        </div>

        <div className="border-t border-[#EFE5DF] px-6 pb-4">
          <FinesTable
            fines={filteredFines}
            loading={loading}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <FineModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        initialValue={editItem}
        error={error}
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
    </SuperUserLayout>
  );
}