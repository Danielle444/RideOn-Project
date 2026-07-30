import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import styles from "../../../styles/paidTimeChatbotStyles";

// אותו מינימום שמשמש את MobileBottomNav, כדי שהסרגל לא יידבק לקצה המסך
// גם במכשירים בלי פס בית.
var MIN_BOTTOM_PADDING = 10;

// סרגל הניווט התחתון הקבוע של ההזמנה המרוכזת.
// כשההמשך חסום מוצגת מתחתיו הסיבה, כדי שלא יישאר כפתור אפור בלי הסבר.
//
// props:
//   canAdvance, nextLabel, backLabel, showBack, incompleteReason,
//   onNext, onBack
export default function StepNavBar(props) {
  // אותו דפוס של MobileBottomNav: הריפוד התחתון נגזר מה-inset האמיתי של
  // המכשיר, בלי ערכים קשיחים ספציפיים לאייפון.
  const insets = useSafeAreaInsets();
  const canAdvance = props.canAdvance !== false;
  const showBack = props.showBack !== false;
  const nextLabel = props.nextLabel || "המשך";
  const backLabel = props.backLabel || "חזרה";
  const reason = !canAdvance ? props.incompleteReason : "";

  function handleNext() {
    if (!canAdvance) return;
    if (typeof props.onNext === "function") props.onNext();
  }

  function handleBack() {
    if (typeof props.onBack === "function") props.onBack();
  }

  return (
    <View>
      {reason ? (
        <View style={styles.bottomBarReason}>
          <Text style={styles.bottomBarReasonText}>{reason}</Text>
        </View>
      ) : null}

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, MIN_BOTTOM_PADDING) },
        ]}
      >
        <Pressable
          style={[
            styles.bottomBarButton,
            styles.bottomBarPrimary,
            !canAdvance ? styles.bottomBarPrimaryDisabled : null,
          ]}
          disabled={!canAdvance}
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canAdvance }}
        >
          <Text style={styles.bottomBarPrimaryText}>{nextLabel}</Text>
        </Pressable>

        {showBack ? (
          <Pressable
            style={[styles.bottomBarButton, styles.bottomBarSecondary]}
            onPress={handleBack}
            accessibilityRole="button"
          >
            <Text style={styles.bottomBarSecondaryText}>{backLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
