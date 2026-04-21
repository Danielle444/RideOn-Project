import { useEffect, useMemo, useState } from "react";
import SuperUserLayout from "../../components/superuser/SuperUserLayout";
import FieldsTable from "../../components/superuser/FieldsTable";
import FieldModal from "../../components/superuser/FieldModal";
import ConfirmDialog from "../../components/superuser/ConfirmDialog";
import ToastMessage from "../../components/common/ToastMessage";
import {
  getAllFields,
  createField,
  updateField,
  deleteField,
} from "../../services/superUserService";

export default function FieldsManagementPage() {
  const [fields, setFields] = useState([]);
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

  // =========================
  // LOAD
  // =========================
  async function loadFields() {
    try {
      setLoading(true);
      const res = await getAllFields();
      setFields(res.data || []);
    } catch (err) {
      console.error(err);
      showToast("error", err.response?.data || "שגיאה בטעינת ענפים");
      setFields([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(function () {
    loadFields();
  }, []);

  // =========================
  // FILTER
  // =========================
  const filteredFields = useMemo(
    function () {
      const s = search.trim().toLowerCase();

      if (!s) {
        return fields;
      }

      return fields.filter(function (item) {
        return (item.fieldName || "").toLowerCase().includes(s);
      });
    },
    [fields, search],
  );

  // =========================
  // TOAST
  // =========================
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

  // =========================
  // MODAL
  // =========================
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

  // =========================
  // CONFIRM
  // =========================
  function closeConfirmDialog() {
    setConfirmDialog({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: null,
    });
  }

  // =========================
  // SAVE
  // =========================
  async function handleSubmit(formData) {
    try {
      setError("");

      if (editItem) {
        await updateField(formData);
        showToast("success", "הענף עודכן בהצלחה");
      } else {
        await createField(formData);
        showToast("success", "הענף נוצר בהצלחה");
      }

      closeModal();
      await loadFields();
    } catch (err) {
      console.error(err);

      const errorMessage =
        err.response?.data?.title ||
        err.response?.data?.message ||
        (typeof err.response?.data === "string" ? err.response.data : null) ||
        "שגיאה בשמירת הענף";

      setError(errorMessage);
    }
  }

  // =========================
  // DELETE
  // =========================
  function handleDelete(item) {
    setConfirmDialog({
      isOpen: true,
      title: "מחיקת ענף",
      message: "האם את בטוחה שברצונך למחוק את הענף?",
      onConfirm: async function () {
        try {
          await deleteField(item.fieldId);
          closeConfirmDialog();
          showToast("success", "הענף נמחק בהצלחה");
          await loadFields();
        } catch (err) {
          console.error(err);
          closeConfirmDialog();
          showToast("error", err.response?.data || "שגיאה במחיקת הענף");
        }
      },
    });
  }

  // =========================
  // UI
  // =========================
  return (
    <SuperUserLayout activeItemKey="fields">
      <div className="rounded-[26px] border border-[#E6DCD5] bg-white shadow-sm overflow-hidden">
        <div className="px-8 pt-8 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-[2rem] font-bold text-[#3F312B]">
              ניהול ענפים
            </h1>

            <button
              type="button"
              onClick={openCreate}
              className="rounded-xl bg-[#8B6352] px-5 py-3 font-semibold text-white shadow-sm hover:bg-[#7A5547] transition-colors"
            >
              + הוספת ענף
            </button>
          </div>

          <div className="mt-8 flex justify-start">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם ענף"
              className="h-11 w-[320px] rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm placeholder:text-[#A08D84] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
            />
          </div>
        </div>

        <div className="border-t border-[#EFE5DF] px-6 pb-4">
          <FieldsTable
            fields={filteredFields}
            loading={loading}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <FieldModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        initialValue={editItem?.fieldName || ""}
        initialItem={editItem}
        isEdit={!!editItem}
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
