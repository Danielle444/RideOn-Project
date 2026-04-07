import { useEffect, useMemo, useState } from "react";
import SuperUserLayout from "../../components/superuser/SuperUserLayout";
import JudgesTable from "../../components/superuser/JudgesTable";
import JudgeModal from "../../components/common/JudgeModal";
import ConfirmDialog from "../../components/superuser/ConfirmDialog";
import ToastMessage from "../../components/common/ToastMessage";
import {
  getAllJudges,
  createJudge,
  updateJudge,
  deleteJudge,
  getAllFields,
} from "../../services/superUserService";
import { getErrorMessage } from "../../utils/competitionForm.utils";

export default function JudgesManagementPage() {
  const [judges, setJudges] = useState([]);
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
      setFields(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      showToast("error", getErrorMessage(err, "שגיאה בטעינת ענפים"));
    }
  }

  async function loadJudges() {
    try {
      setLoading(true);
      const res = await getAllJudges(selectedFieldId || null);
      setJudges(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      showToast("error", getErrorMessage(err, "שגיאה בטעינת שופטים"));
      setJudges([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(function () {
    loadFields();
  }, []);

  useEffect(
    function () {
      loadJudges();
    },
    [selectedFieldId],
  );

  const filteredJudges = useMemo(
    function () {
      const s = search.trim().toLowerCase();

      if (!s) {
        return judges;
      }

      return judges.filter(function (judge) {
        const hebrewFullName =
          `${judge.firstNameHebrew || ""} ${judge.lastNameHebrew || ""}`.toLowerCase();
        const englishFullName =
          `${judge.firstNameEnglish || ""} ${judge.lastNameEnglish || ""}`.toLowerCase();
        const country = (judge.country || "").toLowerCase();
        const qualifiedFields = (judge.qualifiedFields || "").toLowerCase();

        return (
          hebrewFullName.includes(s) ||
          englishFullName.includes(s) ||
          country.includes(s) ||
          qualifiedFields.includes(s)
        );
      });
    },
    [judges, search],
  );

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
        await updateJudge(formData);
        showToast("success", "השופט עודכן בהצלחה");
      } else {
        await createJudge(formData);
        showToast("success", "השופט נוצר בהצלחה");
      }

      closeModal();
      await loadJudges();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "שגיאה בשמירת השופט"));
    }
  }

  function handleDelete(item) {
    setConfirmDialog({
      isOpen: true,
      title: "מחיקת שופט",
      message: "האם את בטוחה שברצונך למחוק את השופט?",
      onConfirm: async function () {
        try {
          await deleteJudge(item.judgeId);
          closeConfirmDialog();
          showToast("success", "השופט נמחק בהצלחה");
          await loadJudges();
        } catch (err) {
          console.error(err);
          closeConfirmDialog();
          showToast("error", getErrorMessage(err, "שגיאה במחיקת שופט"));
        }
      },
    });
  }

  return (
    <SuperUserLayout activeItemKey="judges">
      <div className="overflow-hidden rounded-[26px] border border-[#E6DCD5] bg-white shadow-sm">
        <div className="px-8 pb-6 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-[2rem] font-bold text-[#3F312B]">
              ניהול שופטים
            </h1>

            <button
              type="button"
              onClick={openCreate}
              className="rounded-xl bg-[#8B6352] px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#7A5547]"
            >
              + הוספת שופט
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
              placeholder="חיפוש לפי שם, מדינה או ענף"
              className="h-11 w-[320px] rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm placeholder:text-[#A08D84] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
            />
          </div>
        </div>

        <div className="border-t border-[#EFE5DF] px-6 pb-4">
          <JudgesTable
            judges={filteredJudges}
            loading={loading}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <JudgeModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        initialJudge={editItem}
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