import { Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import styles from "../../styles/appToastStyles";

var ICON_BY_TYPE = {
  success: { name: "checkmark-circle", wrapStyle: styles.toastSuccess, color: "#4C8C4A" },
  error: { name: "close-circle", wrapStyle: styles.toastError, color: "#9C3D35" },
  warning: { name: "warning", wrapStyle: styles.toastWarning, color: "#B7791F" },
  info: { name: "information-circle", wrapStyle: styles.toastInfo, color: "#7B5A4D" },
};

// טוסט לא-חוסם בודד. ToastHost מנהל את התור והטיימר של הסגירה
// האוטומטית; הרכיב הזה רק מציג הודעה אחת ומאפשר סגירה מוקדמת בהקשה.
// אין כאן שימוש ב-Alert המובנה.
export default function AppToast(props) {
  var meta = ICON_BY_TYPE[props.type] || ICON_BY_TYPE.info;

  return (
    <Pressable
      style={[styles.toast, meta.wrapStyle]}
      onPress={props.onPress}
      accessibilityRole="alert"
    >
      <Ionicons name={meta.name} size={20} color={meta.color} />
      <Text style={styles.message}>{props.message}</Text>
    </Pressable>
  );
}
