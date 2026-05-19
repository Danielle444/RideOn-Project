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
        ]);

        const compoundList = normalizeCompounds(results[0].data);
        const overviewList = Array.isArray(results[1].data)
          ? results[1].data
          : [];
        const assignmentList = Array.isArray(results[2].data)
          ? results[2].data
          : [];
        const publishStatusData = results[3].data || null;

        setCompounds(compoundList);
        setOverviewItems(overviewList);
        setAssignments(assignmentList);
        setPublishStatus(publishStatusData);

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
    } catch {
      setError("שגיאה בשמירת הפריסה");
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

    try {
      await assignStallBooking(
        competitionId,
        ranchId,
        compound.compoundId,
        cell.stallId,
        item.stallBookingId,
      );

      await refreshAssignmentsAndOverview();
    } catch {
      setError("שגיאה בשיבוץ הזמנת התא");
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
    } catch {
      setError("שגיאה בהסרת השיבוץ");
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
    } catch {
      setError("שגיאה בפרסום מפת התאים");
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
    } catch {
      setError("שגיאה בביטול פרסום מפת התאים");
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
    selectedRanchId,
    setSelectedRanchId,
    selectedRanchItems,

    handleLayoutParsed,
    handleAssign,
    handleUnassign,
    load,
  };
}
