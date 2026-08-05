import { useCallback, useEffect, useRef, useState } from "react";

import { getRegistrationStepStatus } from "../services/registrationStepStatusService";
import { computeRegistrationStepAvailability } from "../utils/registrationStepAvailability";

var GENERIC_LOAD_ERROR_MESSAGE = "אירעה שגיאה בטעינת נתוני ההרשמה";

function isValidId(value) {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  var numericValue = Number(value);

  return !Number.isNaN(numericValue) && Number.isFinite(numericValue);
}

function normalizeRegistrationStepStatus(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  return {
    competitionEndDate:
      raw.competitionEndDate ?? raw.CompetitionEndDate ?? null,
    isCompetitionEnded: raw.isCompetitionEnded ?? raw.IsCompetitionEnded ?? null,
    paidTimeRegistrationDate:
      raw.paidTimeRegistrationDate ?? raw.PaidTimeRegistrationDate ?? null,
    hasPaidTimeSlots: raw.hasPaidTimeSlots ?? raw.HasPaidTimeSlots ?? null,
    hasActivePaidTimePrice:
      raw.hasActivePaidTimePrice ?? raw.HasActivePaidTimePrice ?? null,
    paidTimeConfigured:
      raw.paidTimeConfigured ?? raw.PaidTimeConfigured ?? null,
    paidTimeReadyToBook:
      raw.paidTimeReadyToBook ?? raw.PaidTimeReadyToBook ?? null,
    isPaidTimeWindowOpen:
      raw.isPaidTimeWindowOpen ?? raw.IsPaidTimeWindowOpen ?? null,
    hasAdminCreatedActiveEntry:
      raw.hasAdminCreatedActiveEntry ?? raw.HasAdminCreatedActiveEntry ?? null,
    hasManagedPayerWithActiveEntry:
      raw.hasManagedPayerWithActiveEntry ??
      raw.HasManagedPayerWithActiveEntry ??
      null,
    hasRelevantActiveEntry:
      raw.hasRelevantActiveEntry ?? raw.HasRelevantActiveEntry ?? null,
    hasAdminCreatedActiveNonTackStallBooking:
      raw.hasAdminCreatedActiveNonTackStallBooking ??
      raw.HasAdminCreatedActiveNonTackStallBooking ??
      null,
    hasManagedPayerWithActiveNonTackStallBooking:
      raw.hasManagedPayerWithActiveNonTackStallBooking ??
      raw.HasManagedPayerWithActiveNonTackStallBooking ??
      null,
    hasRelevantActiveNonTackStallBooking:
      raw.hasRelevantActiveNonTackStallBooking ??
      raw.HasRelevantActiveNonTackStallBooking ??
      null,
  };
}

export default function useRegistrationStepStatus(params) {
  var competitionId = params.competitionId;
  var ranchId = params.ranchId;
  var enabled = params.enabled;

  var [status, setStatus] = useState(null);
  // Start loading=true so the very first render (before the mount effect fires
  // and setLoading(true) runs) shows the spinner, not the fail-closed
  // STATUS_UNAVAILABLE notice. computeRegistrationStepAvailability(null) returns
  // "unavailable" for the not-yet-loaded status, and the notice only distinguishes
  // loading from unavailable via this flag - so a false initial value flashes a
  // "cannot verify registration status" lie for one frame. The mount effect always
  // settles this: shouldFetch path sets it true→false, the !shouldFetch path sets
  // it false immediately.
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);

  var isMountedRef = useRef(true);
  var requestIdRef = useRef(0);

  useEffect(function () {
    isMountedRef.current = true;

    return function () {
      isMountedRef.current = false;
    };
  }, []);

  var shouldFetch =
    enabled !== false && isValidId(competitionId) && isValidId(ranchId);

  var loadStatus = useCallback(
    async function () {
      if (!isMountedRef.current) {
        return;
      }

      if (!shouldFetch) {
        // Invalidate any in-flight request from a previous valid context so
        // a late response cannot repopulate status after becoming disabled.
        requestIdRef.current += 1;
        setLoading(false);
        setStatus(null);
        setError(null);
        return;
      }

      var requestId = ++requestIdRef.current;

      // Clear stale status immediately - a previous competition/ranch's data
      // must never be visible while the new context is loading.
      setStatus(null);
      setLoading(true);
      setError(null);

      try {
        var response = await getRegistrationStepStatus(competitionId, ranchId);
        var normalized = normalizeRegistrationStepStatus(
          response ? response.data : null,
        );

        if (!isMountedRef.current || requestId !== requestIdRef.current) {
          return;
        }

        if (!normalized) {
          setStatus(null);
          setError(GENERIC_LOAD_ERROR_MESSAGE);
          return;
        }

        setStatus(normalized);
      } catch (caughtError) {
        if (!isMountedRef.current || requestId !== requestIdRef.current) {
          return;
        }

        // Never surface raw server/database text here - a fixed generic
        // message covers 403/404/500/network failures alike, and the UI
        // must never read this as a business-rule eligibility result.
        setStatus(null);
        setError(GENERIC_LOAD_ERROR_MESSAGE);
      } finally {
        if (isMountedRef.current && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [shouldFetch, competitionId, ranchId],
  );

  useEffect(
    function () {
      loadStatus();
    },
    [loadStatus],
  );

  var availability = computeRegistrationStepAvailability(status);

  return {
    status: status,
    availability: availability,
    loading: loading,
    error: error,
    reload: loadStatus,
  };
}
