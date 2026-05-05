import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import usePaidTimeChatbot from "../../hooks/usePaidTimeChatbot";
import ChatProgress from "../../components/competitions/paidTimeChatbot/ChatProgress";
import styles, { COLORS } from "../../styles/paidTimeChatbotStyles";
import { loadPaidTimeChatbotContext } from "../../services/paidTimeChatbotService";

export default function PaidTimeChatbotScreen(props) {
  const params = props.route?.params || {};
  const ranchId = params.ranchId;
  const competitionId = params.competitionId;
  const roleId = params.roleId;

  const chatbot = usePaidTimeChatbot({
    ranchId: ranchId,
    competitionId: competitionId,
  });

  const [loadingContext, setLoadingContext] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(
    function () {
      let cancelled = false;

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
    [ranchId, competitionId, roleId, chatbot.initContext]
  );

  const handleClose = useCallback(
    function () {
      props.navigation.goBack();
    },
    [props.navigation]
  );

  if (loadingContext) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>מכין את הצ'אטבוט...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.headerBar}>
          <Pressable style={styles.iconButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>הזמנה חכמה - פייד טיים</Text>
          <View style={styles.iconButton} />
        </View>
        <View style={{ padding: 16 }}>
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.headerBar}>
        <Pressable style={styles.iconButton} onPress={handleClose}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>הזמנה חכמה - פייד טיים</Text>
        <View style={styles.iconButton} />
      </View>

      <ChatProgress
        current={chatbot.currentStepIndex + 1}
        total={chatbot.totalSteps}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <StepRouter chatbot={chatbot} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StepRouter({ chatbot }) {
  return (
    <View>
      <View style={styles.bubbleRow}>
        <View style={[styles.bubble, styles.bubbleBot]}>
          <Text style={styles.bubbleTextBot}>
            הצ'אטבוט בבנייה. שלב נוכחי: {chatbot.currentStep}
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
        {chatbot.currentStepIndex > 0 ? (
          <Pressable
            style={[styles.secondaryButton, { flex: 1 }]}
            onPress={chatbot.prev}
          >
            <Text style={styles.secondaryButtonText}>חזרה</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
