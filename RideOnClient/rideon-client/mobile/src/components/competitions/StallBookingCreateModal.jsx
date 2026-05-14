import React from "react";

import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useUser } from "../../context/UserContext";
import { useActiveRole } from "../../context/ActiveRoleContext";
import { useCompetition } from "../../context/CompetitionContext";

import useAdminCompetitionStallBookings from "../../hooks/useAdminCompetitionStallBookings";

import CompetitionStallBookingsTab from "../competitionRegistrations/CompetitionStallBookingsTab";

import styles from "../../styles/adminCompetitionStallsStyles";

function normalizeDateForInput(value) {
  if (!value) {
    return "";
  }

  var text = String(value).trim();

  if (!text) {
    return "";
  }

  if (text.includes("T")) {
    return text.split("T")[0];
  }

  if (text.length >= 10) {
    return text.slice(0, 10);
  }

  return text;
}

export default function StallBookingCreateModal(props) {
  var userContext = useUser();
  var activeRoleContext = useActiveRole();
  var competitionContext = useCompetition();

  var user = userContext.user;
  var activeRole = activeRoleContext.activeRole;
  var activeCompetition = competitionContext.activeCompetition;

  var competitionId =
    props.competitionId || activeCompetition?.competitionId || null;

  var minCompetitionDate = normalizeDateForInput(
    activeCompetition?.competitionStartDate ||
      activeCompetition?.CompetitionStartDate,
  );

  var maxCompetitionDate = normalizeDateForInput(
    activeCompetition?.competitionEndDate ||
      activeCompetition?.CompetitionEndDate,
  );

  var stallBookings = useAdminCompetitionStallBookings({
    user: user,
    activeRole: activeRole,
    competitionId: competitionId,
    activeCompetition: activeCompetition,
    isActiveTab: props.visible,
  });

  async function handleCreated() {
    if (typeof props.onCreated === "function") {
      await props.onCreated();
    }

    if (typeof props.onClose === "function") {
      props.onClose();
    }
  }

  async function handleCreateHorseStallBookings() {
    var success = await stallBookings.handleCreateHorseStallBookings();

    if (success) {
      await handleCreated();
    }
  }

  async function handleSubmitTackDraft() {
    var success = await stallBookings.handleSubmitTackDraft();

    if (success) {
      await handleCreated();
    }
  }

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={props.onClose}
    >
      <SafeAreaView style={styles.shavingsModalContainer}>
        <View style={styles.shavingsModalHeader}>
          <Pressable
            onPress={props.onClose}
            style={styles.shavingsModalCloseButton}
          >
            <Ionicons name="close-outline" size={28} color="#4F3B31" />
          </Pressable>

          <Text style={styles.shavingsModalTitle}>הוספת תא</Text>

          <View style={styles.shavingsModalHeaderSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.shavingsModalContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <CompetitionStallBookingsTab
            mode={stallBookings.mode}
            loading={stallBookings.loading}
            screenError={stallBookings.screenError}
            horseStallTypeOptions={stallBookings.horseStallTypeOptions}
            tackStallTypeOptions={stallBookings.tackStallTypeOptions}
            selectedHorseStallType={stallBookings.selectedHorseStallType}
            setSelectedHorseStallType={stallBookings.setSelectedHorseStallType}
            minCompetitionDate={minCompetitionDate}
            maxCompetitionDate={maxCompetitionDate}
            startDate={stallBookings.startDate}
            setstartDate={stallBookings.setstartDate}
            endDate={stallBookings.endDate}
            setendDate={stallBookings.setendDate}
            notes={stallBookings.notes}
            setNotes={stallBookings.setNotes}
            selectedHorseToAdd={stallBookings.selectedHorseToAdd}
            setSelectedHorseToAdd={stallBookings.setSelectedHorseToAdd}
            selectedHorseBookings={stallBookings.selectedHorseBookings}
            availableHorseOptions={stallBookings.availableHorseOptions}
            allEligibleHorsesAlreadyBooked={
              stallBookings.allEligibleHorsesAlreadyBooked
            }
            hasAnyHorseStallBookingsForCompetition={
              stallBookings.hasAnyHorseStallBookingsForCompetition
            }
            handleRemoveHorseBooking={stallBookings.handleRemoveHorseBooking}
            getAvailablePayersForHorse={
              stallBookings.getAvailablePayersForHorse
            }
            toggleHorsePayerSelection={stallBookings.toggleHorsePayerSelection}
            expandedHorseEditorId={stallBookings.expandedHorseEditorId}
            toggleHorseEditor={stallBookings.toggleHorseEditor}
            bookedHorseNamesSummary={stallBookings.bookedHorseNamesSummary}
            handleCreateHorseStallBookings={handleCreateHorseStallBookings}
            handleOpenTackMode={stallBookings.handleOpenTackMode}
            selectedTackStallType={stallBookings.selectedTackStallType}
            setSelectedTackStallType={stallBookings.setSelectedTackStallType}
            tackQuantity={stallBookings.tackQuantity}
            setTackQuantity={stallBookings.setTackQuantity}
            tackSplitMode={stallBookings.tackSplitMode}
            setTackSplitMode={stallBookings.setTackSplitMode}
            selectedTackPayers={stallBookings.selectedTackPayers}
            toggleTackPayerSelection={stallBookings.toggleTackPayerSelection}
            tackNotes={stallBookings.tackNotes}
            setTackNotes={stallBookings.setTackNotes}
            tackStartDate={stallBookings.tackStartDate}
            setTackStartDate={stallBookings.setTackStartDate}
            tackEndDate={stallBookings.tackEndDate}
            setTackEndDate={stallBookings.setTackEndDate}
            tackPricingSummary={stallBookings.tackPricingSummary}
            allSelectedHorsePayers={stallBookings.allSelectedHorsePayers}
            allTackTypes={stallBookings.allTackTypes}
            existingTackBookingsCount={stallBookings.existingTackBookingsCount}
            handleBackToHorseMode={stallBookings.handleBackToHorseMode}
            handleSubmitTackDraft={handleSubmitTackDraft}
            isSaving={stallBookings.isSaving}
            formatHorseLabel={stallBookings.formatHorseLabel}
            formatPayerLabel={stallBookings.formatPayerLabel}
            formatStallTypeLabel={stallBookings.formatStallTypeLabel}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
