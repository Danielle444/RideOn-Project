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
      key: "board",
      icon: "trophy-outline",
      onPress: function () {
        navigation.navigate("AdminCompetitionsBoard");
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
        navigation.navigate("PayerHome");
      },
    },
    {
      key: "board",
      icon: "trophy-outline",
      onPress: function () {
        navigation.navigate("PayerCompetitionsBoard");
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
      icon: "home-outline",
      onPress: function () {
        navigation.navigate("WorkerHome");
      },
    },
    {
      key: "board",
      icon: "trophy-outline",
      onPress: function () {
        navigation.navigate("WorkerCompetitionsBoard");
      },
    },
  ];
}

export {
  getAdminBottomNavConfig,
  getPayerBottomNavConfig,
  getWorkerBottomNavConfig,
};