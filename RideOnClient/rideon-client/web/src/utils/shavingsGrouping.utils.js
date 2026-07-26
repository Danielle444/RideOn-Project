// Grouping — participating ranch ⇄ derived status. Spec 2 (read-model.md, CAP-2).
//
// Pure transforms of the one flat master `orders` list — switching modes NEVER refetches.
// Each order is expected to already carry `participatingRanchId`, `participatingRanchName`,
// and `derivedStatus` (tagged during assembly in the hook).
import { getValue } from "./shavingsStatus.utils";
import { SHAVINGS_STATUS_ORDER } from "./shavingsStatus.utils";

function getBags(order) {
  return Number(getValue(order, "bagQuantity", "BagQuantity", 0)) || 0;
}

// R1 rollup accessors (per participating/booking ranch).
function rollupRanchId(row) {
  return getValue(row, "bookingRanchId", "BookingRanchId", null);
}

function rollupStats(row) {
  return {
    orderCount: getValue(row, "orderCount", "OrderCount", 0),
    stallCount: getValue(row, "stallCount", "StallCount", 0),
    bagQuantity: getValue(row, "bagQuantity", "BagQuantity", 0),
    expectedAmount: getValue(row, "expectedAmount", "ExpectedAmount", 0),
    paidAmount: getValue(row, "paidAmount", "PaidAmount", 0),
    unpaidAmount: getValue(row, "unpaidAmount", "UnpaidAmount", 0),
  };
}

// group = "ranch": one group per participating ranch, in the rollup's order; header stats come
// from the matching R1 rollup row. Ranches with no orders yet are omitted (natural grouping of
// the order list). Falls back gracefully if a ranch has orders but no rollup row.
export function groupByRanch(orders, ranchRollup) {
  const rollup = Array.isArray(ranchRollup) ? ranchRollup : [];
  const byRanch = new Map();

  orders.forEach(function (order) {
    const id = order.participatingRanchId;
    const key = id === null || id === undefined ? "unknown" : String(id);

    if (!byRanch.has(key)) {
      byRanch.set(key, []);
    }

    byRanch.get(key).push(order);
  });

  const groups = [];
  const seen = new Set();

  // Preserve the rollup's ranch order first.
  rollup.forEach(function (row) {
    const id = rollupRanchId(row);
    const key = id === null || id === undefined ? "unknown" : String(id);

    if (!byRanch.has(key) || seen.has(key)) {
      return;
    }

    seen.add(key);

    groups.push({
      key: "ranch-" + key,
      title: getValue(row, "bookingRanchName", "BookingRanchName", "חווה"),
      orders: byRanch.get(key),
      stats: rollupStats(row),
    });
  });

  // Any order-bearing ranch without a rollup row (defensive) — derive minimal stats.
  byRanch.forEach(function (list, key) {
    if (seen.has(key)) {
      return;
    }

    const first = list[0];

    groups.push({
      key: "ranch-" + key,
      title:
        (first && first.participatingRanchName) || "חווה",
      orders: list,
      stats: {
        orderCount: list.length,
        bagQuantity: list.reduce(function (sum, o) {
          return sum + getBags(o);
        }, 0),
      },
    });
  });

  return groups;
}

const STATUS_TITLES = {
  Pending: "ממתין לטיפול",
  Seen: "בטיפול",
  Delivered: "סופק",
  Other: "אחר",
};

// group = "status": bucket by DERIVED status in the fixed pipeline order. Unexpected values
// (should not occur — no WaitingApproval/Closed) fall into a trailing "אחר" bucket rather than
// being dropped. Empty buckets are omitted. Header count + bag sum are derived client-side.
export function groupByStatus(orders) {
  const buckets = new Map();

  orders.forEach(function (order) {
    const status = order.derivedStatus || "Other";
    const key = SHAVINGS_STATUS_ORDER.indexOf(status) === -1 ? "Other" : status;

    if (!buckets.has(key)) {
      buckets.set(key, []);
    }

    buckets.get(key).push(order);
  });

  const order = SHAVINGS_STATUS_ORDER.concat(["Other"]);

  return order
    .filter(function (status) {
      return buckets.has(status);
    })
    .map(function (status) {
      const list = buckets.get(status);

      return {
        key: "status-" + status,
        status: status,
        title: STATUS_TITLES[status] || status,
        orders: list,
        stats: {
          orderCount: list.length,
          bagQuantity: list.reduce(function (sum, o) {
            return sum + getBags(o);
          }, 0),
        },
      };
    });
}
