// Pure classification helpers for the Admin health-certificate tab model.
// No react/react-native import - safe to unit test directly.
//
// The three tabs partition every certificate exactly once, matching the
// backend's finalized status contract (Pending/Approved/Rejected/no upload):
// a horse with no uploaded file OR a Rejected certificate is "actionRequired"
// (the admin owes the system a file either way), an uploaded file still
// pending approval is "pending", and an approved file is "approved".

var HEALTH_CERTIFICATE_TABS = [
  { key: "actionRequired", label: "דורש פעולה" },
  { key: "pending", label: "ממתין לאישור" },
  { key: "approved", label: "אושר" },
];

var DEFAULT_HEALTH_CERTIFICATE_TAB = "actionRequired";

function getHealthCertificateTabKey(cert) {
  if (!cert || !cert.hcPath || cert.hcApprovalStatus === "Rejected") {
    return "actionRequired";
  }

  if (cert.hcApprovalStatus === "Approved") {
    return "approved";
  }

  return "pending";
}

function countHealthCertificatesByTab(certificates) {
  var counts = { actionRequired: 0, pending: 0, approved: 0 };

  (certificates || []).forEach(function (cert) {
    var key = getHealthCertificateTabKey(cert);
    counts[key] = (counts[key] || 0) + 1;
  });

  return counts;
}

function filterCertificatesByTab(certificates, tabKey) {
  return (certificates || []).filter(function (cert) {
    return getHealthCertificateTabKey(cert) === tabKey;
  });
}

export {
  HEALTH_CERTIFICATE_TABS,
  DEFAULT_HEALTH_CERTIFICATE_TAB,
  getHealthCertificateTabKey,
  countHealthCertificatesByTab,
  filterCertificatesByTab,
};
