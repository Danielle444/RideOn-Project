// Pure classification/search helpers for the Secretary health-certificate
// tab model. Lives separately from the mobile app's
// healthCertificateStatus.utils.js, same as the rest of this codebase's
// display logic - shared/ only holds auth/validation/constants, not domain
// display rules. Unlike mobile (which folds Rejected into its single
// action-required tab), Secretary gets its own dedicated נדחו tab, per the
// locked rejection-workflow design.
//
// Classification matches the finalized backend contract exactly:
//   ממתין לבדיקה: hcPath exists AND hcApprovalStatus === 'Pending'
//   טרם הועלה:    no hcPath
//   נדחו:          hcApprovalStatus === 'Rejected'
//   אושר:          hcApprovalStatus === 'Approved'

var HEALTH_CERTIFICATE_TABS = [
  { key: "pendingReview", label: "ממתין לבדיקה" },
  { key: "notUploaded", label: "טרם הועלה" },
  { key: "rejected", label: "נדחו" },
  { key: "approved", label: "אושר" },
];

var DEFAULT_HEALTH_CERTIFICATE_TAB = "pendingReview";

function getHealthCertificateTabKey(cert) {
  if (!cert || !cert.hcPath) {
    return "notUploaded";
  }

  if (cert.hcApprovalStatus === "Rejected") {
    return "rejected";
  }

  if (cert.hcApprovalStatus === "Approved") {
    return "approved";
  }

  return "pendingReview";
}

function countHealthCertificatesByTab(certificates) {
  var counts = { pendingReview: 0, notUploaded: 0, rejected: 0, approved: 0 };

  (certificates || []).forEach(function (cert) {
    var key = getHealthCertificateTabKey(cert);
    counts[key] = (counts[key] || 0) + 1;
  });

  return counts;
}

function matchesHealthCertificateSearch(cert, searchText) {
  var normalized = (searchText || "").trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  var horseName = (cert?.horseName || "").toLowerCase();
  var barnName = (cert?.barnName || "").toLowerCase();

  return horseName.includes(normalized) || barnName.includes(normalized);
}

function filterHealthCertificates(certificates, tabKey, searchText) {
  return (certificates || [])
    .filter(function (cert) {
      return getHealthCertificateTabKey(cert) === tabKey;
    })
    .filter(function (cert) {
      return matchesHealthCertificateSearch(cert, searchText);
    });
}

export {
  HEALTH_CERTIFICATE_TABS,
  DEFAULT_HEALTH_CERTIFICATE_TAB,
  getHealthCertificateTabKey,
  countHealthCertificatesByTab,
  matchesHealthCertificateSearch,
  filterHealthCertificates,
};
