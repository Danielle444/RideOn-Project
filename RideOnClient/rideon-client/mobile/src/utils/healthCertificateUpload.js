// Pure helpers for the health-certificate upload flow
// (useAdminCompetitionHealthCertificates). No react/react-native import so
// these are safe to unit test directly.

// Must match [RequestSizeLimit(20_000_000)] on
// HorsesController.UploadHealthCertificate.
var MAX_HEALTH_CERTIFICATE_FILE_SIZE_BYTES = 20 * 1000 * 1000;

function isSupportedHealthCertificateFile(file) {
  if (!file) {
    return false;
  }

  var mimeType = (file.mimeType || "").toLowerCase();
  var name = (file.name || "").toLowerCase();

  return mimeType === "application/pdf" || name.endsWith(".pdf");
}

function isHealthCertificateFileTooLarge(file) {
  if (!file || typeof file.size !== "number") {
    return false;
  }

  return file.size > MAX_HEALTH_CERTIFICATE_FILE_SIZE_BYTES;
}

// Maps an upload/list-load failure to one of a small set of controlled
// Hebrew messages. Never echoes error?.response?.data or error?.message -
// those can carry raw exception text, English validation strings, or (worst
// case) Supabase/DB internals, none of which belong in front of the admin.
function resolveHealthCertificateErrorMessage(error, fallbackMessage) {
  if (error?.isAuthError) {
    return "פג תוקף ההתחברות. יש להתחבר מחדש כדי להמשיך.";
  }

  var status = error?.response?.status;

  if (status === 403) {
    return "אין לך הרשאה לבצע פעולה זו.";
  }

  if (status === 400) {
    return "הבקשה אינה תקינה. יש לבדוק את הקובץ שנבחר ולנסות שוב.";
  }

  return fallbackMessage;
}

export {
  MAX_HEALTH_CERTIFICATE_FILE_SIZE_BYTES,
  isSupportedHealthCertificateFile,
  isHealthCertificateFileTooLarge,
  resolveHealthCertificateErrorMessage,
};
