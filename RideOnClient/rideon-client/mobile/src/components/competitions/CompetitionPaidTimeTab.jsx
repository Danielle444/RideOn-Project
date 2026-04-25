import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import CompetitionPaidTimeFormCard from "./CompetitionPaidTimeFormCard";
import styles from "../../styles/adminCompetitionPaidTimesStyles";

export default function CompetitionPaidTimeTab(props) {
  if (props.loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#7B5A4D" />
        <Text style={styles.loadingText}>טוענת נתוני פייד טיים...</Text>
      </View>
    );
  }

  return (
    <>
      {props.screenError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{props.screenError}</Text>
        </View>
      ) : null}

      <CompetitionPaidTimeFormCard
        priceCatalogItems={props.priceCatalogItems}
        requestableSlots={props.requestableSlots}
        riders={props.riders}
        horses={props.horses}
        trainers={props.trainers}
        payers={props.payers}
        selectedPriceCatalog={props.selectedPriceCatalog}
        selectedRequestedSlot={props.selectedRequestedSlot}
        selectedRider={props.selectedRider}
        selectedHorse={props.selectedHorse}
        selectedTrainer={props.selectedTrainer}
        selectedPayer={props.selectedPayer}
        notes={props.notes}
        setSelectedPriceCatalog={props.setSelectedPriceCatalog}
        setSelectedRequestedSlot={props.setSelectedRequestedSlot}
        setSelectedRider={props.setSelectedRider}
        setSelectedHorse={props.setSelectedHorse}
        setSelectedTrainer={props.setSelectedTrainer}
        setSelectedPayer={props.setSelectedPayer}
        setNotes={props.setNotes}
        locks={props.locks}
        onToggleLock={props.onToggleLock}
        formatPriceCatalogLabel={props.formatPriceCatalogLabel}
        formatRequestedSlotLabel={props.formatRequestedSlotLabel}
        formatMemberLabel={props.formatMemberLabel}
        formatHorseLabel={props.formatHorseLabel}
        formatPayerLabel={props.formatPayerLabel}
      />

      <Pressable
        style={[
          styles.primaryButton,
          !props.canSubmit ? styles.primaryButtonDisabled : null,
        ]}
        disabled={!props.canSubmit}
        onPress={props.onSubmit}
      >
        <Text style={styles.primaryButtonText}>
          {props.isSaving ? "שומרת..." : "הוסף בקשה"}
        </Text>
      </Pressable>
    </>
  );
}