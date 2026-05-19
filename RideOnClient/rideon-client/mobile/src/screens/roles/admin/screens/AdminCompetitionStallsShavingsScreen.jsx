import React, { useState } from "react";

import {
  ActivityIndicator,
  Alert,
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

import StallBookingEditModal from "../../../../components/competitions/StallBookingEditModal";

import StallBookingCreateModal from "../../../../components/competitions/StallBookingCreateModal";

import { createStallBookingCancelRequest } from "../../../../services/stallBookingsService";

import styles from "../../../../styles/adminCompetitionStallsStyles";

export default function AdminCompetitionStallsShavingsScreen(props) {
  var activeRoleContext = useActiveRole();

  var competitionContext = useCompetition();

  var activeRole = activeRoleContext.activeRole;

  var activeCompetition = competitionContext.activeCompetition;

  var [showCreateStallModal, setShowCreateStallModal] = useState(false);

  var [showShavingsModal, setShowShavingsModal] = useState(false);

  var [selectedStallForShavings, setSelectedStallForShavings] = useState(null);

  var [showEditModal, setShowEditModal] = useState(false);

  var [selectedStallForEdit, setSelectedStallForEdit] = useState(null);

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

  function handleOpenCreateStallModal() {
    setShowCreateStallModal(true);
  }

  function handleCloseCreateStallModal() {
    setShowCreateStallModal(false);
  }

  async function handleStallCreated() {
    await overview.reload();
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

  function handleEditStallBooking(item) {
    if (!item || !item.stallBookingId) {
      Alert.alert("שגיאה", "לא נמצא מזהה הזמנת תא תקין");
      return;
    }

    if (item.isPaid) {
      Alert.alert("לא ניתן לערוך", "לא ניתן לערוך תא שכבר שולם");
      return;
    }

    if (
      item.isCancelled ||
      item.hasPendingCancellation ||
      item.hasPendingChange
    ) {
      Alert.alert("לא ניתן לערוך", "קיימת בקשה פתוחה או שהתא כבר בוטל");
      return;
    }

    setSelectedStallForEdit(item);
    setShowEditModal(true);
  }

  function handleCloseEditModal() {
    setShowEditModal(false);

    setSelectedStallForEdit(null);
  }

  async function handleEditCreated() {
    await overview.reload();

    setSelectedStallForEdit(null);
  }

  function handleCancelStallBooking(item) {
    if (!item || !item.stallBookingId) {
      Alert.alert("שגיאה", "לא נמצא מזהה הזמנת תא תקין");
      return;
    }

    if (item.isPaid) {
      Alert.alert("לא ניתן לבטל", "לא ניתן לבטל תא שכבר שולם");
      return;
    }

    if (
      item.isCancelled ||
      item.hasPendingCancellation ||
      item.hasPendingChange
    ) {
      Alert.alert("לא ניתן לבטל", "קיימת בקשה פתוחה או שהתא כבר בוטל");
      return;
    }

    if (!activeRole || !activeRole.ranchId) {
      Alert.alert("שגיאה", "לא נמצאה חווה פעילה");
      return;
    }

    Alert.alert("ביטול הזמנת תא", "האם לשלוח בקשת ביטול למזכירת התחרות?", [
      {
        text: "לא",
        style: "cancel",
      },
      {
        text: "כן, שלחי בקשה",
        style: "destructive",
        onPress: async function () {
          try {
            await createStallBookingCancelRequest({
              stallBookingId: item.stallBookingId,
              ranchId: activeRole.ranchId,
            });

            await overview.reload();

            Alert.alert("נשלח", "בקשת ביטול התא נשלחה בהצלחה");
          } catch (error) {
            console.log("CREATE STALL CANCEL REQUEST ERROR", error);

            Alert.alert(
              "שגיאה",
              String(
                error?.response?.data || "אירעה שגיאה בשליחת בקשת ביטול התא",
              ),
            );
          }
        },
      },
    ]);
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
          onDelete={handleCancelStallBooking}
          onEdit={handleEditStallBooking}
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
        <View style={styles.topActionsRow}>
          <Pressable
            style={styles.addStallTopButton}
            onPress={handleOpenCreateStallModal}
          >
            <Text style={styles.addStallTopButtonText}>+ הוסף תא</Text>
          </Pressable>

          <Pressable
            style={styles.addShavingsTopButton}
            onPress={handleOpenGeneralShavingsModal}
          >
            <Text style={styles.addShavingsTopButtonText}>
              + הוסף הזמנת נסורת
            </Text>
          </Pressable>
        </View>

        {renderContent()}

        <StallBookingCreateModal
          visible={showCreateStallModal}
          competitionId={activeCompetition?.competitionId}
          onClose={handleCloseCreateStallModal}
          onCreated={handleStallCreated}
        />

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

        <StallBookingEditModal
          visible={showEditModal}
          item={selectedStallForEdit}
          competitionId={activeCompetition?.competitionId}
          onClose={handleCloseEditModal}
          onUpdated={handleEditCreated}
        />
      </ScrollView>
    </MobileScreenLayout>
  );
}