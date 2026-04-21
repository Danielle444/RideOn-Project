import { useEffect, useMemo, useState } from "react";
import SuperUserLayout from "../../components/superuser/SuperUserLayout";
import PrizeTypesTable from "../../components/superuser/PrizeTypesTable";
import PrizeTypeModal from "../../components/superuser/PrizeTypeModal";
import ConfirmDialog from "../../components/superuser/ConfirmDialog";
import ToastMessage from "../../components/common/ToastMessage";
import {
  getAllPrizeTypes,
  createPrizeType,
  updatePrizeType,
  deletePrizeType,
} from "../../services/superUserService";

export default function PrizesManagementPage() {
  const [prizeTypes, setPrizeTypes] = useState([]);
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

  async function loadPrizeTypes() {
    try {
      setLoading(true);
      const res = await getAllPrizeTypes();
      setPrizeTypes(res.data || []);
    } catch (err) {
      console.error(err);
      showToast("error", err.response?.data || "שגיאה בטעינת פרסים");
      setPrizeTypes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(function () {
    loadPrizeTypes();
  }, []);

  const filteredPrizeTypes = useMemo(
    function () {
      const s = search.trim().toLowerCase();

      if (!s) {
        return prizeTypes;
      }

      return prizeTypes.filter(function (item) {
        return (
          (item.prizeTypeName || "").toLowerCase().includes(s) ||
          (item.prizeDescription || "").toLowerCase().includes(s)
        );
      });
    },
    [prizeTypes, search],
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
        await updatePrizeType(formData);
        showToast("success", "הפרס עודכן בהצלחה");
      } else {
        await createPrizeType(formData);
        showToast("success", "הפרס נוצר בהצלחה");
      }

      closeModal();
      await loadPrizeTypes();
    } catch (err) {
      console.error(err);
      setError(err.response?.data || "שגיאה בשמירת הפרס");
    }
  }

  function handleDelete(item) {
    setConfirmDialog({
      isOpen: true,
      title: "מחיקת סוג פרס",
      message: "האם את בטוחה שברצונך למחוק את סוג הפרס?",
      onConfirm: async function () {
        try {
          await deletePrizeType(item.prizeTypeId);
          closeConfirmDialog();
          showToast("success", "סוג הפרס נמחק בהצלחה");
          await loadPrizeTypes();
        } catch (err) {
          console.error(err);
          closeConfirmDialog();
          showToast("error", err.response?.data || "שגיאה במחיקת סוג הפרס");
        }
      },
    });
  }

  return (
    <SuperUserLayout activeItemKey="prizes">
      <div className="rounded-[26px] border border-[#E6DCD5] bg-white shadow-sm overflow-hidden">
        <div className="px-8 pt-8 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-[2rem] font-bold text-[#3F312B]">ניהול פרסים</h1>

            <button
              type="button"
              onClick={openCreate}
              className="rounded-xl bg-[#8B6352] px-5 py-3 font-semibold text-white shadow-sm hover:bg-[#7A5547] transition-colors"
            >
              + הוספת פרס
            </button>
          </div>

          <div className="mt-8 flex justify-start">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם פרס או תיאור"
              className="h-11 w-[320px] rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm placeholder:text-[#A08D84] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
            />
          </div>
        </div>

        <div className="border-t border-[#EFE5DF] px-6 pb-4">
          <PrizeTypesTable
            prizeTypes={filteredPrizeTypes}
            loading={loading}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <PrizeTypeModal
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