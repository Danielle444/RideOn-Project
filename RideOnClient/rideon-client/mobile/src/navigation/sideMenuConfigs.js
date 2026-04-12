function getAdminMenuItems() {
  return [
    { key: "home", label: "דף הבית", screen: "AdminHome", icon: "home-outline" },
    { key: "competitions", label: "לוח התחרויות", screen: "AdminCompetitionsBoard", icon: "trophy-outline" },
    { key: "profile", label: "פרופיל", screen: "AdminProfile", icon: "person-outline" },
  ];
}

function getPayerMenuItems() {
  return [
    { key: "home", label: "דף הבית", screen: "PayerHome", icon: "home-outline" },
    { key: "competitions", label: "לוח התחרויות", screen: "PayerCompetitionsBoard", icon: "trophy-outline" },
    { key: "profile", label: "פרופיל", screen: "PayerProfile", icon: "person-outline" },
  ];
}

function getWorkerMenuItems() {
  return [
    { key: "home", label: "דף הבית", screen: "WorkerHome", icon: "home-outline" },
    { key: "competitions", label: "לוח התחרויות", screen: "WorkerCompetitionsBoard", icon: "trophy-outline" },
    { key: "profile", label: "פרופיל עובד", screen: "WorkerProfile", icon: "person-outline" },
  ];
}

export {
  getAdminMenuItems,
  getPayerMenuItems,
  getWorkerMenuItems,
};