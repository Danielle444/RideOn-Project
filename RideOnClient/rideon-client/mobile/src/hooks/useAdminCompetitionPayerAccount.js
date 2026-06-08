import { useCallback, useMemo, useState } from "react";

import { Alert } from "react-native";

import { useFocusEffect } from "@react-navigation/native";

import { getPayerCompetitionAccount } from "../services/payerService";

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

export default function useAdminCompetitionPayerAccount(params) {
  var activeRole = params.activeRole;
  var activeCompetition = params.activeCompetition;
  var routePayer = params.routePayer;
  var routeCompetition = params.routeCompetition;

  var competitionId =
    activeCompetition?.competitionId ||
    routeCompetition?.competitionId ||
    routeCompetition?.CompetitionId ||
    null;

  var ranchId = activeRole?.ranchId || null;

  var payerPersonId =
    routePayer?.personId ||
    routePayer?.PersonId ||
    routePayer?.payerPersonId ||
    routePayer?.PayerPersonId ||
    null;

  var [account, setAccount] = useState(null);
  var [loading, setLoading] = useState(false);
  var [screenError, setScreenError] = useState("");

  var loadAccount = useCallback(
    async function () {
      if (!competitionId || !ranchId || !payerPersonId) {
        setScreenError("חסרים פרטים לטעינת חשבון המשלם");
        return;
      }

      try {
        setLoading(true);
        setScreenError("");

        var response = await getPayerCompetitionAccount(
          ranchId,
          competitionId,
          payerPersonId,
        );

        setAccount(normalizeAccountResponse(response));
      } catch (error) {
        console.log("PAYER ACCOUNT ERROR", error);
        console.log("PAYER ACCOUNT STATUS", error?.response?.status);
        console.log("PAYER ACCOUNT DATA", error?.response?.data);

        setAccount(null);

        setScreenError(
          String(error?.response?.data || "אירעה שגיאה בטעינת חשבון המשלם"),
        );

        Alert.alert(
          "שגיאה",
          String(error?.response?.data || "אירעה שגיאה בטעינת חשבון המשלם"),
        );
      } finally {
        setLoading(false);
      }
    },
    [competitionId, ranchId, payerPersonId],
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
        payer: safeAccount.payer || routePayer || null,
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
    [account, routePayer],
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