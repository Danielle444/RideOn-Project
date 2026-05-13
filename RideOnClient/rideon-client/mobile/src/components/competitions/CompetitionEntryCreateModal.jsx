import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useUser } from "../../context/UserContext";
import { useActiveRole } from "../../context/ActiveRoleContext";
import { useCompetition } from "../../context/CompetitionContext";

import useAdminCompetitionRegistrations from "../../hooks/useAdminCompetitionRegistrations";

import CompetitionRegistrationsClassesTab from "./CompetitionRegistrationsClassesTab";

import styles from "../../styles/adminCompetitionClassesStyles";

export default function CompetitionEntryCreateModal(
  props,
) {
  var userContext = useUser();

  var activeRoleContext =
    useActiveRole();

  var competitionContext =
    useCompetition();

  var user = userContext.user;

  var activeRole =
    activeRoleContext.activeRole;

  var activeCompetition =
    competitionContext.activeCompetition;

  var registrations =
    useAdminCompetitionRegistrations({
      user: user,
      activeRole: activeRole,
      competitionId:
        activeCompetition
          ?.competitionId,
    });

  async function handleSubmit() {
    await registrations.handleCreateEntry();

    if (
      typeof props.onCreated ===
      "function"
    ) {
      props.onCreated();
    }

    if (
      typeof props.onClose ===
      "function"
    ) {
      props.onClose();
    }
  }

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={props.onClose}
    >
      <SafeAreaView
        style={styles.modalContainer}
      >
        <View style={styles.modalHeader}>
          <Pressable
            onPress={props.onClose}
            style={styles.modalCloseButton}
          >
            <Ionicons
              name="close-outline"
              size={28}
              color="#4F3B31"
            />
          </Pressable>

          <Text style={styles.modalTitle}>
            הוספת הרשמה למקצה
          </Text>

          <View
            style={
              styles.modalHeaderSpacer
            }
          />
        </View>

        <ScrollView
          contentContainerStyle={
            styles.modalContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        >
          <CompetitionRegistrationsClassesTab
            loading={
              registrations.loading
            }
            screenError={
              registrations.screenError
            }
            classes={
              registrations.classes
            }
            horses={
              registrations.horses
            }
            riders={
              registrations.riders
            }
            trainers={
              registrations.trainers
            }
            payers={
              registrations.payers
            }
            selectedClass={
              registrations.selectedClass
            }
            selectedHorse={
              registrations.selectedHorse
            }
            selectedRider={
              registrations.selectedRider
            }
            selectedTrainer={
              registrations.selectedTrainer
            }
            selectedPayer={
              registrations.selectedPayer
            }
            prizeRecipientName={
              registrations.prizeRecipientName
            }
            setPrizeRecipientName={
              registrations.setPrizeRecipientName
            }
            setSelectedClass={
              registrations.setSelectedClass
            }
            setSelectedHorse={
              registrations.setSelectedHorse
            }
            setSelectedRider={
              registrations.setSelectedRider
            }
            setSelectedTrainer={
              registrations.setSelectedTrainer
            }
            setSelectedPayer={
              registrations.setSelectedPayer
            }
            locks={registrations.locks}
            onToggleLock={
              registrations.handleToggleLock
            }
            formatClassLabel={
              registrations.formatClassLabel
            }
            formatHorseLabel={
              registrations.formatHorseLabel
            }
            formatMemberLabel={
              registrations.formatMemberLabel
            }
            formatPayerLabel={
              registrations.formatPayerLabel
            }
            canSubmit={
              registrations.canSubmit
            }
            isSaving={
              registrations.isSaving
            }
            onSubmit={handleSubmit}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}