import React, { useState } from "react";

import {
  ActivityIndicator,
  Pressable,
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

import ShavingsOrderModal from "../../../../components/competitions/ShavingsOrderModal";

import styles from "../../../../styles/adminCompetitionStallsStyles";

export default function AdminCompetitionStallsShavingsScreen(props) {
  var activeRoleContext = useActiveRole();

  var competitionContext = useCompetition();

  var activeRole = activeRoleContext.activeRole;

  var activeCompetition = competitionContext.activeCompetition;

  var [showShavingsModal, setShowShavingsModal] = useState(false);

  var [selectedStallForShavings, setSelectedStallForShavings] = useState(null);

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

  function handleOpenGeneralShavingsModal() {
    setSelectedStallForShavings(null);

    setShowShavingsModal(true);
  }

  function handleAddShavingsForStall(item) {
    setSelectedStallForShavings(item);

    setShowShavingsModal(true);
  }

  function handleCloseShavingsModal() {
    setShowShavingsModal(false);

    setSelectedStallForShavings(null);
  }

  async function handleShavingsCreated() {
    await overview.reload();

    setSelectedStallForShavings(null);
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
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>עדיין אין הזמנות תאים</Text>

          <Text style={styles.emptySubtitle}>
            הזמנות תאים ונסורת יופיעו כאן לאחר יצירה
          </Text>
        </View>
      );
    }

    return cards.map(function (item) {
      return (
        <CompetitionStallCard
          key={String(item.stallBookingId)}
          item={item}
          onAddShavings={handleAddShavingsForStall}
        />
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
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={overview.loading}
            onRefresh={overview.reload}
          />
        }
      >
        <Pressable
          style={styles.addShavingsTopButton}
          onPress={handleOpenGeneralShavingsModal}
        >
          <Text style={styles.addShavingsTopButtonText}>
            + הוסף הזמנת נסורת
          </Text>
        </Pressable>

        {renderContent()}

        <ShavingsOrderModal
          visible={showShavingsModal}
          competitionId={activeCompetition?.competitionId}
          initialStallBookingId={
            selectedStallForShavings
              ? selectedStallForShavings.stallBookingId
              : null
          }
          onClose={handleCloseShavingsModal}
          onCreated={handleShavingsCreated}
        />
      </ScrollView>
    </MobileScreenLayout>
  );
}
