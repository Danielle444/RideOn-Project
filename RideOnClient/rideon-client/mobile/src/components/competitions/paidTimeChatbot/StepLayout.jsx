import React, { useEffect } from "react";
import { Text, View } from "react-native";
import styles from "../../../styles/paidTimeChatbotStyles";
import ChatBubble from "./ChatBubble";
import StepNavBar from "./StepNavBar";
import { useStepNav } from "./StepNavContext";

// מעטפת של שלב בהזמנה המרוכזת.
//
// חוזה ה-props נשאר זהה (bubbles / onNext / onBack / canAdvance / nextLabel /
// backLabel / showBack), כדי שכל עשרת השלבים הקיימים ימשיכו לעבוד בלי שינוי.
// מה שהשתנה:
//   - "bubbles" כבר לא מצוירות כשיחה. הראשונה היא כותרת הסקשן והשאר טקסט עזר.
//   - הניווט עבר לסרגל תחתון קבוע דרך StepNavContext. אם אין Provider,
//     הסרגל מרונדר כאן כמו קודם.
//   - נוסף incompleteReason (רשות): הסבר למה "המשך" חסום.
export default function StepLayout(props) {
  const bubbles = Array.isArray(props.bubbles) ? props.bubbles : [];
  const showBack = props.showBack !== false;
  const nextLabel = props.nextLabel || "המשך";
  const backLabel = props.backLabel || "חזרה";
  const canAdvance = props.canAdvance !== false;
  const incompleteReason = props.incompleteReason || "";
  const onNext = props.onNext;
  const onBack = props.onBack;

  const nav = useStepNav();

  // המצביעים לפונקציות מתעדכנים בכל render דרך ref - בלי state ובלי effect,
  // כדי שפונקציה אנונימית חדשה לא תגרום ללולאת רינדור.
  if (nav) {
    nav.handlersRef.current = { onNext: onNext, onBack: onBack };
  }

  useEffect(
    function () {
      if (!nav) return;

      nav.setNavState({
        canAdvance: canAdvance,
        nextLabel: nextLabel,
        backLabel: backLabel,
        showBack: showBack,
        incompleteReason: incompleteReason,
      });
    },
    [nav, canAdvance, nextLabel, backLabel, showBack, incompleteReason]
  );

  useEffect(
    function () {
      if (!nav) return;

      return function () {
        nav.setNavState(null);
      };
    },
    [nav]
  );

  const heading = bubbles.length > 0 ? bubbles[0] : null;
  const helpLines = bubbles.slice(1);

  return (
    <View>
      {heading ? <Text style={styles.sectionHeading}>{heading}</Text> : null}

      {helpLines.map(function (text, idx) {
        return <ChatBubble key={"help-" + idx} text={text} />;
      })}

      {props.children ? (
        <View style={styles.answerCard}>{props.children}</View>
      ) : null}

      {!nav ? (
        <StepNavBar
          canAdvance={canAdvance}
          nextLabel={nextLabel}
          backLabel={backLabel}
          showBack={showBack}
          incompleteReason={incompleteReason}
          onNext={onNext}
          onBack={onBack}
        />
      ) : null}
    </View>
  );
}
