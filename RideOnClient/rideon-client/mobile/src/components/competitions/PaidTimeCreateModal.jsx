import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useEffect, useMemo, useRef } from "react";

import { Ionicons } from "@expo/vector-icons";

import { useUser } from "../../context/UserContext";
import { useActiveRole } from "../../context/ActiveRoleContext";
import { useCompetition } from "../../context/CompetitionContext";

import useAdminCompetitionPaidTimes from "../../hooks/useAdminCompetitionPaidTimes";

import CompetitionPaidTimeTab from "./CompetitionPaidTimeTab";
import RegistrationStepNotice from "./RegistrationStepNotice";

import { evaluatePaidTimeBookingAvailability } from "../../utils/paidTimeBookingAvailability";
import { buildRegistrationStepNoticeMessage } from "../../utils/registrationStepNoticeMessages";

import styles from "../../styles/adminCompetitionClassesStyles";

// זמן ההשהיה לפני סגירת מודל היצירה אחרי סגירת מודל ההצלחה, כדי לפרק את שני
// ה-Modal-ים המקוננים בפריימים נפרדים (תואם למשך אנימציית ה-fade של RN).
var MODAL_TEARDOWN_DELAY_MS = 300;

// CAP-5: focused, frontend-only single-form paid-time create surface for the
// payer-account screen. Deliberately reuses CompetitionPaidTimeTab +
// useAdminCompetitionPaidTimes exactly as the real Registrations screen does
// (no chatbot/bulk booking, no new backend endpoint) - only the payer lock
// and the modal chrome are new.
export default function PaidTimeCreateModal(props) {
  var userContext = useUser();

  var activeRoleContext = useActiveRole();

  var competitionContext = useCompetition();

  var user = userContext.user;

  var activeRole = activeRoleContext.activeRole;

  var activeCompetition = competitionContext.activeCompetition;

  var lockedPayerPersonId = props.lockedPayerPersonId || null;

  var paidTimesStepAvailability = props.paidTimesStepAvailability || {
    isEnabled: false,
    isVisible: false,
  };

  var isRegistrationStatusLoading = !!props.isRegistrationStatusLoading;

  var paidTime = useAdminCompetitionPaidTimes({
    user: user,
    activeRole: activeRole,
    competitionId: activeCompetition?.competitionId,
    competitionName: activeCompetition
      ? activeCompetition.competitionName
      : "",
  });

  // Same data-level gate CompetitionPaidTimeTab already uses on the real
  // Registrations screen (are there slots/prices to even pick from) - not
  // the registration-step gate above, which is a different concept (see
  // paidTimesStepAvailability).
  var paidTimeAvailability = useMemo(
    function () {
      return evaluatePaidTimeBookingAvailability({
        requestableSlots: paidTime.requestableSlots,
        priceCatalogItems: paidTime.priceCatalogItems,
      });
    },
    [paidTime.requestableSlots, paidTime.priceCatalogItems],
  );

  // Hard-locks the payer to the account this modal was opened from. Unlike
  // CompetitionEntryCreateModal's payer lock (which only engages the
  // retain-across-submits icon), this surface must make the field literally
  // impossible to change or clear - payerFieldDisabled (threaded through
  // CompetitionPaidTimeTab -> CompetitionPaidTimeFormCard) gates the
  // dropdown's open/clear handlers directly.
  useEffect(
    function () {
      if (!props.visible || !lockedPayerPersonId) return;
      if (!paidTime.payers || paidTime.payers.length === 0) return;

      var lockedPayer = paidTime.payers.find(function (item) {
        return item.personId === lockedPayerPersonId;
      });

      if (!lockedPayer) return;

      paidTime.setSelectedPayer(lockedPayer);

      if (!paidTime.locks?.payer) {
        paidTime.handleToggleLock("payer");
      }
    },
    [props.visible, lockedPayerPersonId, paidTime.payers],
  );

  // Resets any in-progress review/success state the moment the modal is
  // dismissed, so reopening it later always starts clean - same pattern as
  // CompetitionEntryCreateModal's tally-reset effect.
  var wasVisibleRef = useRef(props.visible);

  useEffect(
    function () {
      var wasVisible = wasVisibleRef.current;
      wasVisibleRef.current = props.visible;

      if (wasVisible && !props.visible) {
        paidTime.handleBackToEdit();
        paidTime.handleCloseSuccess();
      }
    },
    [props.visible],
  );

  // Reloads the payer account the instant a request is created (isSuccessOpen
  // flips false -> true), not deferred to when the user later dismisses the
  // success screen - so the account behind this modal is already current.
  useEffect(
    function () {
      if (paidTime.isSuccessOpen && typeof props.onCreated === "function") {
        props.onCreated();
      }
    },
    [paidTime.isSuccessOpen],
  );

  var contentScrollRef = useRef(null);

  function handleScrollToOffset(offsetY) {
    var scrollView = contentScrollRef.current;

    if (!scrollView || typeof scrollView.scrollTo !== "function") {
      return;
    }

    scrollView.scrollTo({ y: Math.max(0, offsetY), animated: true });
  }

  // "בקשה נוספת" - נשאר בטופס (המודל לא נסגר), אותה התנהגות איפוס כמו במסך
  // הרשמות עצמו.
  function handleAddAnother() {
    paidTime.handleCloseSuccess();
    handleScrollToOffset(0);
  }

  // "סיום" - סוגר את המודל (אין מסך פייד טיימים נפרד לנווט אליו מתוך מודל).
  //
  // חובה לפרק את שני ה-Modal-ים בפריימים נפרדים: מודל ההצלחה (transparent/fade)
  // מקונן בתוך מודל היצירה (fullScreen/slide). סגירת שניהם באותו tick סינכרוני
  // מקפיאה את RN למסך שחור שדורש הפעלה מחדש של האפליקציה. לכן קודם סוגרים את
  // מודל ההצלחה, ורק בפריים הבא סוגרים את מודל היצירה.
  function handleFinish() {
    paidTime.handleCloseSuccess();

    if (typeof props.onClose === "function") {
      setTimeout(function () {
        props.onClose();
      }, MODAL_TEARDOWN_DELAY_MS);
    }
  }

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={props.onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Pressable onPress={props.onClose} style={styles.modalCloseButton}>
            <Ionicons name="close-outline" size={28} color="#4F3B31" />
          </Pressable>

          <Text style={styles.modalTitle}>הוספת פייד טיים</Text>

          <View style={styles.modalHeaderSpacer} />
        </View>

        <ScrollView
          ref={contentScrollRef}
          contentContainerStyle={styles.modalContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!paidTimesStepAvailability.isEnabled ? (
            <RegistrationStepNotice
              message={buildRegistrationStepNoticeMessage(
                paidTimesStepAvailability,
                isRegistrationStatusLoading,
              )}
              containerStyle={styles.errorCard}
              textStyle={styles.errorText}
            />
          ) : null}

          <CompetitionPaidTimeTab
            loading={paidTime.loading}
            screenError={paidTime.screenError}
            priceCatalogItems={paidTime.priceCatalogItems}
            requestableSlots={paidTime.requestableSlots}
            riders={paidTime.riders}
            horses={paidTime.horses}
            trainers={paidTime.trainers}
            payers={paidTime.payers}
            selectedPriceCatalog={paidTime.selectedPriceCatalog}
            selectedRequestedSlot={paidTime.selectedRequestedSlot}
            selectedRider={paidTime.selectedRider}
            selectedHorse={paidTime.selectedHorse}
            selectedTrainer={paidTime.selectedTrainer}
            selectedPayer={paidTime.selectedPayer}
            notes={paidTime.notes}
            setSelectedPriceCatalog={paidTime.setSelectedPriceCatalog}
            setSelectedRequestedSlot={paidTime.setSelectedRequestedSlot}
            setSelectedRider={paidTime.setSelectedRider}
            setSelectedHorse={paidTime.setSelectedHorse}
            setSelectedTrainer={paidTime.setSelectedTrainer}
            setSelectedPayer={paidTime.setSelectedPayer}
            setNotes={paidTime.setNotes}
            locks={paidTime.locks}
            onToggleLock={paidTime.handleToggleLock}
            payerFieldDisabled={!!lockedPayerPersonId}
            formatRequestedSlotLabel={paidTime.formatRequestedSlotLabel}
            formatMemberLabel={paidTime.formatMemberLabel}
            formatHorseLabel={paidTime.formatHorseLabel}
            formatPayerLabel={paidTime.formatPayerLabel}
            canSubmit={
              paidTime.canSubmit && paidTimesStepAvailability.isEnabled
            }
            isSaving={paidTime.isSaving}
            fieldErrors={paidTime.fieldErrors}
            formError={paidTime.formError}
            scrollRequest={paidTime.scrollRequest}
            onScrollToOffset={handleScrollToOffset}
            onContinueToReview={paidTime.handleContinueToReview}
            isReviewOpen={
              paidTime.isReviewOpen && paidTimesStepAvailability.isEnabled
            }
            reviewModel={paidTime.reviewModel}
            submitError={paidTime.submitError}
            onBackToEdit={paidTime.handleBackToEdit}
            onConfirmSubmit={paidTime.handleConfirmSubmit}
            isSuccessOpen={paidTime.isSuccessOpen}
            successSnapshot={paidTime.successSnapshot}
            onAddAnother={handleAddAnother}
            onFinish={handleFinish}
            availability={paidTimeAvailability}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
