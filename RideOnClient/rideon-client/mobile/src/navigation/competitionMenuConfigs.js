function getAdminCompetitionMenuItems() {
  return [
    {
      key: "competition-details",
      label: "פרטי תחרות",
      screen: "AdminCompetitionDetails",
      icon: "document-text-outline",
    },
    {
      key: "competition-registration",
      label: "הכנסת הרשמות",
      screen: "AdminCompetitionRegistrations",
      icon: "person-add-outline",
    },
    {
      key: "my-riders",
      label: "הרוכבים שלי",
      screen: "AdminCompetitionRiders",
      icon: "people-outline",
    },
    {
      key: "my-horses",
      label: "הסוסים שלי",
      screen: "AdminCompetitionHorses",
      icon: "business-outline",
    },
    {
      key: "my-payers",
      label: "המשלמים שלי",
      screen: "AdminCompetitionPayers",
      icon: "card-outline",
    },
    {
      key: "my-trainers",
      label: "המאמנים שלי",
      screen: "AdminCompetitionTrainers",
      icon: "person-circle-outline",
    },
    {
      key: "classes",
      label: "מקצים",
      screen: "AdminCompetitionClasses",
      icon: "grid-outline",
    },
    {
      key: "stalls-shavings",
      label: "תאים ונסורת",
      screen: "AdminCompetitionStallsShavings",
      icon: "bonfire-outline",
    },
    {
      key: "paid-time",
      label: "פייד טיימים",
      screen: "AdminCompetitionPaidTimes",
      icon: "time-outline",
    },
    {
      key: "health-certificates",
      label: "תעודות בריאות",
      screen: "AdminCompetitionHealthCertificates",
      icon: "medkit-outline",
    },
  ];
}

function getPayerCompetitionMenuItems() {
  return [
    {
      key: "account-details",
      label: "פירוט חשבון",
      screen: "PayerCompetitionAccount",
      icon: "document-text-outline",
    },
    {
      key: "classes",
      label: "מקצים",
      screen: "PayerCompetitionClasses",
      icon: "trophy-outline",
    },
    {
      key: "paid-time",
      label: "פייד טיימים",
      screen: "PayerCompetitionPaidTimes",
      icon: "time-outline",
    },
    {
      key: "stalls",
      label: "תאים",
      screen: "PayerCompetitionStalls",
      icon: "grid-outline",
    },
  ];
}

function getWorkerCompetitionMenuItems() {
  return [
    {
      key: "shavings-orders",
      label: "הזמנות נסורת",
      screen: "WorkerCompetitionShavingsOrders",
      icon: "bonfire-outline",
    },
    {
      key: "stall-map",
      label: "מפת תאים",
      screen: "WorkerCompetitionStallMap",
      icon: "location-outline",
    },
    {
      key: "messages",
      label: "הודעות",
      screen: "WorkerCompetitionMessages",
      icon: "chatbubble-outline",
    },
  ];
}

export {
  getAdminCompetitionMenuItems,
  getPayerCompetitionMenuItems,
  getWorkerCompetitionMenuItems,
};