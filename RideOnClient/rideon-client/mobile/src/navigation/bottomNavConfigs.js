function getAdminBottomNavConfig(navigation) {
  return [
    {
      key: "menu",
      icon: "menu-outline",
      onPress: null,
    },
    {
      key: "home",
      icon: "home-outline",
      onPress: function () {
        navigation.navigate("AdminHome");
      },
    },
    {
      key: "profile",
      icon: "person-outline",
      onPress: function () {
        navigation.navigate("AdminProfile");
      },
    },
  ];
}

function getPayerBottomNavConfig(navigation) {
  return [
    {
      key: "menu",
      icon: "menu-outline",
      onPress: null,
    },
    {
      key: "home",
      icon: "home-outline",
      onPress: function () {
        navigation.navigate("PayerCompetitionsBoard");
      },
    },
    {
      key: "profile",
      icon: "person-outline",
      onPress: function () {
        alert("מסך פרופיל של משלם יתחבר בהמשך");
      },
    },
  ];
}

function getWorkerBottomNavConfig(navigation) {
  return [
    {
      key: "menu",
      icon: "menu-outline",
      onPress: null,
    },
    {
      key: "home",
      icon: "cube-outline",
      onPress: function () {
        navigation.navigate("WorkerShavingsOrders");
      },
    },
    {
      key: "profile",
      icon: "person-outline",
      onPress: function () {
        alert("מסך פרופיל עובד יתחבר בהמשך");
      },
    },
  ];
}

export {
  getAdminBottomNavConfig,
  getPayerBottomNavConfig,
  getWorkerBottomNavConfig,
};