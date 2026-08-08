import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import styles from "../../styles/appDialogStyles";

// אייקון לפי type - "confirm" (ברירת המחדל) נשאר בלי אייקון, כמו מסך
// "אישור" רגיל בלי תג ויזואלי.
var ICON_BY_TYPE = {
  success: { name: "checkmark-circle", wrapStyle: styles.iconWrapSuccess, color: "#4C8C4A" },
  error: { name: "close-circle", wrapStyle: styles.iconWrapError, color: "#9C3D35" },
  warning: { name: "warning", wrapStyle: styles.iconWrapWarning, color: "#B7791F" },
  info: { name: "information-circle", wrapStyle: styles.iconWrapInfo, color: "#7B5A4D" },
};

// דיאלוג כללי אחד לכל האפליקציה, מיועד להחליף בהדרגה את קריאות ה-Alert
// המובנה הקיימות ברחבי האפליקציה (יסוד בלבד - ההחלפה עצמה לא כלולה כאן).
// אין כאן שימוש ב-Alert המובנה, אין צימוד למודל עסקי, ואין תור/מנג'ר
// גלובלי - כל מסך שולט בנראות ובקריאות החוזרות שלו בעצמו.
//
// props:
//   visible, title, message
//   type: "confirm" | "warning" | "error" | "success" | "info"
//   confirmLabel, cancelLabel
//   onConfirm, onCancel (חסרים onCancel = מצב כפתור יחיד)
//   destructive (boolean) - כפתור האישור באדום קיים במקום בחום
//   isBusy (boolean) - חוסם כפילות אישור/ביטול ומחליף את התווית בספינר
export default function AppDialog(props) {
  var isBusy = !!props.isBusy;
  var hasCancel = typeof props.onCancel === "function";
  var icon = ICON_BY_TYPE[props.type] || null;

  function handleConfirmPress() {
    if (isBusy) {
      return;
    }
    if (typeof props.onConfirm === "function") {
      props.onConfirm();
    }
  }

  function handleCancelPress() {
    if (isBusy || !hasCancel) {
      return;
    }
    props.onCancel();
  }

  function handleRequestClose() {
    // כפתור/מחווה חזרה של המערכת לא יסגרו דיאלוג באמצע פעולה רגישה.
    if (isBusy) {
      return;
    }
    if (hasCancel) {
      props.onCancel();
    }
  }

  return (
    <Modal
      visible={!!props.visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleRequestClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card} accessibilityRole="alert" accessibilityViewIsModal={true}>
          {icon ? (
            <View style={[styles.iconWrap, icon.wrapStyle]}>
              <Ionicons name={icon.name} size={28} color={icon.color} />
            </View>
          ) : null}

          {props.title ? <Text style={styles.title}>{props.title}</Text> : null}
          {props.message ? <Text style={styles.message}>{props.message}</Text> : null}

          <View style={styles.buttonsRow}>
            <Pressable
              style={[
                styles.primaryButton,
                props.destructive ? styles.primaryButtonDestructive : null,
                isBusy ? styles.primaryButtonDisabled : null,
              ]}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityState={{ disabled: isBusy, busy: isBusy }}
              onPress={handleConfirmPress}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {props.confirmLabel || "אישור"}
                </Text>
              )}
            </Pressable>

            {hasCancel ? (
              <Pressable
                style={styles.secondaryButton}
                disabled={isBusy}
                accessibilityRole="button"
                accessibilityState={{ disabled: isBusy }}
                onPress={handleCancelPress}
              >
                <Text style={styles.secondaryButtonText}>
                  {props.cancelLabel || "ביטול"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
