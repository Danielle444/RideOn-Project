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
//
// מצב disabled (CAP-3): משפחת אפור נטרלית אחת בלבד לשני הוריאנטים - לא
// opacity על הצבע הרגיל. solid מושבת לעולם לא ייראה "חזק" יותר מ-outline
// פעיל (רקע אפור מרוכך + טקסט אפור-חום מרוכך, לעומת הלבן+חום החד של outline
// הפעיל). אותם טוקנים בדיוק (#C9BEB4 / #8A7A6E) חוזרים גם בכפתור השליחה
// המקומי ב-CompetitionRegistrationsClassesTab.jsx לעקביות בין שתי המשטחים.

var BROWN = "#7B5A4D";
var WHITE = "#FFFFFF";
var ICON_SIZE = 18;

var DISABLED_BG_SOLID = "#C9BEB4";
var DISABLED_TEXT_SOLID = "#8A7A6E";
var DISABLED_BG_OUTLINE = "#F0E5DC";
var DISABLED_BORDER_OUTLINE = "#C9BEB4";
var DISABLED_TEXT_OUTLINE = "#A79185";

export default function Button(props) {
  var isOutline = props.variant === "outline";
  var isDisabled = !!props.disabled;
  var labelColor = isDisabled
    ? isOutline
      ? DISABLED_TEXT_OUTLINE
      : DISABLED_TEXT_SOLID
    : isOutline
      ? BROWN
      : WHITE;

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
        isDisabled ? (isOutline ? styles.disabledOutline : styles.disabledSolid) : null,
        props.style,
      ]}
    >
      {renderIcon()}

      <Text
        numberOfLines={RTL_LABEL_NUMBER_OF_LINES}
        style={[
          styles.label,
          isOutline ? styles.labelOutline : styles.labelSolid,
          isDisabled
            ? isOutline
              ? styles.labelDisabledOutline
              : styles.labelDisabledSolid
            : null,
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

  disabledSolid: {
    backgroundColor: DISABLED_BG_SOLID,
  },

  disabledOutline: {
    backgroundColor: DISABLED_BG_OUTLINE,
    borderColor: DISABLED_BORDER_OUTLINE,
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

  labelDisabledSolid: {
    color: DISABLED_TEXT_SOLID,
  },

  labelDisabledOutline: {
    color: DISABLED_TEXT_OUTLINE,
  },
});
