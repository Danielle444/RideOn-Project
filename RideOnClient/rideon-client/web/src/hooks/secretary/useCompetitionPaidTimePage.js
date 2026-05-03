import { useEffect, useMemo, useState } from "react";

import {
  getPaidTimeRequestsForAssignment,
  assignPaidTimeRequest,
  unassignPaidTimeRequest,
} from "../../services/paidTimeRequestService";

import {
  getPaidTimeSlotsByCompetitionId,
  getAllPaidTimeBaseSlots,
  createPaidTimeSlotInCompetition,
  updatePaidTimeSlotInCompetition,
  deletePaidTimeSlotInCompetition,
} from "../../services/paidTimeSlotInCompetitionService";

import { getArenasByRanchId } from "../../services/arenaService";
import { getErrorMessage } from "../../utils/competitionForm.utils";

/* =======================
   helpers
======================= */

function sortSlots(items) {
  return [...items].sort(function (a, b) {
    var aDate = a.slotDate || a.SlotDate || "";
    var bDate = b.slotDate || b.SlotDate || "";

    if (aDate !== bDate) {
      return String(aDate).localeCompare(String(bDate));
    }

    var aStart = a.startTime || a.StartTime || "";
    var bStart = b.startTime || b.StartTime || "";

    return String(aStart).localeCompare(String(bStart));
  });
}

function getSlotId(slot) {
  return slot.paidTimeSlotInCompId || slot.PaidTimeSlotInCompId;
}

function getSlotDate(slot) {
  return slot.slotDate || slot.SlotDate;
}

function getSlotStartTime(slot) {
  return slot.startTime || slot.StartTime;
}

function getSlotEndTime(slot) {
  return slot.endTime || slot.EndTime;
}

function parseTimeToMinutes(timeValue) {
  if (!timeValue) return 0;

  var parts = String(timeValue).split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function formatMinutesToTime(totalMinutes) {
  var hours = Math.floor(totalMinutes / 60);
  var minutes = totalMinutes % 60;

  return (
    String(hours).padStart(2, "0") +
    ":" +
    String(minutes).padStart(2, "0") +
    ":00"
  );
}

function getRequestId(request) {
  return request.paidTimeRequestId || request.PaidTimeRequestId;
}

function getAssignedOrder(request) {
  return request.assignedOrder || request.AssignedOrder;
}

function getEffectiveDuration(request) {
  return Number(
    request.effectiveDurationMinutes || request.EffectiveDurationMinutes || 11,
  );
}

/* =======================
   HOOK
======================= */

export default function useCompetitionPaidTimePage(options) {
  var competitionId = options.competitionId;
  var ranchId = options.ranchId;
  var onShowToast = options.onShowToast;

  var [slots, setSlots] = useState([]);
  var [requests, setRequests] = useState([]);

  var [arenas, setArenas] = useState([]);
  var [baseSlots, setBaseSlots] = useState([]);

  var [loadingSlots, setLoadingSlots] = useState(false);
  var [loadingRequests, setLoadingRequests] = useState(false);
  var [savingAssignment, setSavingAssignment] = useState(false);

  var [error, setError] = useState("");

  var [assignmentMode, setAssignmentMode] = useState(false);
  var [assignmentViewOpen, setAssignmentViewOpen] = useState(false);

  var [selectedSlotIds, setSelectedSlotIds] = useState([]);
  var [includeAllPending, setIncludeAllPending] = useState(false);

  var [activeRequest, setActiveRequest] = useState(null);

  /* ===== MODAL STATE ===== */
  var [paidTimeSlotModalOpen, setPaidTimeSlotModalOpen] = useState(false);
  var [editPaidTimeSlotItem, setEditPaidTimeSlotItem] = useState(null);
  var [savingPaidTimeSlot, setSavingPaidTimeSlot] = useState(false);
  var [paidTimeSlotModalError, setPaidTimeSlotModalError] = useState("");

  /* =======================
     LOAD
  ======================= */

  useEffect(
    function () {
      loadSlots();
      loadArenas();
      loadBaseSlots();
    },
    [competitionId, ranchId],
  );

  async function loadSlots() {
    if (!competitionId || !ranchId) return;

    try {
      setLoadingSlots(true);
      setError("");

      var response = await getPaidTimeSlotsByCompetitionId(
        competitionId,
        ranchId,
      );

      var items = Array.isArray(response.data) ? response.data : [];

      setSlots(sortSlots(items));
    } catch (error) {
      setError(getErrorMessage(error, "שגיאה בטעינת סלוטים"));
    } finally {
      setLoadingSlots(false);
    }
  }

  async function loadArenas() {
    try {
      var res = await getArenasByRanchId(ranchId);
      setArenas(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadBaseSlots() {
    if (!ranchId) {
      return;
    }

    try {
      var response = await getAllPaidTimeBaseSlots(ranchId);
      setBaseSlots(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
    }
  }

  /* =======================
     CRUD SLOTS
  ======================= */

  function openCreatePaidTimeSlotModal() {
    setEditPaidTimeSlotItem(null);
    setPaidTimeSlotModalOpen(true);
  }

  function openEditPaidTimeSlotModal(slot) {
    setEditPaidTimeSlotItem(slot);
    setPaidTimeSlotModalOpen(true);
  }

  function closePaidTimeSlotModal() {
    setPaidTimeSlotModalOpen(false);
    setEditPaidTimeSlotItem(null);
    setPaidTimeSlotModalError("");
  }

  async function handleSubmitPaidTimeSlot(data) {
    try {
      setSavingPaidTimeSlot(true);
      setPaidTimeSlotModalError("");

      if (editPaidTimeSlotItem) {
        await updatePaidTimeSlotInCompetition(
          getSlotId(editPaidTimeSlotItem),
          data,
        );
      } else {
        await createPaidTimeSlotInCompetition(data);
      }

      closePaidTimeSlotModal();
      await loadSlots();

      onShowToast?.("success", "הסלוט נשמר בהצלחה");
    } catch (err) {
      setPaidTimeSlotModalError(getErrorMessage(err));
    } finally {
      setSavingPaidTimeSlot(false);
    }
  }

  async function handleDeletePaidTimeSlot(slot) {
    if (!window.confirm("למחוק את הסלוט?")) {
      return;
    }

    try {
      await deletePaidTimeSlotInCompetition(
        getSlotId(slot),
        competitionId,
        ranchId,
        false,
      );

      await loadSlots();

      if (onShowToast) {
        onShowToast("success", "הסלוט נמחק בהצלחה");
      }
    } catch (err) {
      console.error("Delete paid time slot error:", err.response?.data || err);

      if (onShowToast) {
        onShowToast(
          "error",
          err.response?.data || "שגיאה במחיקת סלוט פייד־טיים",
        );
      }
    }
  }

  /* =======================
     ASSIGNMENT
  ======================= */

  function enterAssignmentMode(slotId) {
    setAssignmentMode(true);
    setAssignmentViewOpen(false);
    setRequests([]);
    setIncludeAllPending(false);

    if (slotId) {
      setSelectedSlotIds([slotId]);
    } else {
      setSelectedSlotIds([]);
    }
  }

  async function openAssignmentForSlot(slotId) {
    setAssignmentMode(true);
    setAssignmentViewOpen(false);
    setRequests([]);
    setIncludeAllPending(false);
    setSelectedSlotIds([slotId]);

    try {
      setLoadingRequests(true);

      var res = await getPaidTimeRequestsForAssignment(
        competitionId,
        ranchId,
        [slotId],
        false,
      );

      setRequests(res.data || []);
      setAssignmentViewOpen(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingRequests(false);
    }
  }

  function exitAssignmentMode() {
    setAssignmentMode(false);
    setAssignmentViewOpen(false);
    setSelectedSlotIds([]);
    setRequests([]);
    setActiveRequest(null);
  }

  function toggleSlotSelection(slotId) {
    setSelectedSlotIds((prev) =>
      prev.includes(slotId)
        ? prev.filter((id) => id !== slotId)
        : [...prev, slotId],
    );
  }

  async function loadRequests() {
    if (!competitionId || selectedSlotIds.length === 0) return;

    try {
      setLoadingRequests(true);

      var res = await getPaidTimeRequestsForAssignment(
        competitionId,
        ranchId,
        selectedSlotIds,
        includeAllPending,
      );

      setRequests(res.data || []);
      setAssignmentViewOpen(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingRequests(false);
    }
  }

  var selectedSlots = useMemo(
    () => slots.filter((s) => selectedSlotIds.includes(getSlotId(s))),
    [slots, selectedSlotIds],
  );

  var pendingRequests = useMemo(
    function () {
      return requests.filter(function (request) {
        return request.status === "Pending" || request.Status === "Pending";
      });
    },
    [requests],
  );

  var assignedRequests = useMemo(
    function () {
      return requests.filter(function (request) {
        return request.status === "Assigned" || request.Status === "Assigned";
      });
    },
    [requests],
  );

  function getAssignedRequestsForSlot(slotId) {
    return assignedRequests
      .filter(function (request) {
        var assignedSlotId =
          request.assignedCompSlotId ?? request.AssignedCompSlotId;

        return Number(assignedSlotId) === Number(slotId);
      })
      .sort(function (a, b) {
        return (
          Number(getAssignedOrder(a) || 0) - Number(getAssignedOrder(b) || 0)
        );
      });
  }

  function buildTimeCellsForSlot(slot, assigned) {
    var start = parseTimeToMinutes(getSlotStartTime(slot));
    var end = parseTimeToMinutes(getSlotEndTime(slot));

    var effectiveEnd = end - 10;
    var cells = [];
    var current = start;
    var order = 1;

    assigned.forEach(function (req) {
      var duration = getEffectiveDuration(req);

      cells.push({
        slotId: getSlotId(slot),
        label: formatMinutesToTime(current).substring(0, 5),
        assignedOrder: order,
        assignment: req,
      });

      current += duration;
      order++;
    });

    while (current + 11 <= effectiveEnd) {
      cells.push({
        slotId: getSlotId(slot),
        label: formatMinutesToTime(current).substring(0, 5),
        assignedOrder: order,
        assignment: null,
      });

      current += 11;
      order++;
    }

    return cells;
  }

  function handleDragStart(event) {
    var request = event.active.data.current?.request;

    if (request) {
      setActiveRequest(request);
    }
  }

  async function handleDragEnd(event) {
    var request = event.active.data.current?.request;
    var timeCell = event.over?.data.current?.timeCell;

    setActiveRequest(null);

    if (!request || !timeCell) {
      return;
    }

    await handleAssignRequest(
      getRequestId(request),
      timeCell.slotId,
      timeCell.assignedOrder,
    );
  }

  async function handleAssignRequest(requestId, slotId, order) {
    await assignPaidTimeRequest({
      ranchId,
      paidTimeRequestId: requestId,
      assignedCompSlotId: slotId,
      assignedOrder: order,
    });

    await loadRequests();
    await loadSlots();

    onShowToast?.("success", "שובץ בהצלחה");
  }

  async function handleUnassignRequest(requestId) {
    await unassignPaidTimeRequest({
      ranchId,
      paidTimeRequestId: requestId,
    });

    await loadRequests();
    await loadSlots(); 

    onShowToast?.("success", "הוסר שיבוץ");
  }

  /* =======================
     RETURN
  ======================= */

  return {
    slots,
    requests,
    selectedSlots,
    pendingRequests,
    assignedRequests,

    arenas,
    baseSlots,

    loadingSlots,
    loadingRequests,
    savingAssignment,

    error,
    assignmentMode,
    assignmentViewOpen,
    selectedSlotIds,
    includeAllPending,
    activeRequest,

    /* modal */
    paidTimeSlotModalOpen,
    editPaidTimeSlotItem,
    savingPaidTimeSlot,
    paidTimeSlotModalError,

    openCreatePaidTimeSlotModal,
    openEditPaidTimeSlotModal,
    closePaidTimeSlotModal,
    handleSubmitPaidTimeSlot,
    handleDeletePaidTimeSlot,

    /* assignment */
    setIncludeAllPending,
    enterAssignmentMode,
    exitAssignmentMode,
    toggleSlotSelection,
    loadSlots,
    loadRequests,
    getAssignedRequestsForSlot,
    buildTimeCellsForSlot,
    handleDragStart,
    handleDragEnd,
    handleAssignRequest,
    handleUnassignRequest,
    openAssignmentForSlot,
  };
}
