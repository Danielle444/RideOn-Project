import { useCallback, useMemo, useState } from "react";

import { useFocusEffect } from "@react-navigation/native";

import { getMyCompetitionAccount } from "../services/payerService";
import { getApiErrorMessage } from "../../../shared/auth/utils/authApiErrors";

function normalizeAccountResponse(response) {
  if (response && response.data) {
    return response.data;
  }

  return {
    payer: null,
    summary: null,
    classes: [],
    paidTimes: [],
    stalls: [],
    shavings: [],
    fines: [],
  };
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * @typedef {Object} PayerShavingsOrder
 * @property {number} shavingsOrderId
 * @property {number} bagQuantity
 * @property {string|null} requestedDeliveryTime
 * @property {string|null} deliveryStatus
 * @property {number} amountToPay
 * @property {number} paidAmount
 * @property {number} unpaidAmount
 * @property {boolean} isPaid
 */

/**
 * @typedef {Object} PayerStallRow
 * @property {number} stallBookingId
 * @property {number|null} horseId
 * @property {string|null} horseName
 * @property {string|null} barnName
 * @property {boolean} isForTack
 * @property {string} startDate
 * @property {string} endDate
 * @property {number|null} stallId
 * @property {string|null} productName
 * @property {number} amountToPay
 * @property {boolean} isPaid
 * @property {boolean} isCancelled
 * @property {boolean} hasPendingCancellation
 * @property {boolean} hasPendingChange
 * @property {PayerShavingsOrder[]} shavingsOrders
 */

/**
 * @typedef {Object} PayerClassRow
 * @property {number} entryId
 * @property {string|null} className
 * @property {number} totalAmount
 * @property {number} organizerCost
 * @property {number} federationCost
 * @property {boolean} isPaid
 * @property {boolean} hasPendingCancellation
 * @property {boolean} isCancelled
 */

/**
 * @typedef {Object} PayerPaidTimeRow
 * @property {number} paidTimeRequestId
 * @property {string|null} productName
 * @property {number} amountToPay
 * @property {string|null} status
 * @property {boolean} isPaid
 * @property {number} hoursUntilStart
 * @property {boolean} canCancel
 */

/**
 * @typedef {Object} PayerFineRow
 * @property {number} billChargeId
 * @property {number} billId
 * @property {number} sourceId
 * @property {number|null} originalEntryId
 * @property {number|null} classInCompId
 * @property {string|null} className
 * @property {number} amountToPay
 * @property {number} paidAmount
 * @property {number} unpaidAmount
 * @property {string|null} chargeStatus
 * @property {string|null} notes
 */

/**
 * @typedef {Object} PayerSummary
 * @property {number} classGrandTotal
 * @property {number} classOrganizerTotal
 * @property {number} classFederationTotal
 * @property {number} paidTimeTotal
 * @property {number} stallTotal
 * @property {number} shavingsTotal
 * @property {number} grandTotal
 * @property {number} paidAmount
 * @property {number} remainingAmount
 * @property {number} organizerTotal
 * @property {number} federationTotal
 * @property {string|null} paymentStatus
 */

/**
 * @typedef {Object} PayerAccount
 * @property {Object|null} payer
 * @property {PayerSummary} summary
 * @property {PayerClassRow[]} classes
 * @property {PayerPaidTimeRow[]} paidTimes
 * @property {PayerStallRow[]} stalls
 * @property {PayerShavingsOrder[]} shavings
 * @property {PayerFineRow[]} fines
 */

// Guardrail (CAP-3): the deployed proc's money-bearing fields (amountToPay on a
// stall row and on each nested shavings order) are the exact source of the
// PayerCompetitionAccountScreen ₪0 bug this hook exists to prevent from
// recurring. If a row exists but the key is missing, warn once per offending
// path instead of silently rendering ₪0. warnedPaths is scoped to a single
// normalizePayerAccount() call, so a re-render with the same broken payload
// does not spam duplicate warnings within that call, but also does not
// suppress a repeat warning on the next payload (fresh Set per call).
function warnMissingAmount(warnedPaths, path) {
  if (warnedPaths.has(path)) return;
  warnedPaths.add(path);
  console.warn(
    "usePayerMyCompetitionAccount: missing amountToPay at " +
      path +
      " — payer-account payload contract may have changed.",
  );
}

function normalizeShavingsOrder(raw, warnedPaths, path) {
  if (raw && raw.amountToPay === undefined) {
    warnMissingAmount(warnedPaths, path);
  }
  return raw;
}

function normalizeStallRow(raw, warnedPaths, path) {
  var shavingsOrders = safeArray(raw.shavingsOrders).map(function (
    order,
    index,
  ) {
    return normalizeShavingsOrder(
      order,
      warnedPaths,
      path + ".shavingsOrders[" + index + "]",
    );
  });

  if (raw.amountToPay === undefined) {
    warnMissingAmount(warnedPaths, path);
  }

  return Object.assign({}, raw, { shavingsOrders: shavingsOrders });
}

/**
 * Pure boundary mapper (CAP-3). Reads the proc-verified payload shape and
 * returns it as-is under the same field names the screen already reads
 * (amountToPay, bagQuantity, ...) — it does not rename anything, it only
 * types the shape and fails loudly when a money field is missing.
 * @param {Object} raw
 * @returns {PayerAccount}
 */
function normalizePayerAccount(raw) {
  var safeRaw = raw || {};
  var warnedPaths = new Set();

  var stalls = safeArray(safeRaw.stalls).map(function (stall, index) {
    return normalizeStallRow(stall, warnedPaths, "stalls[" + index + "]");
  });

  var shavings = safeArray(safeRaw.shavings).map(function (order, index) {
    return normalizeShavingsOrder(order, warnedPaths, "shavings[" + index + "]");
  });

  return {
    payer: safeRaw.payer || null,
    summary: safeRaw.summary || {},
    classes: safeArray(safeRaw.classes),
    paidTimes: safeArray(safeRaw.paidTimes),
    stalls: stalls,
    shavings: shavings,
    fines: safeArray(safeRaw.fines),
  };
}

// SPs that JOIN through 1-to-many tables (e.g. billproductrequest, shavings)
// can return the same logical row multiple times. Dedup on the natural key
// of each list before render so React keys stay unique.
function dedupBy(list, getKey) {
  var seen = new Set();
  var out = [];

  list.forEach(function (item) {
    var k = getKey(item);
    if (k === null || k === undefined) {
      out.push(item);
      return;
    }
    var keyStr = String(k);
    if (seen.has(keyStr)) return;
    seen.add(keyStr);
    out.push(item);
  });

  return out;
}

export default function usePayerMyCompetitionAccount(params) {
  var activeRole = params.activeRole;
  var activeCompetition = params.activeCompetition;

  var competitionId = activeCompetition?.competitionId || null;
  var ranchId = activeRole?.ranchId || null;

  var [account, setAccount] = useState(null);
  var [loading, setLoading] = useState(false);
  var [screenError, setScreenError] = useState("");

  var loadAccount = useCallback(
    async function () {
      if (!competitionId || !ranchId) {
        setScreenError("חסרים פרטים לטעינת חשבון");
        return;
      }

      try {
        setLoading(true);
        setScreenError("");

        var response = await getMyCompetitionAccount(ranchId, competitionId);

        setAccount(normalizeAccountResponse(response));
      } catch (error) {
        console.log("PAYER MY ACCOUNT ERROR", error);
        console.log("STATUS", error?.response?.status);
        console.log("DATA", error?.response?.data);

        setAccount(null);

        var msg = getApiErrorMessage(error, "אירעה שגיאה בטעינת החשבון שלך");

        setScreenError(msg);
      } finally {
        setLoading(false);
      }
    },
    [competitionId, ranchId],
  );

  useFocusEffect(
    useCallback(
      function () {
        loadAccount();
      },
      [loadAccount],
    ),
  );

  var normalized = useMemo(
    function () {
      var typedAccount = normalizePayerAccount(account);

      return {
        payer: typedAccount.payer,
        summary: typedAccount.summary,
        classes: dedupBy(typedAccount.classes, function (it) {
          return it.entryId;
        }),
        paidTimes: dedupBy(typedAccount.paidTimes, function (it) {
          return it.paidTimeRequestId;
        }),
        stalls: dedupBy(typedAccount.stalls, function (it) {
          return it.stallBookingId;
        }),
        shavings: dedupBy(typedAccount.shavings, function (it) {
          return it.shavingsOrderId;
        }),
        fines: dedupBy(typedAccount.fines, function (it) {
          return it.billChargeId;
        }),
      };
    },
    [account],
  );

  return {
    loading: loading,
    screenError: screenError,
    reload: loadAccount,

    payer: normalized.payer,
    summary: normalized.summary,
    classes: normalized.classes,
    paidTimes: normalized.paidTimes,
    stalls: normalized.stalls,
    shavings: normalized.shavings,
    fines: normalized.fines,
  };
}
