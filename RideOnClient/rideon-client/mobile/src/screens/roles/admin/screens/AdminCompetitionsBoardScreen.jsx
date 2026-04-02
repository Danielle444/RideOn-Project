import { Alert, Text } from "react-native";
import { useState } from "react";
import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";
import AdminHomeCard from "../components/AdminHomeCard";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getAdminMenuItems } from "../../../../navigation/sideMenuConfigs";
import { getAdminCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";
import { useUser } from "../../../../context/UserContext";
import { useActiveRole } from "../../../../context/ActiveRoleContext";

export default function AdminCompetitionsBoardScreen(props) {
  const { user } = useUser();
  const { activeRole } = useActiveRole();

  const [menuMode, setMenuMode] = useState("general");
  const [selectedCompetition, setSelectedCompetition] = useState(null);

  const competitions = [
    {
      id: 1,
      title: "ריינינג 1+2 2026",
      dateText: "17-15 במרץ, 2026",
      ranchName: "חוות דאבל קיי",
      status: "כעת",
      registrationDisabled: true,
      enterDisabled: false,
    },
    {
      id: 2,
      title: "גביע הקיץ - קפיצות",
      dateText: "24-22 במרץ, 2026",
      ranchName: "מרכז הרכיבה הארצי",
      status: "פתוחה",
      registrationDisabled: false,
      enterDisabled: true,
    },
  ];

  async function handleLogout() {
    if (props.onLogout) {
      await props.onLogout();
    }
  }

  function openCompetitionMenu(competition) {
    setSelectedCompetition(competition);
    setMenuMode("competition");
  }

  function exitCompetitionMenu() {
    setSelectedCompetition(null);
    setMenuMode("general");
  }

  function handleAdminMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  function handleCompetitionMenuPress(item) {
    Alert.alert("בהמשך", "המסך " + item.label + " יתחבר כאן בהמשך");
  }

  return (
    <MobileScreenLayout
      title="לוח התחרויות"
      subtitle=""
      activeBottomTab={null}
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        if (menuMode === "competition" && selectedCompetition) {
          return (
            <CompetitionMenuTemplate
              activeKey=""
              closeMenu={closeMenu}
              competitionName={selectedCompetition.title}
              items={getAdminCompetitionMenuItems()}
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
            items={getAdminMenuItems()}
            onItemPress={handleAdminMenuPress}
            onSwitchRole={function () {
              props.navigation.replace("SelectActiveRole");
            }}
            onLogout={handleLogout}
          />
        );
      }}
    >
      <Text style={roleSharedStyles.sectionTitle}>תחרויות פעילות</Text>

      {competitions.map(function (item) {
        return (
          <AdminHomeCard
            key={item.id}
            title={item.title}
            dateText={item.dateText}
            ranchName={item.ranchName}
            status={item.status}
            registrationDisabled={item.registrationDisabled}
            enterDisabled={item.enterDisabled}
            onDetailsPress={function () {
              openCompetitionMenu(item);
              Alert.alert("בהמשך", "מסך פרטי תחרות יתחבר כאן בהמשך");
            }}
            onRegistrationPress={function () {
              openCompetitionMenu(item);
              Alert.alert("בהמשך", "מסך הרשמה יתחבר כאן בהמשך");
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