import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import CompetitionStallBookingFormCard from "./CompetitionStallBookingFormCard";
import CompetitionEquipmentStallFormCard from "./CompetitionEquipmentStallFormCard";
import styles from "../../styles/adminCompetitionPaidTimesStyles";

export default function CompetitionStallBookingsTab(props) {
  if (props.loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color="#7B5A4D" />
        <Text style={styles.loadingText}>טוען נתוני תאים...</Text>
      </View>
    );
  }

  if (props.screenError) {
    return (
      <View style={styles.errorCard}>
        <Text style={styles.errorText}>{props.screenError}</Text>
      </View>
    );
  }

  if (props.mode === "tack") {
    return (
      <CompetitionEquipmentStallFormCard
        tackStallTypeOptions={props.tackStallTypeOptions}
        selectedTackStallType={props.selectedTackStallType}
        setSelectedTackStallType={props.setSelectedTackStallType}
        tackQuantity={props.tackQuantity}
        setTackQuantity={props.setTackQuantity}
        tackSplitMode={props.tackSplitMode}
        setTackSplitMode={props.setTackSplitMode}
        allSelectedHorsePayers={props.allSelectedHorsePayers}
        selectedTackPayers={props.selectedTackPayers}
        toggleTackPayerSelection={props.toggleTackPayerSelection}
        tackNotes={props.tackNotes}
        setTackNotes={props.setTackNotes}
        derivedTackDates={props.derivedTackDates}
        onBack={props.handleBackToHorseMode}
        onSubmit={props.handleSubmitTackDraft}
        isSaving={props.isSaving}
        formatPayerLabel={props.formatPayerLabel}
        formatStallTypeLabel={props.formatStallTypeLabel}
      />
    );
  }

  return (
    <CompetitionStallBookingFormCard
      horseStallTypeOptions={props.horseStallTypeOptions}
      selectedHorseStallType={props.selectedHorseStallType}
      setSelectedHorseStallType={props.setSelectedHorseStallType}
      minCompetitionDate={props.minCompetitionDate}
      maxCompetitionDate={props.maxCompetitionDate}
      checkInDate={props.checkInDate}
      setCheckInDate={props.setCheckInDate}
      checkOutDate={props.checkOutDate}
      setCheckOutDate={props.setCheckOutDate}
      selectedHorseToAdd={props.selectedHorseToAdd}
      setSelectedHorseToAdd={props.setSelectedHorseToAdd}
      availableHorseOptions={props.availableHorseOptions}
      selectedHorseBookings={props.selectedHorseBookings}
      handleRemoveHorseBooking={props.handleRemoveHorseBooking}
      getAvailablePayersForHorse={props.getAvailablePayersForHorse}
      toggleHorsePayerSelection={props.toggleHorsePayerSelection}
      expandedHorseEditorId={props.expandedHorseEditorId}
      toggleHorseEditor={props.toggleHorseEditor}
      notes={props.notes}
      setNotes={props.setNotes}
      isSaving={props.isSaving}
      onSubmit={props.handleCreateHorseStallBookings}
      onOpenTackMode={props.handleOpenTackMode}
      formatHorseLabel={props.formatHorseLabel}
      formatPayerLabel={props.formatPayerLabel}
      formatStallTypeLabel={props.formatStallTypeLabel}
    />
  );
}