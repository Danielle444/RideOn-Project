import { useEffect, useMemo, useState } from "react";
import { getActiveRole } from "../../services/storageService";
import {
  getServicePricesDashboard,
  createServiceProduct,
  updateServiceProduct,
  deleteServiceProduct,
  deactivateServiceProduct,
  activateServiceProduct,
  getServiceProductPriceHistory,
  activateServicePriceHistoryItem,
} from "../../services/servicePricesService";

export default function useServicePricesPage() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [error, setError] = useState("");

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyProduct, setHistoryProduct] = useState(null);

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

  const activeRole = getActiveRole();
  const ranchId = activeRole?.ranchId || 0;

  async function loadDashboard() {
    try {
      setLoading(true);

      if (!ranchId) {
        throw new Error("לא נמצאה חווה פעילה");
      }

      const res = await getServicePricesDashboard(ranchId);
      setSections(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      showToast(
        "error",
        err.response?.data || err.message || "שגיאה בטעינת מחירון השירותים",
      );
      setSections([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(
    function () {
      loadDashboard();
    },
    [ranchId],
  );

  const filteredSections = useMemo(
    function () {
      const s = search.trim().toLowerCase();

      if (!s) {
        return sections;
      }

      return sections
        .map(function (section) {
          const filteredItems = (section.items || []).filter(function (item) {
            return (
              (item.productName || "").toLowerCase().includes(s) ||
              (section.categoryName || "").toLowerCase().includes(s)
            );
          });

          return {
            ...section,
            items: filteredItems,
          };
        })
        .filter(function (section) {
          return section.items.length > 0;
        });
    },
    [sections, search],
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

  function openCreate(category) {
    setEditItem(null);
    setSelectedCategory(category);
    setError("");
    setModalOpen(true);
  }

  function openEdit(item, category) {
    setEditItem(item);
    setSelectedCategory(category);
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditItem(null);
    setSelectedCategory(null);
    setError("");
  }

  async function openHistory(item) {
    try {
      setHistoryOpen(true);
      setHistoryProduct(item);
      setHistoryItems([]);
      setHistoryLoading(true);

      const res = await getServiceProductPriceHistory(item.productId, ranchId);
      setHistoryItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      showToast("error", err.response?.data || "שגיאה בטעינת היסטוריית המחירים");
      setHistoryOpen(false);
      setHistoryProduct(null);
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  function closeHistory() {
    setHistoryOpen(false);
    setHistoryLoading(false);
    setHistoryItems([]);
    setHistoryProduct(null);
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

      if (!ranchId) {
        throw new Error("לא נמצאה חווה פעילה");
      }

      if (editItem) {
        await updateServiceProduct({
          productId: editItem.productId,
          productName: editItem.productName,
          durationMinutes: editItem.durationMinutes,
          ranchId,
          itemPrice: formData.itemPrice,
        });

        showToast("success", "מחיר המוצר עודכן בהצלחה");
      } else {
        await createServiceProduct({
          categoryId: selectedCategory.categoryId,
          productName: formData.productName,
          durationMinutes: formData.durationMinutes,
          ranchId,
          itemPrice: formData.itemPrice,
        });

        showToast("success", "המוצר נוצר בהצלחה");
      }

      closeModal();
      await loadDashboard();

      if (historyOpen && historyProduct?.productId === editItem?.productId) {
        await openHistory(historyProduct);
      }
    } catch (err) {
      console.error(err);

      const errorMessage =
        err.response?.data?.title ||
        err.response?.data?.message ||
        (typeof err.response?.data === "string" ? err.response.data : null) ||
        err.message ||
        "שגיאה בשמירת המוצר";

      setError(errorMessage);
    }
  }

  function handleDelete(item) {
    setConfirmDialog({
      isOpen: true,
      title: "מחיקת מוצר",
      message: `האם את בטוחה שברצונך למחוק את "${item.productName}"?`,
      onConfirm: async function () {
        try {
          await deleteServiceProduct(item.productId);
          closeConfirmDialog();
          showToast("success", "המוצר נמחק בהצלחה");
          await loadDashboard();

          if (historyOpen && historyProduct?.productId === item.productId) {
            closeHistory();
          }
        } catch (err) {
          console.error(err);
          closeConfirmDialog();
          showToast("error", err.response?.data || "שגיאה במחיקת המוצר");
        }
      },
    });
  }

  function handleDeactivate(item) {
    setConfirmDialog({
      isOpen: true,
      title: "השבתת מוצר",
      message: `האם להשבית את "${item.productName}" עבור החווה הפעילה?`,
      onConfirm: async function () {
        try {
          await deactivateServiceProduct(item.productId, ranchId);
          closeConfirmDialog();
          showToast("success", "המוצר הושבת בהצלחה");
          await loadDashboard();

          if (historyOpen && historyProduct?.productId === item.productId) {
            await openHistory(item);
          }
        } catch (err) {
          console.error(err);
          closeConfirmDialog();
          showToast("error", err.response?.data || "שגיאה בהשבתת המוצר");
        }
      },
    });
  }

  function handleActivate(item) {
    setConfirmDialog({
      isOpen: true,
      title: "הפעלת מוצר",
      message: `האם להפעיל מחדש את "${item.productName}" עם המחיר האחרון השמור?`,
      onConfirm: async function () {
        try {
          await activateServiceProduct(item.productId, ranchId);
          closeConfirmDialog();
          showToast("success", "המוצר הופעל בהצלחה");
          await loadDashboard();

          if (historyOpen && historyProduct?.productId === item.productId) {
            await openHistory(item);
          }
        } catch (err) {
          console.error(err);
          closeConfirmDialog();
          showToast("error", err.response?.data || "שגיאה בהפעלת המוצר");
        }
      },
    });
  }

  function handleActivateHistoryItem(historyItem) {
    setConfirmDialog({
      isOpen: true,
      title: "הפעלת מחיר מההיסטוריה",
      message: "האם להפעיל את המחיר שנבחר כמחיר הפעיל של המוצר?",
      onConfirm: async function () {
        try {
          await activateServicePriceHistoryItem(historyItem.catalogItemId, ranchId);
          closeConfirmDialog();
          showToast("success", "המחיר הופעל בהצלחה");
          await loadDashboard();

          if (historyProduct) {
            await openHistory(historyProduct);
          }
        } catch (err) {
          console.error(err);
          closeConfirmDialog();
          showToast("error", err.response?.data || "שגיאה בהפעלת המחיר");
        }
      },
    });
  }

  return {
    ranchId,
    sections: filteredSections,
    loading,
    search,
    setSearch,
    modalOpen,
    editItem,
    selectedCategory,
    error,
    historyOpen,
    historyLoading,
    historyItems,
    historyProduct,
    confirmDialog,
    toast,
    openCreate,
    openEdit,
    closeModal,
    openHistory,
    closeHistory,
    closeConfirmDialog,
    closeToast,
    handleSubmit,
    handleDelete,
    handleDeactivate,
    handleActivate,
    handleActivateHistoryItem,
  };
}