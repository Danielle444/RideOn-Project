import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getCompounds,
  saveLayout,
  getAssignmentOverview,
  getAssignments,
  assignStallBooking,
  unassignStallBooking,
  getPublishStatus,
  publishStallMap,
  unpublishStallMap,
} from "../../services/stallMapService";
import {
  secretaryDeleteStallBooking,
  secretaryUpdateStallBooking,
  secretaryCreateStallBookingForPayer,
} from "../../services/stallBookingsService";
import { getParticipatingRanches } from "../../services/competitionService";
import { getErrorMessage } from "../../utils/competitionForm.utils";

function parseLayout(layoutJson) {
  if (!layoutJson) return null;

  try {
    if (typeof layoutJson === "string") {
      return JSON.parse(layoutJson);
    }

    return layoutJson;
  } catch {
    return null;
  }
}

function normalizeCompounds(compounds) {
  if (!Array.isArray(compounds)) return [];

  return compounds.map(function (compound) {
    return {
      ...compound,
      layout: parseLayout(compound.layoutJson),
    };
  });
}

function getRanchGroups(items) {
  const groupsMap = {};

  items.forEach(function (item) {
    const ranchId = item.bookingRanchId || 0;
    const ranchName = item.bookingRanchName || "חווה לא ידועה";

    if (!groupsMap[ranchId]) {
      groupsMap[ranchId] = {
        ranchId: ranchId,
        ranchName: ranchName,
        items: [],
      };
    }

    groupsMap[ranchId].items.push(item);
  });

  return Object.values(groupsMap).sort(function (a, b) {
    return a.ranchName.localeCompare(b.ranchName, "he");
  });
}

function getDefaultSelectedRanchId(items) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const firstItem = items[0];

  return firstItem.bookingRanchId || null;
}

export default function useCompetitionStallsPage(competitionId, ranchId) {
  const [compounds, setCompounds] = useState([]);
  const [overviewItems, setOverviewItems] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [participatingRanches, setParticipatingRanches] = useState([]);

  const [publishStatus, setPublishStatus] = useState(null);
  const [publishLoading, setPublishLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [activeCompoundId, setActiveCompoundId] = useState(null);
  const [mode, setMode] = useState("overview");
  const [selectedRanchId, setSelectedRanchId] = useState(null);

  const load = useCallback(
    async function () {
      if (!competitionId || !ranchId) return;

      setLoading(true);
      setError("");

      try {
        const results = await Promise.all([
          getCompounds(ranchId),
          getAssignmentOverview(competitionId, ranchId),
          getAssignments(competitionId, ranchId),
          getPublishStatus(competitionId, ranchId),
          // Participating-ranch source for the create-booking ranch pickers
          // (HostSecretary cross-ranch fix). Guarded with its own catch so a
          // failure here degrades the create-modal's ranch options rather
          // than blanking the whole stalls page.
          getParticipatingRanches(competitionId, ranchId).catch(function () {
            return { data: [] };
          }),
        ]);

        const compoundList = normalizeCompounds(results[0].data);
        const overviewList = Array.isArray(results[1].data)
          ? results[1].data
          : [];
        const assignmentList = Array.isArray(results[2].data)
          ? results[2].data
          : [];
        const publishStatusData = results[3].data || null;
        const participatingRanchesList = Array.isArray(results[4].data)
          ? results[4].data
          : [];

        setCompounds(compoundList);
        setOverviewItems(overviewList);
        setAssignments(assignmentList);
        setPublishStatus(publishStatusData);
        setParticipatingRanches(participatingRanchesList);

        if (compoundList.length > 0) {
          setActiveCompoundId(function (prev) {
            return prev || compoundList[0].compoundId;
          });
        }

        setSelectedRanchId(function (prev) {
          return prev || getDefaultSelectedRanchId(overviewList);
        });
      } catch {
        setError("שגיאה בטעינת נתוני התאים");
      } finally {
        setLoading(false);
      }
    },
    [competitionId, ranchId],
  );

  useEffect(
    function () {
      load();
    },
    [load],
  );

  async function handleLayoutParsed(compound, layout) {
    setSaving(true);
    setError("");

    try {
      await saveLayout(ranchId, compound.compoundId, JSON.stringify(layout));

      const compRes = await getCompounds(ranchId);
      const compoundList = normalizeCompounds(compRes.data);

      setCompounds(compoundList);
      setActiveCompoundId(compound.compoundId);
    } catch (err) {
      setError(getErrorMessage(err, "שגיאה בשמירת הפריסה"));
    } finally {
      setSaving(false);
    }
  }

  async function refreshAssignmentsAndOverview() {
    const results = await Promise.all([
      getAssignmentOverview(competitionId, ranchId),
      getAssignments(competitionId, ranchId),
    ]);

    setOverviewItems(Array.isArray(results[0].data) ? results[0].data : []);
    setAssignments(Array.isArray(results[1].data) ? results[1].data : []);
  }

  async function handleAssign(cell, item) {
    const compound = compounds.find(function (currentCompound) {
      return currentCompound.compoundId === activeCompoundId;
    });

    if (!compound || !item || !item.stallBookingId) return;

    const previousAssignments = assignments;
    const previousOverviewItems = overviewItems;

    const priorAssignment = previousAssignments.find(function (assignment) {
      return assignment.stallBookingId === item.stallBookingId;
    });

    const optimisticAssignment = {
      assignmentId: priorAssignment ? priorAssignment.assignmentId : null,
      stallBookingId: item.stallBookingId,
      compoundId: compound.compoundId,
      stallId: cell.stallId,
      stallNumber: cell.stallNumber,
      bookingRanchId: item.bookingRanchId,
      bookingRanchName: item.bookingRanchName,
      horseId: item.horseId,
      horseName: item.horseName,
      barnName: item.barnName,
      isForTack: item.isForTack,
      productName: item.productName,
    };

    setAssignments(
      previousAssignments
        .filter(function (assignment) {
          return assignment.stallBookingId !== item.stallBookingId;
        })
        .concat(optimisticAssignment),
    );

    setOverviewItems(
      previousOverviewItems.map(function (overviewItem) {
        if (overviewItem.stallBookingId !== item.stallBookingId) {
          return overviewItem;
        }

        return {
          ...overviewItem,
          isAssigned: true,
          assignedCompoundId: compound.compoundId,
          assignedStallId: cell.stallId,
          assignedStallNumber: cell.stallNumber,
        };
      }),
    );

    try {
      await assignStallBooking(
        competitionId,
        ranchId,
        compound.compoundId,
        cell.stallId,
        item.stallBookingId,
      );

      await refreshAssignmentsAndOverview();
    } catch (err) {
      setAssignments(previousAssignments);
      setOverviewItems(previousOverviewItems);
      setError(getErrorMessage(err, "שגיאה בשיבוץ הזמנת התא"));
    }
  }

  async function handleUnassign(cell) {
    const compound = compounds.find(function (currentCompound) {
      return currentCompound.compoundId === activeCompoundId;
    });

    if (!compound) return;

    try {
      await unassignStallBooking(
        competitionId,
        ranchId,
        compound.compoundId,
        cell.stallId,
      );

      await refreshAssignmentsAndOverview();
    } catch (err) {
      setError(getErrorMessage(err, "שגיאה בהסרת השיבוץ"));
    }
  }

  async function handlePublishStallMap(systemUserId) {
    if (!competitionId || !ranchId || !systemUserId) {
      setError("לא נמצאו פרטי משתמש לפרסום מפת התאים");
      return;
    }

    setPublishLoading(true);
    setError("");

    try {
      await publishStallMap(competitionId, ranchId, systemUserId);

      const response = await getPublishStatus(competitionId, ranchId);
      setPublishStatus(response.data || null);
    } catch (err) {
      setError(getErrorMessage(err, "שגיאה בפרסום מפת התאים"));
    } finally {
      setPublishLoading(false);
    }
  }

  async function handleUnpublishStallMap() {
    if (!competitionId || !ranchId) return;

    setPublishLoading(true);
    setError("");

    try {
      await unpublishStallMap(competitionId, ranchId);

      const response = await getPublishStatus(competitionId, ranchId);
      setPublishStatus(response.data || null);
    } catch (err) {
      setError(getErrorMessage(err, "שגיאה בביטול פרסום מפת התאים"));
    } finally {
      setPublishLoading(false);
    }
  }

  function openAssignmentMode() {
    setMode("assignment");

    if (!selectedRanchId) {
      setSelectedRanchId(getDefaultSelectedRanchId(overviewItems));
    }
  }

  function openOverviewMode() {
    setMode("overview");
  }

  const activeCompound = compounds.find(function (compound) {
    return compound.compoundId === activeCompoundId;
  });

  const activeAssignments = assignments.filter(function (assignment) {
    return assignment.compoundId === activeCompoundId;
  });

  const ranchGroups = useMemo(
    function () {
      return getRanchGroups(overviewItems);
    },
    [overviewItems],
  );

  const selectedRanchItems = overviewItems.filter(function (item) {
    return item.bookingRanchId === selectedRanchId;
  });

  return {
    compounds,
    overviewItems,
    assignments,

    publishStatus,
    publishLoading,
    handlePublishStallMap,
    handleUnpublishStallMap,

    loading,
    saving,
    error,

    activeCompoundId,
    setActiveCompoundId,
    activeCompound,
    activeAssignments,

    mode,
    setMode,
    openAssignmentMode,
    openOverviewMode,

    ranchGroups,
    participatingRanches,
    selectedRanchId,
    setSelectedRanchId,
    selectedRanchItems,

    handleLayoutParsed,
    handleAssign,
    handleUnassign,
    load,

    // Task 3: delete/update stall booking
    handleDeleteStallBooking,
    handleUpdateStallBooking,

    // Task 4: add stall for payer
    handleCreateStallBookingForPayer,
  };

  // Confirmation is owned by the page (CompetitionStallsPage.jsx), which
  // shows the shared ConfirmDialog before calling this - this function is
  // the unconditional action, not the confirm+action combo it used to be.
  async function handleDeleteStallBooking(stallBookingId) {
    await secretaryDeleteStallBooking(stallBookingId, ranchId);
    await refreshAssignmentsAndOverview();
  }

  async function handleUpdateStallBooking(stallBookingId, payload) {
    await secretaryUpdateStallBooking(stallBookingId, {
      stallBookingId: stallBookingId,
      ranchId: ranchId,
      newStartDate: payload.newStartDate,
      newEndDate: payload.newEndDate,
      notes: payload.notes,
      isForTack: payload.isForTack,
      horseId: payload.horseId,
    });
    await refreshAssignmentsAndOverview();
  }

  async function handleCreateStallBookingForPayer(payload) {
    // Ranch-model fix: the server derives the host ranch from competitionId
    // and never reads ranchId for this call -- it is intentionally not sent.
    // requestingRanchId is the guest/home ranch (required for tack, derived
    // from the horse otherwise) and is forwarded from the modal's payload.
    var res = await secretaryCreateStallBookingForPayer({
      competitionId: competitionId,
      payerPersonId: payload.payerPersonId,
      horseId: payload.horseId,
      startDate: payload.startDate,
      endDate: payload.endDate,
      isForTack: payload.isForTack,
      productId: payload.productId,
      notes: payload.notes,
      requestingRanchId: payload.requestingRanchId,
    });
    await refreshAssignmentsAndOverview();
    return res.data;
  }
}
