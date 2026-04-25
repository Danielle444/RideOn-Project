import { useEffect, useState } from "react";
import {
  getArenasByRanchId,
  getCompoundsByRanchId,
  createArena,
  updateArena,
  deleteArena,
  createCompound,
  updateCompoundName,
  deleteCompound,
} from "../../services/arenasAndStallsService";

import { saveLayout } from "../../services/stallMapService";

import useToast from "../useToast";
import { getErrorText } from "../../utils/errorUtils";

export default function useArenasAndStallsPage(ranchId) {
  const [arenas, setArenas] = useState([]);
  const [compounds, setCompounds] = useState([]);
  const [loadingArenas, setLoadingArenas] = useState(false);
  const [loadingCompounds, setLoadingCompounds] = useState(false);

  const { showToast, closeToast } = useToast();

  useEffect(
    function () {
      if (!ranchId) return;
      loadArenas();
      loadCompounds();
    },
    [ranchId],
  );

  async function loadArenas() {
    try {
      setLoadingArenas(true);
      const res = await getArenasByRanchId(ranchId);
      setArenas(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(error);
      setArenas([]);
      showToast("error", "שגיאה בטעינת המגרשים");
    } finally {
      setLoadingArenas(false);
    }
  }

  async function loadCompounds() {
    try {
      setLoadingCompounds(true);
      const res = await getCompoundsByRanchId(ranchId);
      setCompounds(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(error);
      setCompounds([]);
      showToast("error", "שגיאה בטעינת המתחמים");
    } finally {
      setLoadingCompounds(false);
    }
  }


  async function handleCompoundLayoutParsed(compound, layout) {
    try {
      await saveLayout(ranchId, compound.compoundId, JSON.stringify(layout));
      showToast("success", "פריסת המתחם נשמרה בהצלחה");
      await loadCompounds();
    } catch (error) {
      console.error(error);
      showToast("error", getErrorText(error, "שגיאה בשמירת פריסת המתחם"));
    }
  }

  return {
    arenas,
    compounds,
    loadingArenas,
    loadingCompounds,
    loadArenas,
    loadCompounds,
    showToast,
    closeToast,
    handleCompoundLayoutParsed,
  };
}
