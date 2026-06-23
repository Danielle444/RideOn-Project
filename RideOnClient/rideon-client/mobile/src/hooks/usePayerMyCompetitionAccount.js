import { useCallback, useMemo, useState } from "react";

import { Alert } from "react-native";

import { useFocusEffect } from "@react-navigation/native";

import { getMyCompetitionAccount } from "../services/payerService";

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
  };
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
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

        var msg = String(
          error?.response?.data || "אירעה שגיאה בטעינת החשבון שלך",
        );

        setScreenError(msg);

        Alert.alert("שגיאה", msg);
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
      var safeAccount = account || {};

      return {
        payer: safeAccount.payer || null,
        summary: safeAccount.summary || {},
        classes: dedupBy(safeArray(safeAccount.classes), function (it) {
          return it.entryId;
        }),
        paidTimes: dedupBy(safeArray(safeAccount.paidTimes), function (it) {
          return it.paidTimeRequestId;
        }),
        stalls: dedupBy(safeArray(safeAccount.stalls), function (it) {
          return it.stallBookingId;
        }),
        shavings: dedupBy(safeArray(safeAccount.shavings), function (it) {
          return it.shavingsOrderId;
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
  };
}
