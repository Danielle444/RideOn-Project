import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import CompetitionStallBookingFormCard from "./CompetitionStallBookingFormCard";
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

  return (
    <CompetitionStallBookingFormCard
      horses={props.horses}
      stallTypeOptions={props.stallTypeOptions}
      availablePayersForSelectedHorse={props.availablePayersForSelectedHorse}
      selectedHorse={props.selectedHorse}
      selectedPayers={props.selectedPayers}
      selectedStallType={props.selectedStallType}
      checkInDate={props.checkInDate}
      checkOutDate={props.checkOutDate}
      notes={props.notes}
      setSelectedHorse={props.setSelectedHorse}
      setSelectedStallType={props.setSelectedStallType}
      togglePayerSelection={props.togglePayerSelection}
      setCheckInDate={props.setCheckInDate}
      setCheckOutDate={props.setCheckOutDate}
      setNotes={props.setNotes}
      isSaving={props.isSaving}
      onSubmit={props.handleCreateStallBooking}
      formatHorseLabel={props.formatHorseLabel}
      formatPayerLabel={props.formatPayerLabel}
      formatStallTypeLabel={props.formatStallTypeLabel}
    />
  );
}