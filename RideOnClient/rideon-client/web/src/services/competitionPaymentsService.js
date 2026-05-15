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

function getCompetitionPaymentPayers(competitionId, ranchId) {
  return axios.get(`${API}/CompetitionPayments/payers`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

function getCompetitionPayerAccountSummary(competitionId, ranchId, payerPersonId) {
  return axios.get(
    `${API}/CompetitionPayments/payers/${payerPersonId}/account-summary`,
    {
      params: {
        competitionId: competitionId,
        ranchId: ranchId,
      },
      ...getAuthHeaders(),
    },
  );
}

function getCompetitionPayerCategorySummary(competitionId, ranchId, payerPersonId) {
  return axios.get(
    `${API}/CompetitionPayments/payers/${payerPersonId}/category-summary`,
    {
      params: {
        competitionId: competitionId,
        ranchId: ranchId,
      },
      ...getAuthHeaders(),
    },
  );
}

function getCompetitionPayerCharges(
  competitionId,
  ranchId,
  payerPersonId,
  chargeOwner,
  categoryKey,
) {
  var params = {
    competitionId: competitionId,
    ranchId: ranchId,
  };

  if (chargeOwner) {
    params.chargeOwner = chargeOwner;
  }

  if (categoryKey) {
    params.categoryKey = categoryKey;
  }

  return axios.get(`${API}/CompetitionPayments/payers/${payerPersonId}/charges`, {
    params: params,
    ...getAuthHeaders(),
  });
}

function getCompetitionPaymentMethods() {
  return axios.get(`${API}/CompetitionPayments/payment-methods`, {
    ...getAuthHeaders(),
  });
}

function createCompetitionPayment(data) {
  return axios.post(`${API}/CompetitionPayments/payments`, data, getAuthHeaders());
}

export {
  getCompetitionPaymentPayers,
  getCompetitionPayerAccountSummary,
  getCompetitionPayerCategorySummary,
  getCompetitionPayerCharges,
  getCompetitionPaymentMethods,
  createCompetitionPayment,
};