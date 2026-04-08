import { useEffect, useMemo, useState } from "react";
import { getActiveRole } from "../../services/storageService";
import { getServicePricesDashboard } from "../../services/servicePricesService";
import {
  getArenasByRanchId,
  createArena,
  updateArena,
  deleteArena,
  getCompoundsByRanchId,
  createCompound,
  updateCompoundName,
  deleteCompound,
} from "../../services/arenasAndStallsService";

function getErrorText(error, fallbackMessage) {
  if (typeof error?.response?.data === "string") {
    return error.response.data;
  }

  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
}

export default function useArenasAndStallsPage() {
  const activeRole = getActiveRole();
  const ranchId = activeRole?.ranchId || 0;

  const [arenas, setArenas] = useState([]);
  const [compounds, setCompounds] = useState([]);
  const [stallTypeOptions, setStallTypeOptions] = useState([]);

  const [loadingArenas, setLoadingArenas] = useState(false);
  const [loadingCompounds, setLoadingCompounds] = useState(false);

  const [arenasExpanded, setArenasExpanded] = useState(true);
  const [compoundsExpanded, setCompoundsExpanded] = useState(true);

  const [arenaModalOpen, setArenaModalOpen] = useState(false);
  const [editingArena, setEditingArena] = useState(null);
  const [arenaError, setArenaError] = useState("");

  const [compoundModalOpen, setCompoundModalOpen] = useState(false);
  const [editingCompound, setEditingCompound] = useState(null);
  const [compoundError, setCompoundError] = useState("");

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

  async function loadArenas() {
    try {
      setLoadingArenas(true);

      const response = await getArenasByRanchId(ranchId);
      setArenas(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setArenas([]);
      showToast("error", getErrorText(error, "שגיאה בטעינת המגרשים"));
    } finally {
      setLoadingArenas(false);
    }
  }

  async function loadCompounds() {
    try {
      setLoadingCompounds(true);

      const response = await getCompoundsByRanchId(ranchId);
      setCompounds(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setCompounds([]);
      showToast("error", getErrorText(error, "שגיאה בטעינת המתחמים"));
    } finally {
      setLoadingCompounds(false);
    }
  }

  async function loadStallTypes() {
    try {
      const response = await getServicePricesDashboard(ranchId);
      const sections = Array.isArray(response.data) ? response.data : [];

      let stallsSection = null;
      let i;

      for (i = 0; i < sections.length; i++) {
        if (Number(sections[i].categoryId) === 2) {
          stallsSection = sections[i];
          break;
        }
      }

      setStallTypeOptions(Array.isArray(stallsSection?.items) ? stallsSection.items : []);
    } catch (error) {
      console.error(error);
      setStallTypeOptions([]);
      showToast("error", "שגיאה בטעינת סוגי התאים");
    }
  }

  async function loadPageData() {
    if (!ranchId) {
      showToast("error", "לא נבחרה חווה פעילה");
      return;
    }

    await Promise.all([loadArenas(), loadCompounds(), loadStallTypes()]);
  }

  useEffect(
    function () {
      if (!ranchId) {
        return;
      }

      loadPageData();
    },
    [ranchId],
  );

  const arenasCount = useMemo(
    function () {
      return Array.isArray(arenas) ? arenas.length : 0;
    },
    [arenas],
  );

  const compoundsCount = useMemo(
    function () {
      return Array.isArray(compounds) ? compounds.length : 0;
    },
    [compounds],
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

  function closeConfirmDialog() {
    setConfirmDialog({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: null,
    });
  }

  function openCreateArena() {
    setEditingArena(null);
    setArenaError("");
    setArenaModalOpen(true);
  }

  function openEditArena(item) {
    setEditingArena(item);
    setArenaError("");
    setArenaModalOpen(true);
  }

  function closeArenaModal() {
    setArenaModalOpen(false);
    setEditingArena(null);
    setArenaError("");
  }

  async function handleArenaSubmit(formData) {
    try {
      setArenaError("");

      if (editingArena) {
        await updateArena({
          ranchId,
          arenaId: editingArena.arenaId,
          arenaName: formData.arenaName,
          arenaLength: formData.arenaLength,
          arenaWidth: formData.arenaWidth,
          isCovered: formData.isCovered,
        });

        showToast("success", "המגרש עודכן בהצלחה");
      } else {
        await createArena({
          ranchId,
          arenaName: formData.arenaName,
          arenaLength: formData.arenaLength,
          arenaWidth: formData.arenaWidth,
          isCovered: formData.isCovered,
        });

        showToast("success", "המגרש נוצר בהצלחה");
      }

      closeArenaModal();
      await loadArenas();
    } catch (error) {
      console.error(error);
      setArenaError(getErrorText(error, "שגיאה בשמירת המגרש"));
    }
  }

  function handleArenaDelete(item) {
    setConfirmDialog({
      isOpen: true,
      title: "מחיקת מגרש",
      message: `האם למחוק את "${item.arenaName}"?`,
      onConfirm: async function () {
        try {
          await deleteArena(ranchId, item.arenaId);
          closeConfirmDialog();
          showToast("success", "המגרש נמחק בהצלחה");
          await loadArenas();
        } catch (error) {
          console.error(error);
          closeConfirmDialog();
          showToast("error", getErrorText(error, "שגיאה במחיקת המגרש"));
        }
      },
    });
  }

  function openCreateCompound() {
    setEditingCompound(null);
    setCompoundError("");
    setCompoundModalOpen(true);
  }

  function openEditCompound(item) {
    setEditingCompound(item);
    setCompoundError("");
    setCompoundModalOpen(true);
  }

  function closeCompoundModal() {
    setCompoundModalOpen(false);
    setEditingCompound(null);
    setCompoundError("");
  }

  async function handleCompoundSubmit(formData) {
    try {
      setCompoundError("");

      if (editingCompound) {
        await updateCompoundName(ranchId, editingCompound.compoundId, formData.compoundName);
        showToast("success", "שם המתחם עודכן בהצלחה");
      } else {
        await createCompound({
          ranchId,
          compoundName: formData.compoundName,
          stallTypeProductId: formData.stallTypeProductId,
          numberingPattern: formData.numberingPattern,
        });

        showToast("success", "המתחם נוצר בהצלחה");
      }

      closeCompoundModal();
      await loadCompounds();
    } catch (error) {
      console.error(error);
      setCompoundError(getErrorText(error, "שגיאה בשמירת המתחם"));
    }
  }

  function handleCompoundDelete(item) {
    setConfirmDialog({
      isOpen: true,
      title: "מחיקת מתחם",
      message: `האם למחוק את "${item.compoundName}"?`,
      onConfirm: async function () {
        try {
          await deleteCompound(ranchId, item.compoundId);
          closeConfirmDialog();
          showToast("success", "המתחם נמחק בהצלחה");
          await loadCompounds();
        } catch (error) {
          console.error(error);
          closeConfirmDialog();
          showToast("error", getErrorText(error, "שגיאה במחיקת המתחם"));
        }
      },
    });
  }

  return {
    ranchId,
    arenas,
    compounds,
    stallTypeOptions,
    loadingArenas,
    loadingCompounds,
    arenasExpanded,
    setArenasExpanded,
    compoundsExpanded,
    setCompoundsExpanded,
    arenasCount,
    compoundsCount,
    arenaModalOpen,
    editingArena,
    arenaError,
    compoundModalOpen,
    editingCompound,
    compoundError,
    confirmDialog,
    toast,
    openCreateArena,
    openEditArena,
    closeArenaModal,
    handleArenaSubmit,
    handleArenaDelete,
    openCreateCompound,
    openEditCompound,
    closeCompoundModal,
    handleCompoundSubmit,
    handleCompoundDelete,
    closeConfirmDialog,
    closeToast,
  };
}