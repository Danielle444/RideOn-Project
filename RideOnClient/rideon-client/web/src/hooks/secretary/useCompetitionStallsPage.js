import { useState, useEffect, useCallback } from "react";
import {
  getCompounds,
  saveLayout,
  getHorses,
  getAssignments,
  assignHorse,
  unassignHorse,
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

export default function useCompetitionStallsPage(competitionId, ranchId) {
  const [compounds, setCompounds] = useState([]);
  const [horses, setHorses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeCompoundId, setActiveCompoundId] = useState(null);

  const load = useCallback(
    async function () {
      if (!competitionId || !ranchId) return;

      setLoading(true);
      setError("");

      try {
        const [compRes, horseRes, assignRes] = await Promise.all([
          getCompounds(ranchId),
          getHorses(competitionId, ranchId),
          getAssignments(competitionId, ranchId),
        ]);

        const compoundList = normalizeCompounds(compRes.data);

        setCompounds(compoundList);
        setHorses(Array.isArray(horseRes.data) ? horseRes.data : []);
        setAssignments(Array.isArray(assignRes.data) ? assignRes.data : []);

        if (compoundList.length > 0) {
          setActiveCompoundId(function (prev) {
            return prev || compoundList[0].compoundId;
          });
        }
      } catch {
        setError("שגיאה בטעינת נתוני המפה");
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

  async function handleAssign(cell, horse) {
    const compound = compounds.find(function (c) {
      return c.compoundId === activeCompoundId;
    });

    if (!compound) return;

    try {
      await assignHorse(
        competitionId,
        ranchId,
        compound.compoundId,
        cell.stallId,
        horse.horseId,
      );

      setAssignments(function (prev) {
        const filtered = prev
          .filter(function (a) {
            return !(
              a.compoundId === compound.compoundId && a.stallId === cell.stallId
            );
          })
          .filter(function (a) {
            return a.horseId !== horse.horseId;
          });

        return [
          ...filtered,
          {
            compoundId: compound.compoundId,
            stallId: cell.stallId,
            stallNumber: cell.stallNumber,
            horseId: horse.horseId,
            horseName: horse.horseName,
            barnName: horse.barnName,
          },
        ];
      });
    } catch {
      setError("שגיאה בשיבוץ הסוס");
    }
  }

  async function handleUnassign(cell) {
    const compound = compounds.find(function (c) {
      return c.compoundId === activeCompoundId;
    });

    if (!compound) return;

    try {
      await unassignHorse(
        competitionId,
        ranchId,
        compound.compoundId,
        cell.stallId,
      );

      setAssignments(function (prev) {
        return prev.filter(function (a) {
          return !(
            a.compoundId === compound.compoundId && a.stallId === cell.stallId
          );
        });
      });
    } catch {
      setError("שגיאה בהסרת השיבוץ");
    }
  }

  const activeCompound = compounds.find(function (c) {
    return c.compoundId === activeCompoundId;
  });

  const activeAssignments = assignments.filter(function (a) {
    return a.compoundId === activeCompoundId;
  });

  return {
    compounds,
    horses,
    assignments,
    loading,
    saving,
    error,
    activeCompoundId,
    setActiveCompoundId,
    activeCompound,
    activeAssignments,
    handleLayoutParsed,
    handleAssign,
    handleUnassign,
    load,
  };
}
