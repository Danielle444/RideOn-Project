import { useEffect, useMemo, useState } from "react";
import SuperUserLayout from "../../components/superuser/SuperUserLayout";
import FinesTable from "../../components/superuser/FinesTable";
import FineModal from "../../components/superuser/FineModal";
import ToastMessage from "../../components/common/ToastMessage";
import { getAllFines, updateFine } from "../../services/superUserService";
import { getErrorMessage } from "../../utils/competitionForm.utils";

export default function FinesManagementPage() {
  const [fines, setFines] = useState([]);
  // Start loading=true so the table shows a spinner on first paint instead of its empty row
  // before the mount fetch runs. loadFines sets loading true→false, so this always resolves.
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [error, setError] = useState("");

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
      showToast("error", getErrorMessage(err, "שגיאה בטעינת קנסות"));
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
          String(item.fineAmount || "")
            .toLowerCase()
            .includes(s)
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

  async function handleSubmit(formData) {
    try {
      setError("");

      await updateFine(formData);

      showToast("success", "מדיניות הקנס עודכנה בהצלחה");

      closeModal();

      await loadFines();
    } catch (err) {
      console.error(err);

      setError(getErrorMessage(err, "שגיאה בשמירת הקנס"));
    }
  }

  return (
    <SuperUserLayout activeItemKey="fines">
      <div className="rounded-[26px] border border-[#E6DCD5] bg-white shadow-sm overflow-hidden">
        <div className="px-8 pt-8 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-[2rem] font-bold text-[#3F312B]">
              ניהול מדיניות קנסות
            </h1>
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

      <ToastMessage
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={closeToast}
      />
    </SuperUserLayout>
  );
}
