function getApiErrorMessage(error, fallbackMessage) {
  if (error?.response && typeof error.response.data === "string") {
    return error.response.data;
  }

  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  return fallbackMessage;
}

export { getApiErrorMessage };