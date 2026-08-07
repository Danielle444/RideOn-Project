import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useEffect, useRef, useState } from "react";

import { Ionicons } from "@expo/vector-icons";

import { useUser } from "../../context/UserContext";
import { useActiveRole } from "../../context/ActiveRoleContext";
import { useCompetition } from "../../context/CompetitionContext";

import useAdminCompetitionRegistrations from "../../hooks/useAdminCompetitionRegistrations";

import CompetitionRegistrationsClassesTab from "./CompetitionRegistrationsClassesTab";

import styles from "../../styles/adminCompetitionClassesStyles";

import {
  createChangeEntryRequest,
  adminEditEntry,
} from "../../services/entriesService";
import { getApiErrorMessage } from "../../../../shared/auth/utils/authApiErrors";

import { resolveEntryEditInitialization } from "../../utils/entryEditInitialization";

import {
  getResultTypeCopy,
  RESULT_CATEGORY,
} from "../../utils/payerAccountCopy";

export default function CompetitionEntryCreateModal(props) {
  var userContext = useUser();

  var activeRoleContext = useActiveRole();

  var competitionContext = useCompetition();

  var user = userContext.user;

  var activeRole = activeRoleContext.activeRole;

  var activeCompetition = competitionContext.activeCompetition;

  var editItem = props.editItem || null;

  var isEditMode = !!editItem;

  // Phase 3C: only the admin payer-account screen opts into this - the
  // classes-screen edit call site never passes it, so its own edit flow
  // (create replacement + createChangeEntryRequest below) is unchanged.
  var useDirectAdminEdit = props.useDirectAdminEdit === true;

  var lockedPayerPersonId = props.lockedPayerPersonId || null;

  var [isSubmittingDirect, setIsSubmittingDirect] = useState(false);

  // CAP-2: edit mode excludes the entry being replaced from the duplicate
  // check (it's about to be superseded by the new one, so matching against
  // itself would always false-flag). Both create-mode call sites of this
  // component pass no editItem, so this stays null for them.
  var registrations = useAdminCompetitionRegistrations({
    user: user,
    activeRole: activeRole,
    competitionId: activeCompetition?.competitionId,
    excludeEntryId: editItem ? editItem.entryId : null,
  });

  // CAP-6: guards edit-mode initialization so it (1) waits until every
  // lookup editItem actually references has resolved against the CURRENT
  // lists - not merely "the lists are non-empty" - and (2) runs at most once
  // per visible-editItem session, so a later loadScreenData() refresh (new
  // array references, same or different content) can never overwrite a
  // selection the user has since changed by hand. Reset whenever the modal
  // closes, editItem is cleared, or a different entry is opened for edit -
  // the ref comparison below covers all three: closing/clearing sets it to
  // null directly, and switching to a different entryId simply never
  // matches the ref, so resolution (and the eventual initialized-marker)
  // re-runs for the new entry exactly as it would on a fresh open.
  var initializedEntryIdRef = useRef(null);

  useEffect(
    function () {
      if (!props.visible || !editItem) {
        initializedEntryIdRef.current = null;
        return;
      }

      if (initializedEntryIdRef.current === editItem.entryId) {
        return;
      }

      var resolved = resolveEntryEditInitialization(editItem, {
        classes: registrations.classes,
        riders: registrations.riders,
        trainers: registrations.trainers,
        payers: registrations.payers,
      });

      // A required lookup (one editItem actually carries an id for) hasn't
      // resolved against the current lists yet - do NOT set any selection
      // and do NOT mark this entry initialized. The list references below
      // stay in the dependency array specifically so a later
      // loadScreenData() refresh re-fires this effect and gets another
      // attempt once riders/trainers/payers/classes actually arrive.
      if (!resolved) {
        return;
      }

      registrations.setSelectedClass(resolved.selectedClass);

      registrations.setSelectedHorse(resolved.selectedHorse);

      registrations.setSelectedRider(resolved.selectedRider);

      registrations.setSelectedTrainer(resolved.selectedTrainer);

      registrations.setSelectedPayer(resolved.selectedPayer);

      registrations.setPrizeRecipientName(resolved.prizeRecipientName);

      initializedEntryIdRef.current = editItem.entryId;
    },
    [
      props.visible,
      editItem,
      registrations.classes,
      registrations.riders,
      registrations.trainers,
      registrations.payers,
    ],
  );

  // Hard-bind payer when caller passes a locked payer id (Q2 — admin opens
  // create form from inside payer's account screen).
  useEffect(
    function () {
      if (!props.visible || !lockedPayerPersonId) return;
      if (!registrations.payers || registrations.payers.length === 0) return;

      var lockedPayer = registrations.payers.find(function (item) {
        return item.personId === lockedPayerPersonId;
      });

      if (!lockedPayer) return;

      registrations.setSelectedPayer(lockedPayer);

      // Engage the lock so handleCreateEntry retains the payer between submits
      // and the FormCard shows the field as locked (read-only UI).
      if (!registrations.locks?.payer) {
        registrations.handleToggleLock("payer");
      }
    },
    [
      props.visible,
      lockedPayerPersonId,
      registrations.payers,
    ],
  );

  // CAP-1: the create/tally state is per-modal-instance (each call site owns
  // its own useAdminCompetitionRegistrations), so it survives across a
  // single open session by design. It must NOT survive a close - resets the
  // moment the modal is dismissed, so reopening it later (for another create
  // or a different edit) always starts from a clean confirmation/tally.
  var wasVisibleRef = useRef(props.visible);

  useEffect(
    function () {
      var wasVisible = wasVisibleRef.current;
      wasVisibleRef.current = props.visible;

      if (wasVisible && !props.visible) {
        registrations.resetCreationSummary();
      }
    },
    [props.visible],
  );

  // Phase 3C: rewires edit-mode submit to the existing admin-edit endpoint
  // (usp_admineditentry) instead of create-replacement + change-request.
  // The server decides Direct vs Pending; this only reflects that result.
  //
  // Mutation vs refresh are deliberately two separate steps, not one
  // try/catch: the mutation's own try/catch/finally decides success/failure
  // and resets isSubmittingDirect the instant the API call settles, so
  // success copy and modal close happen unconditionally once the edit itself
  // succeeded - never gated on props.onCreated (account.reload). Refresh
  // runs afterward, best-effort, in its own try/catch, so a refresh failure
  // can never be misreported as a failed edit, reopen the modal, or leave
  // isSubmittingDirect stuck (blocking a legitimate retry).
  async function handleDirectAdminEdit() {
    if (isSubmittingDirect) {
      return;
    }

    var response;

    try {
      setIsSubmittingDirect(true);

      response = await adminEditEntry({
        entryId: editItem.entryId,
        competitionId: activeCompetition?.competitionId,
        ranchId: activeRole?.ranchId,
        classInCompId: registrations.selectedClass?.classInCompId,
        horseId: registrations.selectedHorse?.horseId,
        riderFederationMemberId:
          registrations.selectedRider?.federationMemberId,
        coachFederationMemberId:
          registrations.selectedTrainer?.federationMemberId || null,
        prizeRecipientName: registrations.prizeRecipientName
          ? registrations.prizeRecipientName.trim()
          : null,
      });
    } catch (error) {
      Alert.alert(
        "שגיאה",
        getApiErrorMessage(error, "אירעה שגיאה בעדכון ההרשמה"),
      );

      return;
    } finally {
      setIsSubmittingDirect(false);
    }

    // The edit succeeded - everything below is refresh, not mutation
    // outcome, and must not be able to turn this into a reported failure.
    var resultType =
      response?.data?.resultType || response?.data?.ResultType;

    var copy = getResultTypeCopy(resultType);

    var alertTitle =
      copy.category === RESULT_CATEGORY.SECRETARY_PENDING ? "נשלח" : "עודכן";

    Alert.alert(alertTitle, copy.text);

    if (typeof props.onClose === "function") {
      props.onClose();
    }

    // account.reload() already owns its own failure UX (sets its screenError
    // and shows its own Alert internally) and never rejects - this try/catch
    // is a defensive backstop only, so a future onCreated that DOES reject
    // can never be attributed to the edit that already succeeded above.
    if (typeof props.onCreated === "function") {
      try {
        await props.onCreated();
      } catch (refreshError) {
        console.log("DIRECT ADMIN EDIT REFRESH ERROR", refreshError);
      }
    }
  }

  async function handleSubmit() {
    if (isEditMode && useDirectAdminEdit) {
      await handleDirectAdminEdit();
      return;
    }

    try {
      if (isEditMode) {
        // The success banner/tally are create-only (CAP-1) - handleCreateEntry
        // still creates a real replacement entry here, but suppressSuccess
        // keeps that internal to the change-request flow below.
        var newEntry = await registrations.handleCreateEntry({
          suppressSuccess: true,
        });

        if (!newEntry?.entryId) {
          return;
        }

        await createChangeEntryRequest({
          competitionId: activeCompetition?.competitionId,

          originalEntryId: editItem.entryId,

          newEntryId: newEntry.entryId,

          isCancelled: false,
        });
      } else {
        var createdEntry = await registrations.handleCreateEntry();

        if (!createdEntry?.entryId) {
          return;
        }
      }

      if (typeof props.onCreated === "function") {
        await props.onCreated();
      }

      // CAP-1: create mode stays open (so the confirmation/tally above and
      // repeat creates are possible) - only edit mode, which is a one-shot
      // change request, closes the modal on success.
      if (isEditMode && typeof props.onClose === "function") {
        props.onClose();
      }
    } catch (error) {
      // Change-request failures (the edit-mode branch above) previously
      // only reached console.log here, with no Alert - that pre-existing
      // silent-failure behavior is unchanged; only the redundant log call
      // itself was removed (see audit finding C).
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

          <Text style={styles.modalTitle}>
            {isEditMode ? "עריכת הרשמה" : "הוספת הרשמה למקצה"}
          </Text>

          <View style={styles.modalHeaderSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.modalContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <CompetitionRegistrationsClassesTab
            loading={registrations.loading}
            screenError={registrations.screenError}
            classes={registrations.classes}
            horses={registrations.horses}
            horsesLoading={registrations.horsesLoading}
            onSearchHorses={registrations.loadHorsesForPicker}
            riders={registrations.riders}
            trainers={registrations.trainers}
            payers={registrations.payers}
            selectedClass={registrations.selectedClass}
            selectedHorse={registrations.selectedHorse}
            selectedRider={registrations.selectedRider}
            selectedTrainer={registrations.selectedTrainer}
            selectedPayer={registrations.selectedPayer}
            prizeRecipientName={registrations.prizeRecipientName}
            setPrizeRecipientName={registrations.setPrizeRecipientName}
            setSelectedClass={registrations.setSelectedClass}
            setSelectedHorse={registrations.setSelectedHorse}
            setSelectedRider={registrations.setSelectedRider}
            setSelectedTrainer={registrations.setSelectedTrainer}
            setSelectedPayer={registrations.setSelectedPayer}
            locks={registrations.locks}
            onToggleLock={registrations.handleToggleLock}
            formatClassLabel={registrations.formatClassLabel}
            formatHorseLabel={registrations.formatHorseLabel}
            formatMemberLabel={registrations.formatMemberLabel}
            formatPayerLabel={registrations.formatPayerLabel}
            canSubmit={registrations.canSubmit && !isSubmittingDirect}
            isSaving={registrations.isSaving || isSubmittingDirect}
            submitButtonText={
              isEditMode
                ? useDirectAdminEdit
                  ? "שמירת שינויים"
                  : "שלח בקשת שינוי"
                : "הוסף הרשמה"
            }
            onSubmit={handleSubmit}
            justCreated={registrations.justCreated}
            createdCount={registrations.createdCount}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
