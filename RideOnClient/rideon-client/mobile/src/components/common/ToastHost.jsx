import { useEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { subscribeToasts, dismissToast } from "../../services/toastService";
import AppToast from "./AppToast";
import styles from "../../styles/appToastStyles";

// מותקן פעם אחת ב-App.js, מעל כל שאר העץ. נרשם ל-toastService באותו
// דפוס בדיוק כמו registerUnauthorizedHandler ב-axiosInstance.js - כל
// service/hook יכול לקרוא ל-showToast בלי גישה ל-context, באותה קלות
// שבה קוראים ל-Alert המובנה היום.
export default function ToastHost() {
  var insets = useSafeAreaInsets();
  var [toasts, setToasts] = useState([]);

  useEffect(function () {
    return subscribeToasts(setToasts);
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 10 }]}>
      {toasts.map(function (toast) {
        return (
          <AppToast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onPress={function () {
              dismissToast(toast.id);
            }}
          />
        );
      })}
    </View>
  );
}
