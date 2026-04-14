import axios from "./axiosInstance";

function getHorsesByRanch(ranchId, searchText) {
  return axios.get("/Horses", {
    params: {
      ranchId: ranchId,
      search: searchText || null,
    },
  });
}

function updateHorseBarnName(horseId, ranchId, barnName) {
  return axios.put("/Horses/" + horseId + "/barnname", {
    horseId: horseId,
    ranchId: ranchId,
    barnName: barnName || null,
  });
}

export {
  getHorsesByRanch,
  updateHorseBarnName,
};