import { useReducer, useCallback, useMemo } from "react";
import { bulkCreatePaidTimeRequests } from "../services/paidTimeRequestsService";

const STEPS = [
  "intro",
  "coaches",
  "dayArena",
  "horses",
  "timePrefs",
  "timeConstraints",
  "shortLong",
  "order",
  "spacing",
  "summary",
];

const initialAnswers = {
  selectedCoachIds: [],
  day: null,
  beforeOrAfterCompetition: null,
  arenaKey: null,
  horsesPerCoach: {},
  timePreferences: { coachLevel: {}, horseLevel: {} },
  timeConstraints: { coachLevel: {}, horseLevel: {} },
  shortLong: {},
  trainingOrder: {},
  spacing: { adjacency: [], minSpacing: [] },
  riderPerHorse: {},
  payerPerHorse: {},
  notesPerHorse: {},
};

const initialState = {
  currentStepIndex: 0,
  context: null,
  answers: initialAnswers,
  isSubmitting: false,
  warnings: [],
  confirmedOverflow: false,
  serverError: null,
  result: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "INIT_CONTEXT":
      return { ...state, context: action.payload };
    case "NEXT": {
      const next = Math.min(state.currentStepIndex + 1, STEPS.length - 1);
      return { ...state, currentStepIndex: next };
    }
    case "PREV": {
      const prev = Math.max(state.currentStepIndex - 1, 0);
      return { ...state, currentStepIndex: prev };
    }
    case "GO_TO_STEP": {
      const target = STEPS.indexOf(action.payload);
      if (target < 0) return state;
      return { ...state, currentStepIndex: target };
    }
    case "SET_ANSWER":
      return {
        ...state,
        answers: { ...state.answers, [action.key]: action.value },
      };
    case "PATCH_ANSWERS":
      return {
        ...state,
        answers: { ...state.answers, ...action.payload },
      };
    case "SET_CONFIRMED_OVERFLOW":
      return { ...state, confirmedOverflow: action.payload };
    case "SUBMIT_START":
      return { ...state, isSubmitting: true, serverError: null };
    case "SUBMIT_WARNINGS":
      return {
        ...state,
        isSubmitting: false,
        warnings: action.payload,
        serverError: null,
      };
    case "SUBMIT_SUCCESS":
      return {
        ...state,
        isSubmitting: false,
        warnings: [],
        result: action.payload,
        serverError: null,
      };
    case "SUBMIT_ERROR":
      return {
        ...state,
        isSubmitting: false,
        serverError: action.payload,
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

function buildItems(answers, context) {
  if (!context) return [];

  const items = [];
  const coachIds = answers.selectedCoachIds || [];

  for (const coachId of coachIds) {
    const horseIds = answers.horsesPerCoach[coachId] || [];

    for (const horseId of horseIds) {
      const lengthChoice = answers.shortLong[horseId] || "short";
      const priceCatalog = context.priceCatalog?.[lengthChoice];
      if (!priceCatalog) continue;

      const slot = findSlotForHorse(answers, context, coachId);
      if (!slot) continue;

      const riderId = answers.riderPerHorse[horseId];
      const payerId = answers.payerPerHorse[horseId];
      if (!riderId || !payerId) continue;

      items.push({
        horseId: Number(horseId),
        riderFederationMemberId: Number(riderId),
        coachFederationMemberId: Number(coachId),
        paidByPersonId: Number(payerId),
        priceCatalogId: Number(priceCatalog.priceCatalogId),
        requestedCompSlotId: Number(slot.paidTimeSlotInCompId),
        notes: answers.notesPerHorse[horseId] || null,
      });
    }
  }
  return items;
}

function findSlotForHorse(answers, context, coachId) {
  const slotsForDay = context.slotsByDay?.[answers.day] || [];
  const arenaKey = answers.arenaKey;
  return (
    slotsForDay.find(function (slot) {
      const key = slot.arenaRanchId + "-" + slot.arenaId;
      return key === arenaKey;
    }) || slotsForDay[0] || null
  );
}

function buildMetadata(answers) {
  return {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    selectedCoachIds: answers.selectedCoachIds,
    day: answers.day,
    beforeOrAfterCompetition: answers.beforeOrAfterCompetition,
    arenaKey: answers.arenaKey,
    horsesPerCoach: answers.horsesPerCoach,
    timePreferences: answers.timePreferences,
    timeConstraints: answers.timeConstraints,
    shortLong: answers.shortLong,
    trainingOrder: answers.trainingOrder,
    spacing: answers.spacing,
  };
}

export default function usePaidTimeChatbot(config) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const ranchId = config?.ranchId;
  const competitionId = config?.competitionId;

  const initContext = useCallback(function (ctx) {
    dispatch({ type: "INIT_CONTEXT", payload: ctx });
  }, []);

  const next = useCallback(function () {
    dispatch({ type: "NEXT" });
  }, []);

  const prev = useCallback(function () {
    dispatch({ type: "PREV" });
  }, []);

  const goToStep = useCallback(function (stepName) {
    dispatch({ type: "GO_TO_STEP", payload: stepName });
  }, []);

  const setAnswer = useCallback(function (key, value) {
    dispatch({ type: "SET_ANSWER", key: key, value: value });
  }, []);

  const patchAnswers = useCallback(function (patch) {
    dispatch({ type: "PATCH_ANSWERS", payload: patch });
  }, []);

  const reset = useCallback(function () {
    dispatch({ type: "RESET" });
  }, []);

  const submit = useCallback(
    async function (options) {
      const confirmed = !!(options && options.confirmedOverflow);

      if (!ranchId || !competitionId) {
        dispatch({
          type: "SUBMIT_ERROR",
          payload: "חסרים פרטי חווה או תחרות",
        });
        return null;
      }

      const items = buildItems(state.answers, state.context);
      if (items.length === 0) {
        dispatch({
          type: "SUBMIT_ERROR",
          payload: "לא נבחרה אף בקשה לשליחה",
        });
        return null;
      }

      const payload = {
        ranchId: ranchId,
        competitionId: competitionId,
        items: items,
        metadata: buildMetadata(state.answers),
        confirmedOverflow: confirmed,
      };

      dispatch({ type: "SUBMIT_START" });

      try {
        const response = await bulkCreatePaidTimeRequests(payload);
        const data = response.data;

        if (!data.created && data.warnings && data.warnings.length > 0) {
          dispatch({ type: "SUBMIT_WARNINGS", payload: data.warnings });
          return { warnings: data.warnings };
        }

        dispatch({ type: "SUBMIT_SUCCESS", payload: data });
        return { success: true, data: data };
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          err?.response?.data ||
          err?.message ||
          "אירעה שגיאה בשליחה לשרת";
        dispatch({ type: "SUBMIT_ERROR", payload: String(message) });
        return null;
      }
    },
    [state.answers, state.context, ranchId, competitionId]
  );

  const currentStep = STEPS[state.currentStepIndex];

  const totalRequests = useMemo(
    function () {
      return buildItems(state.answers, state.context).length;
    },
    [state.answers, state.context]
  );

  return {
    STEPS: STEPS,
    state: state,
    currentStep: currentStep,
    currentStepIndex: state.currentStepIndex,
    totalSteps: STEPS.length,
    totalRequests: totalRequests,
    initContext: initContext,
    next: next,
    prev: prev,
    goToStep: goToStep,
    setAnswer: setAnswer,
    patchAnswers: patchAnswers,
    submit: submit,
    reset: reset,
  };
}

export { STEPS };
