function getAdminMenuItems() {
  return [
    {
      key: "competitions",
      label: "לוח תחרויות",
      screen: "AdminCompetitionsBoard",
      icon: "trophy-outline",
    },
    {
      key: "riders",
      label: "ניהול רוכבים",
      screen: "AdminRiders",
      icon: "people-outline",
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
      key: "trainers",
      label: "ניהול מאמנים",
      screen: "AdminTrainers",
      icon: "person-circle-outline",
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