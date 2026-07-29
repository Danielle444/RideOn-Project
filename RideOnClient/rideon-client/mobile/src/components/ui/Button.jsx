import { Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  rtlLabelStyle,
  RTL_LABEL_NUMBER_OF_LINES,
} from "../../styles/rtlLabelStyle";

// הכפתור המשותף של אפליקציית המובייל.
// הטוקנים נלקחו ממסך המקצים של האדמין (עיצוב הייחוס): חום #7B5A4D,
// מילוי לבן / מתאר, רדיוס 10. אין להמציא כאן צבעים או רדיוסים חדשים -
// הפלטה חיה בקומפוננטה, לא בזיכרון של כל מסך בנפרד. #5A4036 הוא החום
// השגוי ואסור שיופיע.
//
// props:
//   label      (string, חובה)  - מוצג עם כלל ה-RTL המשותף
//   onPress    (function, חובה)
//   variant    "solid" | "outline" (ברירת מחדל: solid)
//   icon       שם אייקון של Ionicons או node מוכן - מוביל, עם gap 8
//   disabled   boolean
//   style      תוספת סגנון למעטפת (למשל flex או מרווחים)
//   textStyle  תוספת סגנון לתווית - לא יכול לדרוס את כלל ה-RTL
//   loading    שמור בלבד. לא ממומש (אין ספינר) - השם תפוס כדי שאפשר
//              יהיה להוסיף וריאנט טעינה בעתיד בלי שינוי שובר.

var BROWN = "#7B5A4D";
var WHITE = "#FFFFFF";
var ICON_SIZE = 18;

export default function Button(props) {
  var isOutline = props.variant === "outline";
  var isDisabled = !!props.disabled;
  var labelColor = isOutline ? BROWN : WHITE;

  function renderIcon() {
    if (!props.icon) return null;

    if (typeof props.icon === "string") {
      return <Ionicons name={props.icon} size={ICON_SIZE} color={labelColor} />;
    }

    return props.icon;
  }

  return (
    <Pressable
      onPress={props.onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        isOutline ? styles.outline : styles.solid,
        isDisabled ? styles.disabled : null,
        props.style,
      ]}
    >
      {renderIcon()}

      <Text
        numberOfLines={RTL_LABEL_NUMBER_OF_LINES}
        style={[
          styles.label,
          isOutline ? styles.labelOutline : styles.labelSolid,
          props.textStyle,
          rtlLabelStyle,
        ]}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

var styles = StyleSheet.create({
  base: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
  },

  solid: {
    backgroundColor: BROWN,
  },

  outline: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BROWN,
  },

  disabled: {
    opacity: 0.6,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
  },

  labelSolid: {
    color: WHITE,
  },

  labelOutline: {
    color: BROWN,
  },
});
