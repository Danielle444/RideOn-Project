import { StyleSheet } from "react-native";

// אותם טוקנים כמו appDialogStyles.js - טוסט הוא רק וריאציה קטנה יותר
// ולא-חוסמת של אותה שפת עיצוב.

var styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 16,
    right: 16,
    gap: 8,
    zIndex: 1000,
    elevation: 10,
  },

  toast: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },

  toastSuccess: {
    borderColor: "#B7E0B8",
    backgroundColor: "#E8F5E9",
  },

  toastError: {
    borderColor: "#E3B4AE",
    backgroundColor: "#FFF1F0",
  },

  toastWarning: {
    borderColor: "#F0D9A8",
    backgroundColor: "#FFF3E0",
  },

  toastInfo: {
    borderColor: "#E7D6CA",
    backgroundColor: "#FAF5F1",
  },

  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#4F3B31",
    textAlign: "right",
    lineHeight: 20,
  },
});

export default styles;
