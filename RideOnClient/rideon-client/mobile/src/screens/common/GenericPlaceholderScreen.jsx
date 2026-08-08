import { useState } from "react";
import { View, Text } from "react-native";
import MobileScreenLayout from "../../components/mobile-nav/MobileScreenLayout";
import SideMenuTemplate from "../../components/mobile-nav/SideMenuTemplate";
import CompetitionMenuTemplate from "../../components/mobile-nav/CompetitionMenuTemplate";
import roleSharedStyles from "../../styles/roleSharedStyles";
import { useUser } from "../../context/UserContext";
import { useActiveRole } from "../../context/ActiveRoleContext";
import { useCompetition } from "../../context/CompetitionContext";

import {
  getAdminMenuItems,
  getPayerMenuItems,
  getWorkerMenuItems,
} from "../../navigation/sideMenuConfigs";

import {
  getAdminCompetitionMenuItems,
  getPayerCompetitionMenuItems,
  getWorkerCompetitionMenuItems,
} from "../../navigation/competitionMenuConfigs";

import {
  getAdminBottomNavConfig,
  getPayerBottomNavConfig,
  getWorkerBottomNavConfig,
} from "../../navigation/bottomNavConfigs";

export default function GenericPlaceholderScreen(props) {
  var userContext = useUser();
  var activeRoleContext = useActiveRole();
  var competitionContext = useCompetition();

  var user = userContext.user;
  var activeRole = activeRoleContext.activeRole;
  var activeCompetition = competitionContext.activeCompetition;

  var [menuMode, setMenuMode] = useState(
    activeCompetition ? "competition" : "general"
  );

  function getRoleType() {
    if (!activeRole || !activeRole.roleName) return "worker";

    if (activeRole.roleName === "אדמין חווה") return "admin";
    if (activeRole.roleName === "משלם") return "payer";

    return "worker";
  }

  function getGeneralMenuItems() {
    var roleType = getRoleType();

    if (roleType === "admin") return getAdminMenuItems();
    if (roleType === "payer") return getPayerMenuItems();

    return getWorkerMenuItems();
  }

  function getCompetitionMenuItems() {
    var roleType = getRoleType();

    if (roleType === "admin") return getAdminCompetitionMenuItems();
    if (roleType === "payer") return getPayerCompetitionMenuItems();

    return getWorkerCompetitionMenuItems();
  }

  function getBottomNavItems() {
    var roleType = getRoleType();

    if (roleType === "admin")
      return getAdminBottomNavConfig(props.navigation);

    if (roleType === "payer")
      return getPayerBottomNavConfig(props.navigation);

    return getWorkerBottomNavConfig(props.navigation);
  }

  async function handleLogout() {
    if (props.onLogout) {
      await props.onLogout();
    }
  }

  function handleGeneralMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  function handleCompetitionMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  async function handleExitCompetition() {
    await competitionContext.clearCompetition();
    setMenuMode("general");

    var roleType = getRoleType();

    if (roleType === "admin") {
      props.navigation.navigate("AdminCompetitionsBoard");
      return;
    }

    if (roleType === "payer") {
      props.navigation.navigate("PayerCompetitionsBoard");
      return;
    }

    props.navigation.navigate("WorkerCompetitionsBoard");
  }

  return (
    <MobileScreenLayout
      title={props.title || "בהמשך"}
      subtitle=""
      activeBottomTab={props.activeBottomTab || null}
      bottomNavItems={getBottomNavItems()}
      menuContent={function ({ closeMenu }) {
        if (menuMode === "competition" && activeCompetition) {
          return (
            <CompetitionMenuTemplate
              activeKey={props.activeKey || ""}
              closeMenu={closeMenu}
              competitionName={activeCompetition.competitionName}
              items={getCompetitionMenuItems()}
              onItemPress={handleCompetitionMenuPress}
              onExitCompetition={handleExitCompetition}
            />
          );
        }

        return (
          <SideMenuTemplate
            activeKey={props.activeKey || ""}
            userName={
              (user &&
                (
                  (user.firstName || "") +
                  " " +
                  (user.lastName || "")
                ).trim()) ||
              ""
            }
            roleName={(activeRole && activeRole.roleName) || ""}
            ranchName={(activeRole && activeRole.ranchName) || ""}
            competitionName={
              activeCompetition
                ? activeCompetition.competitionName
                : ""
            }
            closeMenu={closeMenu}
            items={getGeneralMenuItems()}
            onItemPress={handleGeneralMenuPress}
            onSwitchRole={async function () {
              await competitionContext.clearCompetition();
              props.navigation.replace("SelectActiveRole");
            }}
            onLogout={handleLogout}
          />
        );
      }}
    >
      <View style={{ gap: 12 }}>
        <Text style={roleSharedStyles.sectionTitle}>
          {props.title || "בהמשך"}
        </Text>

        <Text
          style={{
            textAlign: "right",
            color: "#5D4037",
            fontSize: 16,
            lineHeight: 24,
          }}
        >
          כאן יהיה המסך: {props.title || "בהמשך"}
        </Text>

        {activeCompetition ? (
          <Text
            style={{
              textAlign: "right",
              color: "#7B5A4D",
              fontSize: 15,
            }}
          >
            תחרות פעילה: {activeCompetition.competitionName}
          </Text>
        ) : null}
      </View>
    </MobileScreenLayout>
  );
}