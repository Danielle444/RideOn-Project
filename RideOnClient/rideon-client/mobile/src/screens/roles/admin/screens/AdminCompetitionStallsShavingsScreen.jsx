import React from "react";

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";

import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";

import { getAdminCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";

import { useActiveRole } from "../../../../context/ActiveRoleContext";

import { useCompetition } from "../../../../context/CompetitionContext";

import useAdminCompetitionStallsOverview from "../../../../hooks/useAdminCompetitionStallsOverview";

import CompetitionStallCard from "../../../../components/competitions/CompetitionStallCard";

import styles from "../../../../styles/adminCompetitionStallsStyles";

export default function AdminCompetitionStallsShavingsScreen(props) {
  var activeRoleContext = useActiveRole();

  var competitionContext = useCompetition();

  var activeRole = activeRoleContext.activeRole;

  var activeCompetition = competitionContext.activeCompetition;

  var overview = useAdminCompetitionStallsOverview({
    competitionId: activeCompetition?.competitionId,

    activeRole: activeRole,
  });

  var cards = Array.isArray(overview.cards) ? overview.cards : [];

  function handleCompetitionMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  async function handleExitCompetition() {
    await competitionContext.clearCompetition();

    props.navigation.navigate("AdminCompetitionsBoard");
  }

  function renderContent() {
    if (overview.loading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#7B5A4D" />

          <Text style={styles.loadingText}>טוענת תאים ונסורת...</Text>
        </View>
      );
    }

    if (overview.screenError) {
      return (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{overview.screenError}</Text>
        </View>
      );
    }

    if (cards.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>עדיין אין הזמנות תאים</Text>

          <Text style={styles.emptyText}>
            הזמנות תאים ונסורת יופיעו כאן לאחר יצירה
          </Text>
        </View>
      );
    }

    return cards.map(function (item) {
      return (
        <CompetitionStallCard key={String(item.stallBookingId)} item={item} />
      );
    });
  }

  return (
    <MobileScreenLayout
      title="תאים ונסורת"
      subtitle=""
      activeBottomTab={null}
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <CompetitionMenuTemplate
            activeKey="stalls-shavings"
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
        refreshControl={
          <RefreshControl
            refreshing={overview.loading}
            onRefresh={overview.reload}
          />
        }
      >
        {renderContent()}
      </ScrollView>
    </MobileScreenLayout>
  );
}
