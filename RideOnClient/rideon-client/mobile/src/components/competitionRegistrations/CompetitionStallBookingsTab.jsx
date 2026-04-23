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

  if (props.mode === "equipment") {
    return (
      <CompetitionEquipmentStallFormCard
        equipmentStallTypeOptions={props.equipmentStallTypeOptions}
        selectedEquipmentStallType={props.selectedEquipmentStallType}
        setSelectedEquipmentStallType={props.setSelectedEquipmentStallType}
        equipmentQuantity={props.equipmentQuantity}
        setEquipmentQuantity={props.setEquipmentQuantity}
        equipmentSplitMode={props.equipmentSplitMode}
        setEquipmentSplitMode={props.setEquipmentSplitMode}
        selectedEquipmentPayers={props.selectedEquipmentPayers}
        toggleEquipmentPayerSelection={props.toggleEquipmentPayerSelection}
        equipmentNotes={props.equipmentNotes}
        setEquipmentNotes={props.setEquipmentNotes}
        equipmentStartDate={props.equipmentStartDate}
        setEquipmentStartDate={props.setEquipmentStartDate}
        equipmentEndDate={props.equipmentEndDate}
        setEquipmentEndDate={props.setEquipmentEndDate}
        equipmentPricingSummary={props.equipmentPricingSummary}
        minCompetitionDate={props.minCompetitionDate}
        maxCompetitionDate={props.maxCompetitionDate}
        allSelectedHorsePayers={props.allSelectedHorsePayers}
        allHorseStallTypes={props.allHorseStallTypes}
        existingEquipmentBookingsCount={props.existingEquipmentBookingsCount}
        onBack={props.handleBackToHorseMode}
        onSubmit={props.handleSubmitEquipmentDraft}
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
      allEligibleHorsesAlreadyBooked={props.allEligibleHorsesAlreadyBooked}
      hasAnyHorseStallBookingsForCompetition={props.hasAnyHorseStallBookingsForCompetition}
      handleRemoveHorseBooking={props.handleRemoveHorseBooking}
      getAvailablePayersForHorse={props.getAvailablePayersForHorse}
      toggleHorsePayerSelection={props.toggleHorsePayerSelection}
      expandedHorseEditorId={props.expandedHorseEditorId}
      toggleHorseEditor={props.toggleHorseEditor}
      notes={props.notes}
      setNotes={props.setNotes}
      bookedHorseNamesSummary={props.bookedHorseNamesSummary}
      isSaving={props.isSaving}
      onSubmit={props.handleCreateHorseStallBookings}
      onOpenEquipmentMode={props.handleOpenEquipmentMode}
      formatHorseLabel={props.formatHorseLabel}
      formatPayerLabel={props.formatPayerLabel}
      formatStallTypeLabel={props.formatStallTypeLabel}
    />
  );
}