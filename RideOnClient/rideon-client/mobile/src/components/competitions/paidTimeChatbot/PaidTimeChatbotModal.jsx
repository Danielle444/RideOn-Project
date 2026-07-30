import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import usePaidTimeChatbot from "../../../hooks/usePaidTimeChatbot";
import ChatProgress from "./ChatProgress";
import BulkSelectionSummary from "./BulkSelectionSummary";
import StepNavBar from "./StepNavBar";
import StepNavContext from "./StepNavContext";
import styles, { COLORS } from "../../../styles/paidTimeChatbotStyles";
import { loadPaidTimeChatbotContext } from "../../../services/paidTimeChatbotService";
import {
  buildSelectionSummary,
  getStepTitle,
} from "../../../utils/paidTimeBulkReview";
import { evaluateBulkCandidatesAvailability } from "../../../utils/paidTimeBookingAvailability";

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

  // ניווט השלב מוצהר על ידי StepLayout ומרונדר כאן, מחוץ לגלילה, כדי
  // ש"חזרה"/"המשך" יישארו תמיד במקום קבוע בתחתית המסך.
  const navHandlersRef = useRef({ onNext: null, onBack: null });
  const [navState, setNavState] = useState(null);

  const navApi = useMemo(
    function () {
      return { handlersRef: navHandlersRef, setNavState: setNavState };
    },
    []
  );

  const handleNavNext = useCallback(function () {
    const handler = navHandlersRef.current.onNext;
    if (typeof handler === "function") handler();
  }, []);

  const handleNavBack = useCallback(function () {
    const handler = navHandlersRef.current.onBack;
    if (typeof handler === "function") handler();
  }, []);

  const selectionSummary = useMemo(
    function () {
      return buildSelectionSummary({
        answers: chatbot.state.answers,
        context: chatbot.state.context,
        requestCount: chatbot.totalRequests,
      });
    },
    [chatbot.state.answers, chatbot.state.context, chatbot.totalRequests]
  );

  const stepTitle = getStepTitle(chatbot.currentStep);

  // המועמדים (מאמן עם סוסים רשומים) נטענים רק כאן, ולכן זו הנקודה
  // הראשונה שבה אפשר לדעת שאין עם מי לבנות הזמנה מרוכזת. בלי הבדיקה
  // המשתמשת הייתה נתקעת בשלב "בחירת מאמנים" בלי אפשרות להתקדם.
  const candidates = useMemo(
    function () {
      return evaluateBulkCandidatesAvailability(chatbot.state.context);
    },
    [chatbot.state.context]
  );

  const hasContext = !!chatbot.state.context;
  const blockedMessage =
    hasContext && !candidates.hasCandidates ? candidates.message : "";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="fullScreen"
    >
      {/*
        presentationStyle="fullScreen" מציג את המודל בהיררכיית View נפרדת,
        ולכן ה-SafeAreaProvider שברמת האפליקציה לא מודד עבורו. בלי Provider
        משלו ה-insets יוצאים 0 והתוכן העליון נכנס אל מתחת ל-Dynamic Island.
        זו ההנחיה של react-native-safe-area-context עצמה - לא ספרייה חדשה.

        edges מכיל top/left/right בלבד, בדיוק כמו MobileScreenLayout.
        ה-bottom מטופל ב-StepNavBar דרך useSafeAreaInsets, כמו MobileBottomNav,
        כדי שהרקע של הסרגל ימשיך עד קצה המסך ורק הכפתורים יעלו מעל
        פס הבית - ולא ייווצר ריפוד כפול.
      */}
      <SafeAreaProvider>
        <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
        <View style={styles.headerBar}>
          <Pressable
            style={styles.iconButton}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="סגירה"
          >
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </Pressable>

          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>הזמנה מרוכזת לפייד־טיים</Text>
            {stepTitle ? (
              <Text style={styles.headerStepName}>
                {stepTitle} · שלב {chatbot.currentStepIndex + 1} מתוך{" "}
                {chatbot.totalSteps}
              </Text>
            ) : null}
          </View>

          <View style={styles.iconButton} />
        </View>

        {loadingContext ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>טוען נתוני הזמנה מרוכזת...</Text>
          </View>
        ) : loadError ? (
          <View style={{ padding: 16 }}>
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{loadError}</Text>
            </View>
          </View>
        ) : blockedMessage ? (
          <View style={{ padding: 16 }}>
            <View style={styles.warningBanner}>
              <Text style={styles.warningTitle}>
                אי אפשר להתחיל הזמנה מרוכזת
              </Text>
              <Text style={styles.warningText}>{blockedMessage}</Text>
            </View>

            <Pressable
              style={[styles.bottomBarButton, styles.bottomBarSecondary]}
              onPress={handleClose}
              accessibilityRole="button"
            >
              <Text style={styles.bottomBarSecondaryText}>סגירה</Text>
            </Pressable>
          </View>
        ) : (
          <StepNavContext.Provider value={navApi}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <ChatProgress
                current={chatbot.currentStepIndex + 1}
                total={chatbot.totalSteps}
              />

              <BulkSelectionSummary summary={selectionSummary} />

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <StepRouter chatbot={chatbot} onClose={handleClose} />
              </ScrollView>

              {navState ? (
                <StepNavBar
                  canAdvance={navState.canAdvance}
                  nextLabel={navState.nextLabel}
                  backLabel={navState.backLabel}
                  showBack={navState.showBack}
                  incompleteReason={navState.incompleteReason}
                  onNext={handleNavNext}
                  onBack={handleNavBack}
                />
              ) : null}
            </KeyboardAvoidingView>
          </StepNavContext.Provider>
        )}
        </SafeAreaView>
      </SafeAreaProvider>
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
