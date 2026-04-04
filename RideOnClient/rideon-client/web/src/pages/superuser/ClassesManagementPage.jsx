import { useEffect, useMemo, useState } from "react";
import SuperUserLayout from "../../components/superuser/SuperUserLayout";
import ClassTypesTable from "../../components/superuser/ClassTypesTable";
import ClassTypeModal from "../../components/superuser/ClassTypeModal";
import ConfirmDialog from "../../components/superuser/ConfirmDialog";
import ToastMessage from "../../components/common/ToastMessage";
import {
  getAllClassTypes,
  createClassType,
  updateClassType,
  deleteClassType,
  getAllFields,
} from "../../services/superUserService";

export default function ClassesManagementPage() {
  const [classTypes, setClassTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  const [fields, setFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState("");

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

  async function loadFields() {
    try {
      const res = await getAllFields();
      setFields(res.data || []);
    } catch (err) {
      console.error(err);
      showToast("error", err.response?.data || "שגיאה בטעינת ענפים");
    }
  }

  async function loadClassTypes() {
    try {
      setLoading(true);
      const res = await getAllClassTypes(selectedFieldId || null);
      setClassTypes(res.data || []);
    } catch (err) {
      console.error(err);
      showToast("error", err.response?.data || "שגיאה בטעינת סוגי מקצים");
      setClassTypes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(function () {
    loadFields();
  }, []);

  useEffect(function () {
    loadClassTypes();
  }, [selectedFieldId]);

  const filteredClassTypes = useMemo(
    function () {
      const s = search.trim().toLowerCase();

      if (!s) {
        return classTypes;
      }

      return classTypes.filter(function (item) {
        return (
          (item.className || "").toLowerCase().includes(s) ||
          (item.fieldName || "").toLowerCase().includes(s) ||
          (item.judgingSheetFormat || "").toLowerCase().includes(s) ||
          (item.qualificationDescription || "").toLowerCase().includes(s)
        );
      });
    },
    [classTypes, search],
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
        await updateClassType(formData);
        showToast("success", "סוג המקצה עודכן בהצלחה");
      } else {
        await createClassType(formData);
        showToast("success", "סוג המקצה נוצר בהצלחה");
      }

      closeModal();
      await loadClassTypes();
    } catch (err) {
      console.error(err);
      setError(err.response?.data || "שגיאה בשמירת סוג המקצה");
    }
  }

  function handleDelete(item) {
    setConfirmDialog({
      isOpen: true,
      title: "מחיקת סוג מקצה",
      message: "האם את בטוחה שברצונך למחוק את סוג המקצה?",
      onConfirm: async function () {
        try {
          await deleteClassType(item.classTypeId);
          closeConfirmDialog();
          showToast("success", "סוג המקצה נמחק בהצלחה");
          await loadClassTypes();
        } catch (err) {
          console.error(err);
          closeConfirmDialog();
          showToast("error", err.response?.data || "שגיאה במחיקת סוג המקצה");
        }
      },
    });
  }

  return (
    <SuperUserLayout activeItemKey="classes">
      <div className="rounded-[26px] border border-[#E6DCD5] bg-white shadow-sm overflow-hidden">
        <div className="px-8 pt-8 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-[2rem] font-bold text-[#3F312B]">ניהול מקצים</h1>

            <button
              type="button"
              onClick={openCreate}
              className="rounded-xl bg-[#8B6352] px-5 py-3 font-semibold text-white shadow-sm hover:bg-[#7A5547] transition-colors"
            >
              + הוספת סוג מקצה
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <select
              value={selectedFieldId}
              onChange={(e) => setSelectedFieldId(e.target.value)}
              className="h-11 min-w-[180px] rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
            >
              <option value="">כל הענפים</option>
              {fields.map(function (field) {
                return (
                  <option key={field.fieldId} value={field.fieldId}>
                    {field.fieldName}
                  </option>
                );
              })}
            </select>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם, ענף, פורמט או תיאור"
              className="h-11 w-[340px] rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm placeholder:text-[#A08D84] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
            />
          </div>
        </div>

        <div className="border-t border-[#EFE5DF] px-6 pb-4">
          <ClassTypesTable
            classTypes={filteredClassTypes}
            loading={loading}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <ClassTypeModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        initialValue={editItem}
        fields={fields}
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