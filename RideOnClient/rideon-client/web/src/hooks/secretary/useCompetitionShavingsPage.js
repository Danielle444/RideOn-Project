// Secretary shavings page hook — Spec 2 (component-structure.md).
//
// Owns everything: data assembly (R1 rollup + per-ranch R2 loop), derived status tagging,
// URL-bound grouping/filters, SLA needs-attention, and the add-order modal surface. The page
// stays presentational.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { getCompetitionSummaryShavingsDetails } from "../../services/competitionSummaryService";
import {
  getShavingsOrdersForCompetitionAndRanch,
  secretaryCancelShavingsOrder,
} from "../../services/shavingsOrderService";
import {
  deriveShavingsStatus,
  getValue,
} from "../../utils/shavingsStatus.utils";
import { isDelayed } from "../../utils/shavingsSla.utils";
import {
  groupByRanch,
  groupByStatus,
} from "../../utils/shavingsGrouping.utils";
import { getErrorMessage } from "../../utils/competitionForm.utils";

const VALID_GROUPS = ["ranch", "status"];
const VALID_STATUSES = ["Pending", "Seen", "Delivered"];

function rollupRanchId(row) {
  return getValue(row, "bookingRanchId", "BookingRanchId", null);
}

function rollupRanchName(row) {
  return getValue(row, "bookingRanchName", "BookingRanchName", "חווה");
}

export default function useCompetitionShavingsPage(competitionId, ranchId) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ranchRollup, setRanchRollup] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelError, setCancelError] = useState(null);

  // ---- URL state (CAP-2) ----
  const rawGroup = searchParams.get("group");
  const group = VALID_GROUPS.indexOf(rawGroup) === -1 ? "ranch" : rawGroup;

  const rawStatus = searchParams.get("status");
  const filterStatus =
    VALID_STATUSES.indexOf(rawStatus) === -1 ? null : rawStatus;

  const filterRanch = searchParams.get("ranch");

  const updateParams = useCallback(
    function (mutate) {
      setSearchParams(
        function (prev) {
          const next = new URLSearchParams(prev);
          mutate(next);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setGroup = useCallback(
    function (nextGroup) {
      updateParams(function (params) {
        if (nextGroup === "ranch") {
          params.delete("group");
        } else {
          params.set("group", nextGroup);
        }
      });
    },
    [updateParams],
  );

  const setFilterRanch = useCallback(
    function (nextRanch) {
      updateParams(function (params) {
        if (nextRanch === null || nextRanch === undefined || nextRanch === "") {
          params.delete("ranch");
        } else {
          params.set("ranch", String(nextRanch));
        }
      });
    },
    [updateParams],
  );

  const setFilterStatus = useCallback(
    function (nextStatus) {
      updateParams(function (params) {
        if (!nextStatus) {
          params.delete("status");
        } else {
          params.set("status", nextStatus);
        }
      });
    },
    [updateParams],
  );

  // ---- Data assembly (read-model.md) ----
  const reload = useCallback(
    async function () {
      if (!competitionId || !ranchId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const rollupResponse = await getCompetitionSummaryShavingsDetails(
          competitionId,
          ranchId,
        );

        const rollup = Array.isArray(rollupResponse.data)
          ? rollupResponse.data
          : [];

        setRanchRollup(rollup);

        // Enumerate participating ranches from the rollup; loop R2 per ranch in parallel.
        // allSettled (not all): a single ranch's request failing must not blank the whole
        // page. Render every ranch that loaded and drop the ones that errored, so one bad
        // response degrades gracefully instead of bouncing the secretary off the screen.
        const perRanchSettled = await Promise.allSettled(
          rollup.map(function (row) {
            const bookingRanchId = rollupRanchId(row);

            return getShavingsOrdersForCompetitionAndRanch(
              competitionId,
              bookingRanchId,
            ).then(function (response) {
              const rows = Array.isArray(response.data) ? response.data : [];

              return rows.map(function (order) {
                return {
                  ...order,
                  participatingRanchId: bookingRanchId,
                  participatingRanchName: rollupRanchName(row),
                  derivedStatus: deriveShavingsStatus(order),
                };
              });
            });
          }),
        );

        setOrders(
          perRanchSettled.reduce(function (all, settled) {
            if (settled.status === "fulfilled") {
              return all.concat(settled.value);
            }

            return all;
          }, []),
        );
      } catch (err) {
        setError(err);
        setOrders([]);
        setRanchRollup([]);
      } finally {
        setLoading(false);
      }
    },
    [competitionId, ranchId],
  );

  useEffect(
    function () {
      reload();
    },
    [reload],
  );

  // ---- Filters applied before grouping (needs-attention ignores them, per CAP-4) ----
  const filteredOrders = useMemo(
    function () {
      return orders.filter(function (order) {
        if (
          filterRanch &&
          String(order.participatingRanchId) !== String(filterRanch)
        ) {
          return false;
        }

        if (filterStatus && order.derivedStatus !== filterStatus) {
          return false;
        }

        return true;
      });
    },
    [orders, filterRanch, filterStatus],
  );

  const groups = useMemo(
    function () {
      if (group === "status") {
        return groupByStatus(filteredOrders);
      }

      return groupByRanch(filteredOrders, ranchRollup);
    },
    [group, filteredOrders, ranchRollup],
  );

  const needsAttention = useMemo(
    function () {
      const now = Date.now();

      return orders.filter(function (order) {
        return isDelayed(order, now);
      });
    },
    [orders],
  );

  // Ranch options for the add-order dropdown: the participating ranches from the rollup, plus
  // the host ranch (always priced) so an order can be created before any order exists yet.
  const ranchOptions = useMemo(
    function () {
      const seen = new Set();
      const options = [];

      // Rollup ranches first — they carry names.
      ranchRollup.forEach(function (row) {
        const id = rollupRanchId(row);

        if (id === null || id === undefined || seen.has(String(id))) {
          return;
        }

        seen.add(String(id));
        options.push({ ranchId: Number(id), ranchName: rollupRanchName(row) });
      });

      // Host ranch (always priced) — add if no order/rollup row exists for it yet.
      if (
        ranchId !== null &&
        ranchId !== undefined &&
        !seen.has(String(ranchId))
      ) {
        options.push({ ranchId: Number(ranchId), ranchName: null });
      }

      return options;
    },
    [ranchRollup, ranchId],
  );

  const openAdd = useCallback(function () {
    setIsAddOpen(true);
  }, []);

  const closeAdd = useCallback(function () {
    setIsAddOpen(false);
  }, []);

  const handleOrderCreated = useCallback(
    function () {
      setIsAddOpen(false);
      return reload();
    },
    [reload],
  );

  // Standalone shavings cancellation, HostSecretary-direct: mirrors
  // useCompetitionStallsPage.js's handleDeleteStallBooking shape exactly
  // (confirm -> call -> reload). ranchId here is the participating/booking
  // ranch the order itself belongs to (order.participatingRanchId, stamped
  // onto every row during the R2 per-ranch loop above) — NOT the page's own
  // ranchId, since a host secretary's shavings list spans every
  // participating guest ranch, not just her own.
  const handleCancelOrder = useCallback(
    async function (order) {
      const shavingsOrderId = getValue(
        order,
        "shavingsOrderId",
        "ShavingsOrderId",
        null,
      );
      const orderRanchId = getValue(
        order,
        "participatingRanchId",
        "ParticipatingRanchId",
        ranchId,
      );

      if (!shavingsOrderId) {
        return null;
      }

      const confirmed = window.confirm(
        "האם לבטל את הזמנת הנסורת? פעולה זו תעדכן גם את החיובים.",
      );

      if (!confirmed) {
        return null;
      }

      setCancelError(null);
      setCancellingId(shavingsOrderId);

      try {
        await secretaryCancelShavingsOrder(shavingsOrderId, orderRanchId);
        await reload();
        return true;
      } catch (err) {
        setCancelError(err);
        return false;
      } finally {
        setCancellingId(null);
      }
    },
    [ranchId, reload],
  );

  return {
    loading: loading,
    error: error,
    errorMessage: getErrorMessage(error, "שגיאה בטעינת הזמנות הנסורת"),
    reload: reload,

    orders: orders,
    ranchRollup: ranchRollup,

    group: group,
    setGroup: setGroup,
    filterRanch: filterRanch,
    setFilterRanch: setFilterRanch,
    filterStatus: filterStatus,
    setFilterStatus: setFilterStatus,

    groups: groups,
    needsAttention: needsAttention,

    ranchOptions: ranchOptions,
    isAddOpen: isAddOpen,
    openAdd: openAdd,
    closeAdd: closeAdd,
    handleOrderCreated: handleOrderCreated,

    cancellingId: cancellingId,
    cancelError: cancelError,
    cancelErrorMessage: getErrorMessage(cancelError, "שגיאה בביטול הזמנת הנסורת"),
    handleCancelOrder: handleCancelOrder,
  };
}
