import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";
import CompetitionRegistrationFormCard from "../../../../components/competitions/CompetitionRegistrationFormCard";

import styles from "../../../../styles/adminCompetitionRegistrationsStyles";

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getAdminCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";

import { useUser } from "../../../../context/UserContext";
import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { useCompetition } from "../../../../context/CompetitionContext";

import useAdminCompetitionRegistrations from "../../../../hooks/useAdminCompetitionRegistrations";

export default function AdminCompetitionRegistrationsScreen(props) {
  var userContext = useUser();
  var activeRoleContext = useActiveRole();
  var competitionContext = useCompetition();

  var user = userContext.user;
  var activeRole = activeRoleContext.activeRole;
  var activeCompetition = competitionContext.activeCompetition;

  var competitionId =
    props.route?.params?.competitionId ||
    activeCompetition?.competitionId ||
    null;

  var registration = useAdminCompetitionRegistrations({
    user: user,
    activeRole: activeRole,
    competitionId: competitionId,
  });

  function handleCompetitionMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  async function handleExitCompetition() {
    await competitionContext.clearCompetition();
    props.navigation.navigate("AdminCompetitionsBoard");
  }

  return (
    <MobileScreenLayout
      title="הכנסת הרשמות"
      subtitle=""
      activeBottomTab={null}
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <CompetitionMenuTemplate
            activeKey="competition-registration"
            closeMenu={closeMenu}
            competitionName={
              activeCompetition ? activeCompetition.competitionName : ""
            }
            items={getAdminCompetitionMenuItems()}
            onItemPress={handleCompetitionMenuPress}
            onExitCompetition={handleExitCompetition}
          />
        );
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.screenContent}
      >
        {registration.screenError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{registration.screenError}</Text>
          </View>
        ) : null}

        {registration.loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#7B5A4D" />
            <Text style={styles.loadingText}>טוענת נתונים...</Text>
          </View>
        ) : (
          <>
            <CompetitionRegistrationFormCard
              classes={registration.classes}
              horses={registration.horses}
              riders={registration.riders}
              trainers={registration.trainers}
              payers={registration.payers}
              selectedClass={registration.selectedClass}
              selectedHorse={registration.selectedHorse}
              selectedRider={registration.selectedRider}
              selectedTrainer={registration.selectedTrainer}
              selectedPayer={registration.selectedPayer}
              prizeRecipientName={registration.prizeRecipientName}
              setPrizeRecipientName={registration.setPrizeRecipientName}
              setSelectedClass={registration.setSelectedClass}
              setSelectedHorse={registration.setSelectedHorse}
              setSelectedRider={registration.setSelectedRider}
              setSelectedTrainer={registration.setSelectedTrainer}
              setSelectedPayer={registration.setSelectedPayer}
              locks={registration.locks}
              onToggleLock={registration.handleToggleLock}
              formatClassLabel={registration.formatClassLabel}
              formatHorseLabel={registration.formatHorseLabel}
              formatMemberLabel={registration.formatMemberLabel}
              formatPayerLabel={registration.formatPayerLabel}
            />

            <Pressable
              style={[
                styles.primaryButton,
                !registration.canSubmit ? styles.primaryButtonDisabled : null,
              ]}
              disabled={!registration.canSubmit}
              onPress={registration.handleCreateEntry}
            >
              <Text style={styles.primaryButtonText}>
                {registration.isSaving ? "שומרת..." : "הוסף הרשמה"}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </MobileScreenLayout>
  );
}