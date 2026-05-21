import axios from "./axiosInstance";
import { getToken } from "./storageService";

const API = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = getToken();

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

function getCompetitionSummary(competitionId, ranchId) {
  return axios.get(`${API}/CompetitionSummary`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

function getCompetitionSummaryClassDetails(competitionId, ranchId, sectionKey) {
  return axios.get(`${API}/CompetitionSummary/classes`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
      sectionKey: sectionKey,
    },
    ...getAuthHeaders(),
  });
}

function getCompetitionSummaryClassEntries(
  competitionId,
  ranchId,
  classInCompId,
  sectionKey,
) {
  return axios.get(
    `${API}/CompetitionSummary/classes/${classInCompId}/entries`,
    {
      params: {
        competitionId: competitionId,
        ranchId: ranchId,
        sectionKey: sectionKey,
      },
      ...getAuthHeaders(),
    },
  );
}

function getCompetitionSummaryPaidTimeDetails(competitionId, ranchId) {
  return axios.get(`${API}/CompetitionSummary/paid-time`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

function getCompetitionSummaryPaidTimeEntries(
  competitionId,
  ranchId,
  paidTimeSlotInCompId,
  productId,
) {
  return axios.get(
    `${API}/CompetitionSummary/paid-time/${paidTimeSlotInCompId}/entries`,
    {
      params: {
        competitionId: competitionId,
        ranchId: ranchId,
        productId: productId,
      },
      ...getAuthHeaders(),
    },
  );
}

function getCompetitionSummaryStallDetails(competitionId, ranchId) {
  return axios.get(`${API}/CompetitionSummary/stalls`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

function getCompetitionSummaryStallEntries(
  competitionId,
  ranchId,
  bookingRanchId,
  productId,
  isForTack,
) {
  return axios.get(`${API}/CompetitionSummary/stalls/entries`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
      bookingRanchId: bookingRanchId,
      productId: productId,
      isForTack: isForTack,
    },
    ...getAuthHeaders(),
  });
}

function getCompetitionSummaryShavingsDetails(competitionId, ranchId) {
  return axios.get(`${API}/CompetitionSummary/shavings`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

function getCompetitionSummaryShavingsEntries(
  competitionId,
  ranchId,
  bookingRanchId,
) {
  return axios.get(`${API}/CompetitionSummary/shavings/entries`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
      bookingRanchId: bookingRanchId,
    },
    ...getAuthHeaders(),
  });
}

function getCompetitionSummaryCashDetails(competitionId, ranchId) {
  return axios.get(`${API}/CompetitionSummary/cash`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

function getCompetitionSummaryPaymentMethodBreakdown(
  competitionId,
  ranchId,
  chargeOwner,
) {
  return axios.get(`${API}/CompetitionSummary/payments/method-breakdown`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
      chargeOwner: chargeOwner,
    },
    ...getAuthHeaders(),
  });
}

function getCompetitionSummaryPaymentBatches(
  competitionId,
  ranchId,
  chargeOwner,
  paymentMethodId,
) {
  var params = {
    competitionId: competitionId,
    ranchId: ranchId,
    chargeOwner: chargeOwner,
  };

  if (paymentMethodId !== null && paymentMethodId !== undefined) {
    params.paymentMethodId = paymentMethodId;
  }

  return axios.get(`${API}/CompetitionSummary/payments/batches`, {
    params: params,
    ...getAuthHeaders(),
  });
}

function getCompetitionSummaryPaymentBatchMethods(
  competitionId,
  ranchId,
  paymentBatchId,
) {
  return axios.get(
    `${API}/CompetitionSummary/payments/batches/${paymentBatchId}/methods`,
    {
      params: {
        competitionId: competitionId,
        ranchId: ranchId,
      },
      ...getAuthHeaders(),
    },
  );
}

function getCompetitionSummaryPaymentBatchCharges(
  competitionId,
  ranchId,
  paymentBatchId,
) {
  return axios.get(
    `${API}/CompetitionSummary/payments/batches/${paymentBatchId}/charges`,
    {
      params: {
        competitionId: competitionId,
        ranchId: ranchId,
      },
      ...getAuthHeaders(),
    },
  );
}

export {
  getCompetitionSummary,
  getCompetitionSummaryClassDetails,
  getCompetitionSummaryClassEntries,
  getCompetitionSummaryPaidTimeDetails,
  getCompetitionSummaryPaidTimeEntries,
  getCompetitionSummaryStallDetails,
  getCompetitionSummaryStallEntries,
  getCompetitionSummaryShavingsDetails,
  getCompetitionSummaryShavingsEntries,
  getCompetitionSummaryCashDetails,
  getCompetitionSummaryPaymentMethodBreakdown,
  getCompetitionSummaryPaymentBatches,
  getCompetitionSummaryPaymentBatchMethods,
  getCompetitionSummaryPaymentBatchCharges,
};
