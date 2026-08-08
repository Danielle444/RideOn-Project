import { StyleSheet } from "react-native";

// טוקנים זהים לכפתור המשותף (components/ui/Button.jsx) ולמודלים הקיימים
// של פייד טיים (PaidTimeRequestReviewModal / PaidTimeRequestSuccessModal) -
// אין כאן פלטה חדשה, רק הרכבה של האלמנטים הקיימים לדיאלוג כללי.
// מצב isBusy משתמש ב-opacity (כמו modalPrimaryButtonDisabled בריפרנס),
// לא במשפחת האפור של CAP-3 ב-Button.jsx - זה מצב "בתהליך שמירה" חולף,
// לא כפתור לא-תקין קבוע.

var BROWN = "#7B5A4D";
var WHITE = "#FFFFFF";

var styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 16,
  },

  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 18,
    gap: 14,
  },

  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },

  iconWrapSuccess: {
    backgroundColor: "#E8F5E9",
  },

  iconWrapError: {
    backgroundColor: "#FFF1F0",
  },

  iconWrapWarning: {
    backgroundColor: "#FFF3E0",
  },

  iconWrapInfo: {
    backgroundColor: "#FAF5F1",
  },

  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#3F312B",
    textAlign: "right",
  },

  message: {
    fontSize: 14,
    color: "#5B4438",
    textAlign: "right",
    lineHeight: 22,
  },

  buttonsRow: {
    flexDirection: "row-reverse",
    gap: 10,
  },

  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: BROWN,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  primaryButtonDestructive: {
    backgroundColor: "#9C3D35",
  },

  primaryButtonDisabled: {
    opacity: 0.6,
  },

  primaryButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },

  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BROWN,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  secondaryButtonText: {
    color: BROWN,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
});

export default styles;
