import { Alert, Text, View, Pressable } from "react-native";
import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import PayerHomeCard from "../components/PayerHomeCard";
import { getPayerBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import { getPayerMenuItems } from "../../../../navigation/sideMenuConfigs";
import { useUser } from "../../../../context/UserContext";
import { useActiveRole } from "../../../../context/ActiveRoleContext";

export default function PayerHomeScreen(props) {
  const { user } = useUser();
  const { activeRole } = useActiveRole();

  const competitions = [
    {
      id: 1,
      title: "אליפות ישראל ברדרסאד'",
      dateText: "15-17 מרץ 2026",
      ranchName: "חוות הגליל העליון",
      status: "כעת",
      statusStyle: roleSharedStyles.statusNow,
    },
    {
      id: 2,
      title: "גביע הקיץ - קפיצות",
      dateText: "22-24 מרץ 2026",
      ranchName: "מרכז הרכיבה הארצי",
      status: "פתוחה",
      statusStyle: roleSharedStyles.statusOpen,
    },
  ];

  function goToBoard() {
    props.navigation.navigate("PayerCompetitionsBoard");
  }

  async function handleLogout() {
    if (props.onLogout) {
      await props.onLogout();
    }
  }

  return (
    <MobileScreenLayout
      title="דף הבית"
      subtitle=""
      activeBottomTab="home"
      bottomNavItems={getPayerBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <SideMenuTemplate
            userName={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
            roleName={activeRole?.roleName || ""}
            ranchName={activeRole?.ranchName || ""}
            closeMenu={closeMenu}
            items={getPayerMenuItems(props.navigation)}
            onItemPress={function (item) {
              props.navigation.navigate(item.screen);
            }}
            onSwitchRole={function () {
              props.navigation.replace("SelectActiveRole");
              closeMenu();
            }}
            onLogout={async function () {
              await handleLogout();
              closeMenu();
            }}
          />
        );
      }}
    >
      <View style={roleSharedStyles.welcomeCard}>
        <Text style={roleSharedStyles.welcomeTitle}>
          שלום {user?.firstName || ""},
        </Text>
        <Text style={roleSharedStyles.welcomeText}>
          ברוכה הבאה למערכת RideOn
        </Text>
      </View>

      <Pressable style={roleSharedStyles.shortcutButton} onPress={goToBoard}>
        <Text style={roleSharedStyles.shortcutButtonText}>לוח התחרויות</Text>
      </Pressable>

      <Text style={roleSharedStyles.sectionTitle}>התחרויות שלי</Text>

      {competitions.map(function (item) {
        return (
          <PayerHomeCard
            key={item.id}
            title={item.title}
            dateText={item.dateText}
            ranchName={item.ranchName}
            status={item.status}
            statusStyle={item.statusStyle}
            onDetailsPress={function () {
              Alert.alert("בהמשך", "מסך פרטי תחרות יתחבר כאן בהמשך");
            }}
            onEnterPress={function () {
              props.navigation.navigate("PayerCompetitionsBoard");
            }}
          />
        );
      })}
    </MobileScreenLayout>
  );
}