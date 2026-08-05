function getAdminMenuItems() {
  return [
    {
      key: "competitions",
      label: "לוח תחרויות",
      screen: "AdminCompetitionsBoard",
      icon: "trophy-outline",
    },
    {
      key: "horses",
      label: "ניהול סוסים",
      screen: "AdminHorses",
      icon: "business-outline",
    },
    {
      key: "payers",
      label: "ניהול משלמים",
      screen: "AdminPayers",
      icon: "card-outline",
    },
    {
      key: "profile",
      label: "פרופיל",
      screen: "AdminProfile",
      icon: "person-outline",
    },
  ];
}

function getPayerMenuItems() {
  return [
    {
      key: "competitions",
      label: "לוח תחרויות",
      screen: "PayerCompetitionsBoard",
      icon: "trophy-outline",
    },
    {
      key: "profile",
      label: "פרופיל",
      screen: "PayerProfile",
      icon: "person-outline",
    },
  ];
}

function getWorkerMenuItems() {
  return [
    {
      key: "competitions",
      label: "לוח תחרויות",
      screen: "WorkerCompetitionsBoard",
      icon: "trophy-outline",
    },
    {
      key: "profile",
      label: "פרופיל",
      screen: "WorkerProfile",
      icon: "person-outline",
    },
  ];
}

export {
  getAdminMenuItems,
  getPayerMenuItems,
  getWorkerMenuItems,
};