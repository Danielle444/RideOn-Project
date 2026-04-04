import { useEffect, useState } from "react";
import SuperUserLayout from "../../components/superuser/SuperUserLayout";
import FieldsTable from "../../components/superuser/FieldsTable";
import FieldModal from "../../components/superuser/FieldModal";
import {
  getAllFields,
  createField,
  updateField,
  deleteField,
} from "../../services/superUserService";

export default function FieldsManagementPage() {
  const [fields, setFields] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      const res = await getAllFields();
      setFields(res.data || []);
      setFiltered(res.data || []);
    } catch (err) {
      alert(err.response?.data || "שגיאה בטעינת ענפים");
    } finally {
      setLoading(false);
    }
  }

  useEffect(function () {
    load();
  }, []);

  useEffect(
    function () {
      const s = search.toLowerCase();
      setFiltered(
        fields.filter(function (f) {
          return f.fieldName.toLowerCase().includes(s);
        }),
      );
    },
    [search, fields],
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

  async function handleSubmit(name) {
    try {
      if (!editItem) {
        await createField({ fieldName: name });
      } else {
        await updateField({
          fieldId: editItem.fieldId,
          fieldName: name,
        });
      }

      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data || "שגיאה");
    }
  }

  async function handleDelete(item) {
    if (!window.confirm("בטוח למחוק את הענף?")) return;

    try {
      await deleteField(item.fieldId);
      load();
    } catch (err) {
      alert(err.response?.data || "שגיאה במחיקה");
    }
  }

  return (
    <SuperUserLayout activeItemKey="fields">
      <div className="rounded-[26px] border border-[#E6DCD5] bg-white shadow-sm overflow-hidden">
        <div className="px-8 pt-8 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-[2rem] font-bold text-[#3F312B]">ניהול ענפים</h1>

            <button
              onClick={openCreate}
              className="rounded-xl bg-[#8B6352] px-5 py-3 font-semibold text-white shadow-sm hover:bg-[#7A5547] transition-colors"
            >
              + הוספת ענף
            </button>
          </div>

          <div className="mt-8 flex justify-start">
            <input
              value={search}
              onChange={function (e) {
                setSearch(e.target.value);
              }}
              placeholder="חיפוש לפי שם ענף"
              className="h-11 w-[320px] rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm placeholder:text-[#A08D84] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
            />
          </div>
        </div>

        <div className="border-t border-[#EFE5DF] px-6 pb-4">
          <FieldsTable
            fields={filtered}
            loading={loading}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <FieldModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialValue={editItem?.fieldName}
        isEdit={!!editItem}
        error={error}
      />
    </SuperUserLayout>
  );
}