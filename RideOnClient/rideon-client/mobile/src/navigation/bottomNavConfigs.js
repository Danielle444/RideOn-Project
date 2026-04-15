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
        navigation.navigate("PayerHome");
      },
    },
    {
      key: "profile",
      icon: "person-outline",
      onPress: function () {
        navigation.navigate("PayerProfile");
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
      key: "profile",
      icon: "person-outline",
      onPress: function () {
        navigation.navigate("WorkerProfile");
      },
    },
  ];
}

export {
  getAdminBottomNavConfig,
  getPayerBottomNavConfig,
  getWorkerBottomNavConfig,
};