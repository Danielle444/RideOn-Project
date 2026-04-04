import { useEffect, useMemo, useState } from "react";
import SuperUserLayout from "../../components/superuser/SuperUserLayout";
import JudgesTable from "../../components/superuser/JudgesTable";
import JudgeModal from "../../components/superuser/JudgeModal";
import {
  getAllJudges,
  createJudge,
  updateJudge,
  deleteJudge,
  getAllFields,
} from "../../services/superUserService";

export default function JudgesManagementPage() {
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(false);

  const [fields, setFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState("");

  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [error, setError] = useState("");

  async function loadFields() {
    try {
      const res = await getAllFields();
      setFields(res.data || []);
    } catch (err) {
      console.error(err);
      alert(err.response?.data || "שגיאה בטעינת ענפים");
    }
  }

  async function loadJudges() {
    try {
      setLoading(true);
      const res = await getAllJudges(selectedFieldId || null);
      setJudges(res.data || []);
    } catch (err) {
      console.error(err);
      alert(err.response?.data || "שגיאה בטעינת שופטים");
      setJudges([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(function () {
    loadFields();
  }, []);

  useEffect(function () {
    loadJudges();
  }, [selectedFieldId]);

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

  async function handleSubmit(formData) {
    try {
      setError("");

      if (editItem) {
        await updateJudge(formData);
      } else {
        await createJudge(formData);
      }

      closeModal();
      await loadJudges();
    } catch (err) {
      console.error(err);
      setError(err.response?.data || "שגיאה בשמירת השופט");
    }
  }

  async function handleDelete(item) {
    const confirmed = window.confirm("בטוח למחוק את השופט?");

    if (!confirmed) {
      return;
    }

    try {
      await deleteJudge(item.judgeId);
      await loadJudges();
    } catch (err) {
      console.error(err);
      alert(err.response?.data || "שגיאה במחיקת שופט");
    }
  }

  return (
    <SuperUserLayout activeItemKey="judges">
      <div className="rounded-[26px] border border-[#E6DCD5] bg-white shadow-sm overflow-hidden">
        <div className="px-8 pt-8 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-[2rem] font-bold text-[#3F312B]">ניהול שופטים</h1>

            <button
              type="button"
              onClick={openCreate}
              className="rounded-xl bg-[#8B6352] px-5 py-3 font-semibold text-white shadow-sm hover:bg-[#7A5547] transition-colors"
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
    </SuperUserLayout>
  );
}