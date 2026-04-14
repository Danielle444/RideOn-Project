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
  ];
}

export {
  getAdminMenuItems,
  getPayerMenuItems,
  getWorkerMenuItems,
};