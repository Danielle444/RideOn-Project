import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useEffect } from "react";

import { Ionicons } from "@expo/vector-icons";

import { useUser } from "../../context/UserContext";
import { useActiveRole } from "../../context/ActiveRoleContext";
import { useCompetition } from "../../context/CompetitionContext";

import useAdminCompetitionRegistrations from "../../hooks/useAdminCompetitionRegistrations";

import CompetitionRegistrationsClassesTab from "./CompetitionRegistrationsClassesTab";

import styles from "../../styles/adminCompetitionClassesStyles";

import { createChangeEntryRequest } from "../../services/entriesService";

export default function CompetitionEntryCreateModal(props) {
  var userContext = useUser();

  var activeRoleContext = useActiveRole();

  var competitionContext = useCompetition();

  var user = userContext.user;

  var activeRole = activeRoleContext.activeRole;

  var activeCompetition = competitionContext.activeCompetition;

  var registrations = useAdminCompetitionRegistrations({
    user: user,
    activeRole: activeRole,
    competitionId: activeCompetition?.competitionId,
  });

  var editItem = props.editItem || null;

  var isEditMode = !!editItem;

  var lockedPayerPersonId = props.lockedPayerPersonId || null;

  useEffect(
    function () {
      if (!props.visible || !editItem) {
        return;
      }

      var selectedClass = registrations.classes.find(function (item) {
        return item.classInCompId === editItem.classInCompId;
      });

      var selectedHorse = registrations.horses.find(function (item) {
        return item.horseId === editItem.horseId;
      });

      var selectedRider = registrations.riders.find(function (item) {
        return item.federationMemberId === editItem.riderFederationMemberId;
      });

      var selectedTrainer = registrations.trainers.find(function (item) {
        return item.federationMemberId === editItem.coachFederationMemberId;
      });

      var selectedPayer = registrations.payers.find(function (item) {
        return item.personId === editItem.paidByPersonId;
      });

      registrations.setSelectedClass(selectedClass || null);

      registrations.setSelectedHorse(selectedHorse || null);

      registrations.setSelectedRider(selectedRider || null);

      registrations.setSelectedTrainer(selectedTrainer || null);

      registrations.setSelectedPayer(selectedPayer || null);

      registrations.setPrizeRecipientName(editItem.prizeRecipientName || "");
    },
    [
      props.visible,
      editItem,
      registrations.classes,
      registrations.horses,
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

  async function handleSubmit() {
    try {
      if (isEditMode) {
        var newEntry = await registrations.handleCreateEntry();

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

      if (typeof props.onClose === "function") {
        props.onClose();
      }
    } catch (error) {
      console.log(error);
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
            canSubmit={registrations.canSubmit}
            isSaving={registrations.isSaving}
            submitButtonText={isEditMode ? "שלח בקשת שינוי" : "הוסף הרשמה"}
            onSubmit={handleSubmit}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
