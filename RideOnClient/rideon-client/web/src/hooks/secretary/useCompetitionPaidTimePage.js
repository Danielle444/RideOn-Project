import { useEffect, useMemo, useState } from "react";
import { getPaidTimeSlotsByCompetitionId } from "../../services/paidTimeSlotInCompetitionService";
import {
  getPaidTimeRequestsForAssignment,
  assignPaidTimeRequest,
  unassignPaidTimeRequest,
} from "../../services/paidTimeRequestService";
import { getErrorMessage } from "../../utils/competitionForm.utils";

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
  if (!timeValue) {
    return 0;
  }

  var parts = String(timeValue).split(":");
  var hours = Number(parts[0] || 0);
  var minutes = Number(parts[1] || 0);

  return hours * 60 + minutes;
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
    request.effectiveDurationMinutes ||
      request.EffectiveDurationMinutes ||
      11,
  );
}

export default function useCompetitionPaidTimePage(options) {
  var competitionId = options.competitionId;
  var ranchId = options.ranchId;
  var onShowToast = options.onShowToast;

  var [slots, setSlots] = useState([]);
  var [requests, setRequests] = useState([]);

  var [loadingSlots, setLoadingSlots] = useState(false);
  var [loadingRequests, setLoadingRequests] = useState(false);
  var [savingAssignment, setSavingAssignment] = useState(false);

  var [error, setError] = useState("");
  var [assignmentMode, setAssignmentMode] = useState(false);
  var [assignmentViewOpen, setAssignmentViewOpen] = useState(false);
  var [selectedSlotIds, setSelectedSlotIds] = useState([]);
  var [includeAllPending, setIncludeAllPending] = useState(false);
  var [activeRequest, setActiveRequest] = useState(null);

  useEffect(
    function () {
      loadSlots();
    },
    [competitionId, ranchId],
  );

  async function loadSlots() {
    if (!competitionId || !ranchId) {
      return;
    }

    try {
      setLoadingSlots(true);
      setError("");

      var response = await getPaidTimeSlotsByCompetitionId(competitionId, ranchId);
      var items = Array.isArray(response.data) ? response.data : [];

      setSlots(sortSlots(items));
    } catch (error) {
      console.error(error);
      setError(getErrorMessage(error, "שגיאה בטעינת סלוטי פייד־טיים"));
    } finally {
      setLoadingSlots(false);
    }
  }

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

  function exitAssignmentMode() {
    setAssignmentMode(false);
    setAssignmentViewOpen(false);
    setSelectedSlotIds([]);
    setRequests([]);
    setIncludeAllPending(false);
    setActiveRequest(null);
  }

  function toggleSlotSelection(slotId) {
    setSelectedSlotIds(function (prev) {
      if (prev.includes(slotId)) {
        return prev.filter(function (id) {
          return id !== slotId;
        });
      }

      return [...prev, slotId];
    });
  }

  async function loadRequests() {
    if (!competitionId || !ranchId || selectedSlotIds.length === 0) {
      return;
    }

    try {
      setLoadingRequests(true);
      setError("");

      var response = await getPaidTimeRequestsForAssignment(
        competitionId,
        ranchId,
        selectedSlotIds,
        includeAllPending,
      );

      setRequests(Array.isArray(response.data) ? response.data : []);
      setAssignmentViewOpen(true);
    } catch (error) {
      console.error(error);
      setError(getErrorMessage(error, "שגיאה בטעינת בקשות פייד־טיים"));
    } finally {
      setLoadingRequests(false);
    }
  }

  var selectedSlots = useMemo(
    function () {
      return slots.filter(function (slot) {
        return selectedSlotIds.includes(getSlotId(slot));
      });
    },
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
        return (
          Number(request.assignedCompSlotId || request.AssignedCompSlotId) ===
          Number(slotId)
        );
      })
      .sort(function (a, b) {
        return Number(getAssignedOrder(a) || 0) - Number(getAssignedOrder(b) || 0);
      });
  }

  function buildTimeCellsForSlot(slot, assignedRequestsForSlot) {
    var slotStart = parseTimeToMinutes(getSlotStartTime(slot));
    var slotEnd = parseTimeToMinutes(getSlotEndTime(slot));
    var defaultDuration = 11;

    var assignedByOrder = {};
    var assignedItems = Array.isArray(assignedRequestsForSlot)
      ? assignedRequestsForSlot
      : [];

    assignedItems.forEach(function (request) {
      var order = Number(getAssignedOrder(request));

      if (order > 0) {
        assignedByOrder[order] = request;
      }
    });

    var activeDuration = activeRequest
      ? getEffectiveDuration(activeRequest)
      : defaultDuration;

    var cells = [];
    var current = slotStart;
    var order = 1;
    var maxAssignedOrder = assignedItems.length + 1;

    while (current < slotEnd) {
      var assignment = assignedByOrder[order] || null;
      var duration = assignment ? getEffectiveDuration(assignment) : activeDuration;

      if (current + duration > slotEnd) {
        break;
      }

      var timeValue = formatMinutesToTime(current);

      cells.push({
        slotId: getSlotId(slot),
        slotDate: getSlotDate(slot),
        timeValue: timeValue,
        label: timeValue.substring(0, 5),
        assignedOrder: order,
        assignment: assignment,
      });

      current += duration;
      order += 1;

      if (order > maxAssignedOrder + 20) {
        break;
      }
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

  async function handleAssignRequest(requestId, slotId, assignedOrder) {
    try {
      setSavingAssignment(true);

      await assignPaidTimeRequest({
        ranchId: ranchId,
        paidTimeRequestId: requestId,
        assignedCompSlotId: slotId,
        assignedOrder: assignedOrder,
      });

      if (onShowToast) {
        onShowToast("success", "השיבוץ בוצע בהצלחה");
      }

      await loadRequests();
    } catch (error) {
      console.error(error);

      if (onShowToast) {
        onShowToast(
          "error",
          getErrorMessage(error, "אירעה שגיאה בשיבוץ בקשת פייד־טיים"),
        );
      }
    } finally {
      setSavingAssignment(false);
    }
  }

  async function handleUnassignRequest(requestId) {
    try {
      setSavingAssignment(true);

      await unassignPaidTimeRequest({
        ranchId: ranchId,
        paidTimeRequestId: requestId,
      });

      if (onShowToast) {
        onShowToast("success", "השיבוץ בוטל בהצלחה");
      }

      await loadRequests();
    } catch (error) {
      console.error(error);

      if (onShowToast) {
        onShowToast(
          "error",
          getErrorMessage(error, "שגיאה בביטול שיבוץ פייד־טיים"),
        );
      }
    } finally {
      setSavingAssignment(false);
    }
  }

  return {
    slots,
    requests,
    selectedSlots,
    pendingRequests,
    assignedRequests,
    loadingSlots,
    loadingRequests,
    savingAssignment,
    error,
    assignmentMode,
    assignmentViewOpen,
    selectedSlotIds,
    includeAllPending,
    activeRequest,

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
    handleUnassignRequest,
  };
}