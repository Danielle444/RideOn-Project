function getAdminCompetitionMenuItems() {
  return [
    {
      key: "competition-details",
      label: "פרטי תחרות",
      icon: "document-text-outline",
    },
    {
      key: "competition-registration",
      label: "הכנסת הרשמות",
      icon: "person-add-outline",
    },
    {
      key: "my-riders",
      label: "הרוכבים שלי",
      icon: "people-outline",
    },
    {
      key: "my-horses",
      label: "הסוסים שלי",
      icon: "business-outline",
    },
    {
      key: "my-payments",
      label: "התשלומים שלי",
      icon: "card-outline",
    },
    {
      key: "my-trainers",
      label: "המאמנים שלי",
      icon: "person-circle-outline",
    },
    {
      key: "classes",
      label: "מקצים",
      icon: "grid-outline",
    },
    {
      key: "stalls-shavings",
      label: "תאים ונסורת",
      icon: "bonfire-outline",
    },
    {
      key: "paid-time",
      label: "פייד טיימים",
      icon: "time-outline",
    },
    {
      key: "health-certificates",
      label: "תעודות בריאות",
      icon: "medkit-outline",
    },
  ];
}

function getPayerCompetitionMenuItems() {
  return [
    {
      key: "account-details",
      label: "פירוט חשבון",
      icon: "document-text-outline",
    },
    {
      key: "classes",
      label: "מקצים",
      icon: "trophy-outline",
    },
    {
      key: "paid-time",
      label: "פייד טיימים",
      icon: "time-outline",
    },
    {
      key: "stalls",
      label: "תאים",
      icon: "grid-outline",
    },
  ];
}

export {
  getAdminCompetitionMenuItems,
  getPayerCompetitionMenuItems,
};