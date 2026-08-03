import axios from "./axiosInstance";

function getRegistrationStepStatus(competitionId, ranchId) {
  return axios.get("/RegistrationStepStatus/" + competitionId, {
    params: {
      ranchId: ranchId,
    },
  });
}

export { getRegistrationStepStatus };
