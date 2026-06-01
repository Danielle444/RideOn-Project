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
        classes: safeArray(safeAccount.classes),
        paidTimes: safeArray(safeAccount.paidTimes),
        stalls: safeArray(safeAccount.stalls),
        shavings: safeArray(safeAccount.shavings),
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
