import { useEffect, useState } from "react";
import { Alert, Text } from "react-native";
import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import { getUser, getActiveRole } from "../../../../services/storageService";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";
import PayerHomeCard from "../components/PayerHomeCard";
import { getPayerMenuItems } from "../../../../navigation/sideMenuConfigs";
import { getPayerCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";
import { getPayerBottomNavConfig } from "../../../../navigation/bottomNavConfigs";

export default function PayerCompetitionsBoardScreen(props) {
  const [user, setUser] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [menuMode, setMenuMode] = useState("general");
  const [selectedCompetition, setSelectedCompetition] = useState(null);

  useEffect(function () {
    loadData();
  }, []);

  async function loadData() {
    const storedUser = await getUser();
    const storedActiveRole = await getActiveRole();

    setUser(storedUser);
    setActiveRole(storedActiveRole);
  }

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

  function openCompetitionMenu(competition) {
    setSelectedCompetition(competition);
    setMenuMode("competition");
  }

  function exitCompetitionMenu() {
    setSelectedCompetition(null);
    setMenuMode("general");
  }

  async function handleLogout() {
    if (props.onLogout) {
      await props.onLogout();
    }
  }

  function handlePayerMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  function handleCompetitionMenuPress(item) {
    Alert.alert("בהמשך", "המסך " + item.label + " יתחבר כאן בהמשך");
  }

  return (
    <MobileScreenLayout
      title="לוח התחרויות"
      subtitle=""
      activeBottomTab="home"
      bottomNavItems={getPayerBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        if (menuMode === "competition" && selectedCompetition) {
          return (
            <CompetitionMenuTemplate
              activeKey=""
              closeMenu={closeMenu}
              competitionName={selectedCompetition.title}
              items={getPayerCompetitionMenuItems()}
              onItemPress={handleCompetitionMenuPress}
              onExitCompetition={exitCompetitionMenu}
            />
          );
        }

        return (
          <SideMenuTemplate
            activeKey="competitions"
            userName={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
            roleName={activeRole?.roleName || ""}
            ranchName={activeRole?.ranchName || ""}
            closeMenu={closeMenu}
            items={getPayerMenuItems()}
            onItemPress={handlePayerMenuPress}
            onSwitchRole={function () {
              props.navigation.replace("SelectActiveRole");
            }}
            onLogout={handleLogout}
          />
        );
      }}
    >
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
              openCompetitionMenu(item);
              Alert.alert("בהמשך", "מסך פרטי תחרות יתחבר כאן בהמשך");
            }}
            onEnterPress={function () {
              openCompetitionMenu(item);
              Alert.alert("בהמשך", "כניסה לתחרות תחובר בהמשך");
            }}
          />
        );
      })}
    </MobileScreenLayout>
  );
}
