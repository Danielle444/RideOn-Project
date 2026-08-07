// The single shared API-error-to-user-message extractor, imported by both
// mobile and web. Hardened per the RideOn notification audit (2026-08-07):
// this must NEVER resolve to "", undefined, "[object Object]", or raw
// SQLSTATE/"Database error:" text leaking out of a DAL exception that wasn't
// normalized server-side. When nothing usable is found, it falls back to a
// guaranteed-safe generic Hebrew string rather than the caller's fallback
// alone, so a caller that forgets to pass one still can't produce an empty
// or undefined message.

var GENERIC_FALLBACK = "אירעה שגיאה. נסו שוב.";

// A DAL exception surfaced without normalization looks like
// "Database error: <text>" or a bare Postgres SQLSTATE prefix
// ("P0001: ...", "RN001: ...", "22001: ..."). Neither belongs in front of a
// user - treat a message shaped like this as unusable rather than display it.
var DATABASE_ERROR_PREFIX = /^database error:/i;
var SQLSTATE_PREFIX = /^[a-z0-9]{5}:\s/i;

function isUsableMessage(value) {
  if (typeof value !== "string") {
    return false;
  }

  var trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  if (DATABASE_ERROR_PREFIX.test(trimmed) || SQLSTATE_PREFIX.test(trimmed)) {
    return false;
  }

  return true;
}

function extractValidationMessages(errorsObject) {
  var messages = [];

  Object.keys(errorsObject).forEach(function (key) {
    var fieldErrors = errorsObject[key];

    if (Array.isArray(fieldErrors)) {
      fieldErrors.forEach(function (message) {
        if (typeof message === "string" && message.trim()) {
          messages.push(message);
        }
      });
    }
  });

  return messages;
}

// Handles, in order: ASP.NET model-validation { errors }, a plain string
// body, a { message } body, a { title } body (ProblemDetails), a raw string
// `error`, and finally axios's own error.message (e.g. "Network Error") -
// same precedence web's getErrorMessage already established, now guarded so
// every branch can only return a known-usable string or fall through.
function getApiErrorMessage(error, fallbackMessage) {
  var fallback = isUsableMessage(fallbackMessage)
    ? fallbackMessage
    : GENERIC_FALLBACK;

  if (!error) {
    return fallback;
  }

  if (typeof error === "string") {
    return isUsableMessage(error) ? error : fallback;
  }

  var response = error.response;

  if (response) {
    var data = response.data;

    if (data && typeof data === "object" && data.errors && typeof data.errors === "object") {
      var validationMessages = extractValidationMessages(data.errors);

      if (validationMessages.length > 0) {
        var joined = validationMessages.join(" | ");

        if (isUsableMessage(joined)) {
          return joined;
        }
      }
    }

    if (isUsableMessage(data)) {
      return data;
    }

    if (data && typeof data === "object") {
      if (isUsableMessage(data.message)) {
        return data.message;
      }

      if (isUsableMessage(data.title)) {
        return data.title;
      }
    }
  }

  if (isUsableMessage(error.message)) {
    return error.message;
  }

  return fallback;
}

export { getApiErrorMessage };
