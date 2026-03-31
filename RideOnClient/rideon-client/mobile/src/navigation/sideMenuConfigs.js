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
    { key: "orders", label: "הזמנות נסורת", screen: "WorkerShavingsOrders", icon: "cube-outline" },
    { key: "stall-map", label: "מפת תאים", screen: "WorkerStallMap", icon: "location-outline" },
    { key: "messages", label: "הודעות", screen: "WorkerMessages", icon: "chatbubble-outline" },
    { key: "profile", label: "פרופיל עובד", screen: "WorkerProfile", icon: "person-outline" },
  ];
}

export {
  getAdminMenuItems,
  getPayerMenuItems,
  getWorkerMenuItems,
};