function toInputDate(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string" && value.includes("T")) {
    return value.split("T")[0];
  }

  var date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, "0");
  var day = String(date.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

function getErrorMessage(error, fallbackMessage) {
  if (!error) {
    return fallbackMessage;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error.response) {
    if (
      error.response.data &&
      typeof error.response.data === "object" &&
      error.response.data.errors &&
      typeof error.response.data.errors === "object"
    ) {
      var errorMessages = [];
      var errorKeys = Object.keys(error.response.data.errors);

      errorKeys.forEach(function (key) {
        var fieldErrors = error.response.data.errors[key];

        if (Array.isArray(fieldErrors)) {
          fieldErrors.forEach(function (message) {
            if (typeof message === "string" && message.trim()) {
              errorMessages.push(message);
            }
          });
        }
      });

      if (errorMessages.length > 0) {
        return errorMessages.join(" | ");
      }
    }

    if (typeof error.response.data === "string") {
      return error.response.data;
    }

    if (
      error.response.data &&
      typeof error.response.data === "object" &&
      typeof error.response.data.title === "string"
    ) {
      return error.response.data.title;
    }
  }

  if (typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
}

function validateDetailsForm(detailsForm) {
  if (!detailsForm.competitionName.trim()) {
    return "יש להזין שם תחרות";
  }

  if (!detailsForm.fieldId) {
    return "יש לבחור ענף";
  }

  if (!detailsForm.competitionStartDate) {
    return "יש להזין תאריך התחלה";
  }

  if (!detailsForm.competitionEndDate) {
    return "יש להזין תאריך סיום";
  }

  if (detailsForm.competitionEndDate < detailsForm.competitionStartDate) {
    return "תאריך הסיום לא יכול להיות לפני תאריך ההתחלה";
  }

  if (
    detailsForm.registrationOpenDate &&
    detailsForm.registrationEndDate &&
    detailsForm.registrationEndDate < detailsForm.registrationOpenDate
  ) {
    return "תאריך סגירת הרשמה לא יכול להיות לפני תאריך פתיחת הרשמה";
  }

  if (
    detailsForm.paidTimeRegistrationDate &&
    detailsForm.paidTimePublicationDate &&
    detailsForm.paidTimePublicationDate < detailsForm.paidTimeRegistrationDate
  ) {
    return "תאריך פרסום לו״ז פייד־טיים לא יכול להיות לפני פתיחת הרשמת פייד־טיים";
  }

  return "";
}

export { toInputDate, getErrorMessage, validateDetailsForm };