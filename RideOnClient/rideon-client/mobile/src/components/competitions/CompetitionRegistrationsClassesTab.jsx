import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import CompetitionRegistrationFormCard from "./CompetitionRegistrationFormCard";
import styles from "../../styles/adminCompetitionRegistrationsStyles";

export default function CompetitionRegistrationsClassesTab(props) {
  if (props.loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#7B5A4D" />
        <Text style={styles.loadingText}>טוענת נתוני מקצים...</Text>
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

      <CompetitionRegistrationFormCard
        classes={props.classes}
        horses={props.horses}
        riders={props.riders}
        trainers={props.trainers}
        payers={props.payers}
        selectedClass={props.selectedClass}
        selectedHorse={props.selectedHorse}
        selectedRider={props.selectedRider}
        selectedTrainer={props.selectedTrainer}
        selectedPayer={props.selectedPayer}
        prizeRecipientName={props.prizeRecipientName}
        setPrizeRecipientName={props.setPrizeRecipientName}
        setSelectedClass={props.setSelectedClass}
        setSelectedHorse={props.setSelectedHorse}
        setSelectedRider={props.setSelectedRider}
        setSelectedTrainer={props.setSelectedTrainer}
        setSelectedPayer={props.setSelectedPayer}
        locks={props.locks}
        onToggleLock={props.onToggleLock}
        formatClassLabel={props.formatClassLabel}
        formatHorseLabel={props.formatHorseLabel}
        formatMemberLabel={props.formatMemberLabel}
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
          {props.isSaving ? "שומרת..." : "הוסף הרשמה"}
        </Text>
      </Pressable>
    </>
  );
}