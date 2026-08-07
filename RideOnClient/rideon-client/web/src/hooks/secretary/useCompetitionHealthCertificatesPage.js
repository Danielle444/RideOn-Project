import { useEffect, useState } from "react";
import {
  getHealthCertificates,
  approveHealthCertificate,
  rejectHealthCertificate,
} from "../../services/healthCertificateService";
import {
  HEALTH_CERTIFICATE_TABS,
  DEFAULT_HEALTH_CERTIFICATE_TAB,
  countHealthCertificatesByTab,
  filterHealthCertificates,
} from "../../utils/healthCertificateStatus.utils";

// Both failures are reported with a fixed Hebrew sentence. Nothing from the
// response body reaches the screen: the endpoint can surface database text,
// Supabase URLs and English SP messages, none of which belong in front of a
// secretary.
const LOAD_ERROR_MESSAGE = "אירעה שגיאה בטעינת תעודות הבריאות. יש לנסות שוב.";
const APPROVE_ERROR_MESSAGE = "אירעה שגיאה באישור תעודת הבריאות";
const REJECT_ERROR_MESSAGE = "אירעה שגיאה בדחיית תעודת הבריאות";
const REJECT_REASON_REQUIRED_MESSAGE = "יש להזין סיבת דחייה";

export default function useCompetitionHealthCertificatesPage(options) {
  const competitionId = options.competitionId;
  const ranchId = options.ranchId;

  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [actionLoadingKey, setActionLoadingKey] = useState(null);
  const [toast, setToast] = useState({
    isOpen: false,
    type: "success",
    message: "",
  });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    cert: null,
    reason: "",
    error: "",
  });

  const [activeTab, setActiveTab] = useState(DEFAULT_HEALTH_CERTIFICATE_TAB);
  const [searchText, setSearchText] = useState("");

  useEffect(
    function () {
      if (!competitionId) return;
      if (!ranchId) return;
      loadCertificates();
    },
    [competitionId, ranchId],
  );

  function showToast(type, message) {
    setToast({ isOpen: true, type: type, message: message });
  }

  function closeToast() {
    setToast(function (prev) {
      return { ...prev, isOpen: false };
    });
  }

  async function loadCertificates() {
    try {
      setLoading(true);
      setLoadError(false);
      const response = await getHealthCertificates(competitionId, ranchId);
      setCertificates(response.data?.data || []);
    } catch {
      // A failed request is NOT an empty competition. Without this the page
      // rendered "אין סוסים רשומים לתחרות זו" for a 403, a 500 or a dropped
      // connection alike.
      setCertificates([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  function handleApproveClick(cert) {
    setConfirmDialog({
      isOpen: true,
      title: "אישור תעודת בריאות",
      message: `האם לאשר את תעודת הבריאות של ${cert.horseName}?`,
      onConfirm: async function () {
        const key = `${cert.horseId}-${competitionId}`;
        try {
          setActionLoadingKey(key);
          await approveHealthCertificate(cert.horseId, competitionId, ranchId);
          closeConfirmDialog();
          await loadCertificates();
        } catch {
          showToast("error", APPROVE_ERROR_MESSAGE);
        } finally {
          setActionLoadingKey(null);
        }
      },
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

  function openRejectModal(cert) {
    setRejectModal({ isOpen: true, cert: cert, reason: "", error: "" });
  }

  function closeRejectModal() {
    setRejectModal({ isOpen: false, cert: null, reason: "", error: "" });
  }

  function setRejectReason(reason) {
    setRejectModal(function (prev) {
      return { ...prev, reason: reason, error: "" };
    });
  }

  function isRejectSubmitting() {
    if (!rejectModal.cert) {
      return false;
    }

    const key = `${rejectModal.cert.horseId}-${competitionId}`;

    return actionLoadingKey === key;
  }

  // Reuses actionLoadingKey - the same busy-row guard the approve flow
  // already relies on - rather than a second, parallel in-flight mechanism.
  async function submitReject(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    const cert = rejectModal.cert;

    if (!cert) {
      return;
    }

    if (!rejectModal.reason.trim()) {
      setRejectModal(function (prev) {
        return { ...prev, error: REJECT_REASON_REQUIRED_MESSAGE };
      });
      return;
    }

    const key = `${cert.horseId}-${competitionId}`;

    if (actionLoadingKey) {
      return;
    }

    try {
      setActionLoadingKey(key);
      await rejectHealthCertificate(
        cert.horseId,
        competitionId,
        ranchId,
        rejectModal.reason.trim(),
      );
      closeRejectModal();
      showToast("success", "תעודת הבריאות נדחתה");
      await loadCertificates();
    } catch {
      setRejectModal(function (prev) {
        return { ...prev, error: REJECT_ERROR_MESSAGE };
      });
    } finally {
      setActionLoadingKey(null);
    }
  }

  const tabCounts = countHealthCertificatesByTab(certificates);

  const tabs = HEALTH_CERTIFICATE_TABS.map(function (tab) {
    return {
      key: tab.key,
      label: tab.label,
      count: tabCounts[tab.key],
    };
  });

  const visibleCertificates = filterHealthCertificates(
    certificates,
    activeTab,
    searchText,
  );

  const hasCertificatesInActiveTab = tabCounts[activeTab] > 0;
  const hasActiveSearch = searchText.trim() !== "";

  return {
    certificates: certificates,
    visibleCertificates: visibleCertificates,
    loading: loading,
    loadError: loadError,
    actionLoadingKey: actionLoadingKey,

    toast: toast,
    closeToast: closeToast,
    confirmDialog: confirmDialog,
    closeConfirmDialog: closeConfirmDialog,

    rejectModal: rejectModal,
    openRejectModal: openRejectModal,
    closeRejectModal: closeRejectModal,
    setRejectReason: setRejectReason,
    submitReject: submitReject,
    isRejectSubmitting: isRejectSubmitting(),

    tabs: tabs,
    activeTab: activeTab,
    setActiveTab: setActiveTab,
    searchText: searchText,
    setSearchText: setSearchText,
    hasCertificatesInActiveTab: hasCertificatesInActiveTab,
    hasActiveSearch: hasActiveSearch,

    loadCertificates: loadCertificates,
    handleApproveClick: handleApproveClick,

    LOAD_ERROR_MESSAGE: LOAD_ERROR_MESSAGE,
  };
}
