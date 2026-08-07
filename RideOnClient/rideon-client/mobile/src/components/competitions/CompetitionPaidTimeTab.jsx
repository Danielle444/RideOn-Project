import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import CompetitionPaidTimeFormCard from "./CompetitionPaidTimeFormCard";
import PaidTimeRequestReviewModal from "./PaidTimeRequestReviewModal";
import PaidTimeRequestSuccessModal from "./PaidTimeRequestSuccessModal";
import PaidTimeSetupNotice from "./PaidTimeSetupNotice";
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

  var fieldErrors = props.fieldErrors || {};
  var hasFieldErrors = Object.keys(fieldErrors).length > 0;
  var availability = props.availability || null;

  // אין סלוטים או אין מחירים - הטופס לא יכול להצליח, ולכן מוצג הסבר
  // במקום טופס שכל שליחה שלו תיכשל.
  if (availability && !availability.canBookSingle && !props.screenError) {
    return (
      <PaidTimeSetupNotice
        message={availability.message}
        hint={availability.hint}
      />
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
        payerFieldDisabled={props.payerFieldDisabled}
        formatRequestedSlotLabel={props.formatRequestedSlotLabel}
        formatMemberLabel={props.formatMemberLabel}
        formatHorseLabel={props.formatHorseLabel}
        formatPayerLabel={props.formatPayerLabel}
        fieldErrors={fieldErrors}
        scrollRequest={props.scrollRequest}
        onScrollToOffset={props.onScrollToOffset}
        isEditMode={props.isEditMode}
        editCanModify={props.editCanModify}
        editCanCancel={props.editCanCancel}
        editStatus={props.editStatus}
      />

      {hasFieldErrors ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>
            חסרים שדות חובה. ההשלמות המסומנות מופיעות מתחת לכל שדה.
          </Text>
        </View>
      ) : null}

      {props.formError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{props.formError}</Text>
        </View>
      ) : null}

      {/* CAP-1: מצב עריכה שומר ישירות - אין מסך סקירה/הצלחה שמניח "בקשה
          חדשה" (ראו PaidTimeCreateModal). שגיאת שמירה מוצגת כאן, כמו שגיאות
          השדות למעלה. */}
      {props.isEditMode && props.submitError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{props.submitError}</Text>
        </View>
      ) : null}

      <Pressable
        style={[
          styles.primaryButton,
          !props.canSubmit ? styles.primaryButtonDisabled : null,
        ]}
        disabled={!props.canSubmit}
        onPress={props.isEditMode ? props.onSaveEdit : props.onContinueToReview}
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonText}>
          {props.isEditMode ? "שמירת שינויים" : "המשך לאישור"}
        </Text>
      </Pressable>

      {!props.isEditMode ? (
        <PaidTimeRequestReviewModal
          visible={!!props.isReviewOpen}
          model={props.reviewModel}
          isSaving={props.isSaving}
          errorMessage={props.submitError}
          onBackToEdit={props.onBackToEdit}
          onConfirm={props.onConfirmSubmit}
        />
      ) : null}

      {!props.isEditMode ? (
        <PaidTimeRequestSuccessModal
          visible={!!props.isSuccessOpen}
          snapshot={props.successSnapshot}
          onAddAnother={props.onAddAnother}
          onFinish={props.onFinish}
        />
      ) : null}
    </>
  );
}
