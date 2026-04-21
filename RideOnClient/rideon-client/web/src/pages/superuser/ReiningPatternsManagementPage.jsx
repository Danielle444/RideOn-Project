import { useEffect, useState } from "react";
import SuperUserLayout from "../../components/superuser/SuperUserLayout";
import ConfirmDialog from "../../components/superuser/ConfirmDialog";
import ToastMessage from "../../components/common/ToastMessage";
import ReiningPatternsTable from "../../components/superuser/ReiningPatternsTable";
import ReiningPatternModal from "../../components/superuser/ReiningPatternModal";
import {
  getAllPatternsWithManeuvers,
  createPattern,
  updatePattern,
  deletePattern,
  getAllManeuvers,
  replacePatternManeuvers,
  createManeuver,
} from "../../services/superUserService";
import { getErrorMessage } from "../../utils/competitionForm.utils";

export default function ReiningPatternsManagementPage() {
  var [items, setItems] = useState([]);
  var [allManeuvers, setAllManeuvers] = useState([]);
  var [loading, setLoading] = useState(false);
  var [saving, setSaving] = useState(false);

  var [modalOpen, setModalOpen] = useState(false);
  var [editItem, setEditItem] = useState(null);
  var [error, setError] = useState("");

  var [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  var [toast, setToast] = useState({
    isOpen: false,
    type: "success",
    message: "",
  });

  useEffect(function () {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      setLoading(true);

      var results = await Promise.all([
        getAllPatternsWithManeuvers(),
        getAllManeuvers(),
      ]);

      var patternsWithManeuversRes = results[0];
      var maneuversRes = results[1];

      var patternItems = Array.isArray(patternsWithManeuversRes.data)
        ? patternsWithManeuversRes.data
        : [];

      var maneuverItems = Array.isArray(maneuversRes.data)
        ? maneuversRes.data
        : [];

      patternItems.sort(function (a, b) {
        return Number(a.patternNumber) - Number(b.patternNumber);
      });

      setItems(patternItems);
      setAllManeuvers(maneuverItems);
    } catch (err) {
      console.error(err);
      showToast("error", getErrorMessage(err, "שגיאה בטעינת מסלולי ריינינג"));
    } finally {
      setLoading(false);
    }
  }

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

  async function handleCreateInlineManeuver(formData) {
    try {
      var response = await createManeuver(formData);
      var newId = response.data;

      var refreshedManeuversRes = await getAllManeuvers();
      var refreshedManeuvers = Array.isArray(refreshedManeuversRes.data)
        ? refreshedManeuversRes.data
        : [];

      setAllManeuvers(refreshedManeuvers);

      var created = refreshedManeuvers.find(function (item) {
        return String(item.maneuverId) === String(newId);
      });

      if (created) {
        return created;
      }

      return refreshedManeuvers.find(function (item) {
        return (
          String(item.maneuverName || "").trim() ===
            String(formData.maneuverName || "").trim() &&
          String(item.maneuverDescription || "").trim() ===
            String(formData.maneuverDescription || "").trim()
        );
      });
    } catch (err) {
      console.error(err);
      throw new Error(getErrorMessage(err, "שגיאה בשמירת המנברה"));
    }
  }

  async function handleSubmit(formData) {
    try {
      setSaving(true);
      setError("");

      var targetPatternNumber = Number(formData.patternNumber);

      if (editItem) {
        await updatePattern({
          oldPatternNumber: Number(formData.oldPatternNumber),
          newPatternNumber: targetPatternNumber,
        });
      } else {
        await createPattern({
          patternNumber: targetPatternNumber,
        });
      }

      var maneuversPayload = Array.isArray(formData.maneuvers)
        ? formData.maneuvers.map(function (item, index) {
            return {
              patternNumber: targetPatternNumber,
              maneuverId: item.maneuverId,
              maneuverOrder: index + 1,
            };
          })
        : [];

      await replacePatternManeuvers(targetPatternNumber, maneuversPayload);

      closeModal();
      showToast(
        "success",
        editItem ? "מסלול הריינינג עודכן בהצלחה" : "מסלול הריינינג נוצר בהצלחה",
      );

      await loadPage();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "שגיאה בשמירת מסלול הריינינג"));
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(item) {
    setConfirmDialog({
      isOpen: true,
      title: "מחיקת מסלול ריינינג",
      message: "האם את בטוחה שברצונך למחוק את המסלול?",
      onConfirm: async function () {
        try {
          await deletePattern(item.patternNumber);
          closeConfirmDialog();
          showToast("success", "המסלול נמחק בהצלחה");
          await loadPage();
        } catch (err) {
          console.error(err);
          closeConfirmDialog();
          showToast("error", getErrorMessage(err, "שגיאה במחיקת המסלול"));
        }
      },
    });
  }

  return (
    <SuperUserLayout activeItemKey="reining-patterns">
      <div className="overflow-hidden rounded-[26px] border border-[#E6DCD5] bg-white shadow-sm">
        <div className="border-b border-[#EFE5DF] px-8 py-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-[2rem] font-bold text-[#3F312B]">
                מסלולי ריינינג
              </h1>
              <div className="mt-2 text-sm text-[#8B6A5A]">
                כאן מגדירים מסלולים, מוסיפים מנברות ומשייכים את סדר המנברות לכל
                מסלול.
              </div>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="rounded-xl bg-[#8B6352] px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#7A5547]"
            >
              + הוספת מסלול
            </button>
          </div>
        </div>

        <div className="px-6 py-6">
          <ReiningPatternsTable
            items={items}
            loading={loading}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <ReiningPatternModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onCreateInlineManeuver={handleCreateInlineManeuver}
        initialItem={editItem}
        allManeuvers={allManeuvers}
        error={error}
        saving={saving}
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