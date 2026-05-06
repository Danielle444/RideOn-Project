import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import usePaidTimeChatbot from "../../../hooks/usePaidTimeChatbot";
import ChatProgress from "./ChatProgress";
import styles, { COLORS } from "../../../styles/paidTimeChatbotStyles";
import { loadPaidTimeChatbotContext } from "../../../services/paidTimeChatbotService";

import Step01_Intro from "./Step01_Intro";
import Step02_PickCoaches from "./Step02_PickCoaches";
import Step03_DayArena from "./Step03_DayArena";
import Step04_HorsesPerCoach from "./Step04_HorsesPerCoach";
import Step05_TimePreferences from "./Step05_TimePreferences";
import Step06_TimeConstraints from "./Step06_TimeConstraints";
import Step07_ShortLong from "./Step07_ShortLong";
import Step08_TrainingOrder from "./Step08_TrainingOrder";
import Step09_Spacing from "./Step09_Spacing";
import Step10_Summary from "./Step10_Summary";

export default function PaidTimeChatbotModal(props) {
  const visible = !!props.visible;
  const ranchId = props.ranchId;
  const competitionId = props.competitionId;
  const roleId = props.roleId;
  const onClose = props.onClose;

  const chatbot = usePaidTimeChatbot({
    ranchId: ranchId,
    competitionId: competitionId,
  });

  const [loadingContext, setLoadingContext] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(
    function () {
      if (!visible) return;

      let cancelled = false;
      setLoadingContext(true);
      setLoadError(null);

      async function load() {
        if (!ranchId || !competitionId || !roleId) {
          setLoadError("חסרים פרטי חווה, תפקיד או תחרות");
          setLoadingContext(false);
          return;
        }
        try {
          const ctx = await loadPaidTimeChatbotContext({
            ranchId: ranchId,
            competitionId: competitionId,
            roleId: roleId,
          });
          if (cancelled) return;
          chatbot.initContext(ctx);
          setLoadingContext(false);
        } catch (err) {
          if (cancelled) return;
          setLoadError(
            String(err?.response?.data || err?.message || "טעינה נכשלה")
          );
          setLoadingContext(false);
        }
      }

      load();
      return function () {
        cancelled = true;
      };
    },
    [visible, ranchId, competitionId, roleId, chatbot.initContext]
  );

  const handleClose = useCallback(
    function () {
      chatbot.reset();
      if (typeof onClose === "function") onClose();
    },
    [chatbot, onClose]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.headerBar}>
          <Pressable style={styles.iconButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>הזמנה חכמה - פייד טיים</Text>
          <View style={styles.iconButton} />
        </View>

        {loadingContext ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>מכין את הצ'אטבוט...</Text>
          </View>
        ) : loadError ? (
          <View style={{ padding: 16 }}>
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{loadError}</Text>
            </View>
          </View>
        ) : (
          <>
            <ChatProgress
              current={chatbot.currentStepIndex + 1}
              total={chatbot.totalSteps}
            />
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <StepRouter chatbot={chatbot} onClose={handleClose} />
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function StepRouter({ chatbot, onClose }) {
  switch (chatbot.currentStep) {
    case "intro":
      return <Step01_Intro chatbot={chatbot} />;
    case "coaches":
      return <Step02_PickCoaches chatbot={chatbot} />;
    case "dayArena":
      return <Step03_DayArena chatbot={chatbot} />;
    case "horses":
      return <Step04_HorsesPerCoach chatbot={chatbot} />;
    case "timePrefs":
      return <Step05_TimePreferences chatbot={chatbot} />;
    case "timeConstraints":
      return <Step06_TimeConstraints chatbot={chatbot} />;
    case "shortLong":
      return <Step07_ShortLong chatbot={chatbot} />;
    case "order":
      return <Step08_TrainingOrder chatbot={chatbot} />;
    case "spacing":
      return <Step09_Spacing chatbot={chatbot} />;
    case "summary":
      return <Step10_Summary chatbot={chatbot} onClose={onClose} />;
    default:
      return (
        <View>
          <View style={styles.bubbleRow}>
            <View style={[styles.bubble, styles.bubbleBot]}>
              <Text style={styles.bubbleTextBot}>
                שלב {chatbot.currentStep} בבנייה (שלבים 6-10 בדרך).
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row-reverse", gap: 8, marginTop: 12 }}>
            <Pressable
              style={[styles.primaryButton, { flex: 1 }]}
              onPress={chatbot.next}
            >
              <Text style={styles.primaryButtonText}>הבא</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, { flex: 1 }]}
              onPress={chatbot.prev}
            >
              <Text style={styles.secondaryButtonText}>חזרה</Text>
            </Pressable>
          </View>
        </View>
      );
  }
}
