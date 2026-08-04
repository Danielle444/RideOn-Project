import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import CompetitionRegistrationFormCard from "./CompetitionRegistrationFormCard";

import styles from "../../styles/adminCompetitionRegistrationsStyles";

// CAP-1 approved strings - shared verbatim across all three create surfaces
// (this component is reused by the inline registrations tab and both
// CompetitionEntryCreateModal create call sites), since they all render
// through this one component.
var CREATE_SUCCESS_MESSAGE = "נרשמה הרשמה בהצלחה ✓";

function formatCreatedTallyMessage(count) {
  if (count === 1) {
    return "הרשמה אחת נוספה";
  }

  return count + " הרשמות נוספו";
}

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
        horsesLoading={props.horsesLoading}
        onSearchHorses={props.onSearchHorses}
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

      {props.justCreated ? (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>{CREATE_SUCCESS_MESSAGE}</Text>

          {props.createdCount > 0 ? (
            <Text style={styles.successTallyText}>
              {formatCreatedTallyMessage(props.createdCount)}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Pressable
        style={[
          styles.primaryButton,
          !props.canSubmit ? styles.primaryButtonDisabled : null,
        ]}
        disabled={!props.canSubmit}
        onPress={props.onSubmit}
      >
        <Text
          style={[
            styles.primaryButtonText,
            !props.canSubmit ? styles.primaryButtonTextDisabled : null,
          ]}
        >
          {props.isSaving ? "שומרת..." : props.submitButtonText || "הוסף הרשמה"}
        </Text>
      </Pressable>
    </>
  );
}
