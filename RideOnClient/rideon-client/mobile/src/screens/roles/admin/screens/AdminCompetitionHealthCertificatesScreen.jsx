import React from "react";

import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";

import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";

import HealthCertificateCard from "../../../../components/competitions/HealthCertificateCard";

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";

import { getAdminCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";

import { useActiveRole } from "../../../../context/ActiveRoleContext";

import { useCompetition } from "../../../../context/CompetitionContext";

import useAdminCompetitionHealthCertificates from "../../../../hooks/useAdminCompetitionHealthCertificates";

import horsesStyles from "../../../../styles/horsesStyles";

export default function AdminCompetitionHealthCertificatesScreen(props) {
  var activeRoleContext = useActiveRole();

  var competitionContext = useCompetition();

  var activeRole = activeRoleContext.activeRole;

  var activeCompetition = competitionContext.activeCompetition;

  var healthCertificates = useAdminCompetitionHealthCertificates({
    activeCompetition: activeCompetition,
    activeRole: activeRole,
  });

  function handleCompetitionMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  async function handleExitCompetition() {
    props.navigation.navigate("AdminCompetitionsBoard");
  }

  return (
    <MobileScreenLayout
      title="תעודות בריאות"
      subtitle=""
      activeBottomTab={null}
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <CompetitionMenuTemplate
            activeKey="health-certificates"
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
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 120,
        }}
      >
        {healthCertificates.loading ? (
          <View style={horsesStyles.loadingWrap}>
            <ActivityIndicator size="large" color="#7B5A4D" />

            <Text style={horsesStyles.loadingText}>טוען תעודות בריאות...</Text>
          </View>
        ) : null}

        {!healthCertificates.loading &&
        healthCertificates.certificates.length === 0 ? (
          <View style={horsesStyles.emptyCard}>
            <Text style={horsesStyles.emptyTitle}>אין סוסים רשומים</Text>

            <Text style={horsesStyles.emptyText}>
              לא נמצאו סוסים הרשומים לתחרות הפעילה.
            </Text>
          </View>
        ) : null}

        {!healthCertificates.loading
          ? healthCertificates.certificates.map(function (cert) {
              return (
                <HealthCertificateCard
                  key={String(cert.horseId)}
                  cert={cert}
                  uploadingHorseId={healthCertificates.uploadingHorseId}
                  onUpload={healthCertificates.uploadHealthCertificate}
                />
              );
            })
          : null}
      </ScrollView>
    </MobileScreenLayout>
  );
}
