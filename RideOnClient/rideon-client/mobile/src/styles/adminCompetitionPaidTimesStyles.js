import { StyleSheet } from "react-native";

var styles = StyleSheet.create({
  screenContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },

  errorCard: {
    backgroundColor: "#FFF1F0",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E3B4AE",
  },

  errorText: {
    color: "#9C3D35",
    fontSize: 14,
    textAlign: "right",
    lineHeight: 22,
  },

  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 10,
  },

  loadingText: {
    fontSize: 14,
    color: "#6D564A",
    textAlign: "center",
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    gap: 14,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4F3B31",
    textAlign: "right",
  },

  helperCard: {
    backgroundColor: "#FFF9F5",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    gap: 8,
  },

  helperText: {
    fontSize: 14,
    color: "#6D564A",
    textAlign: "right",
    lineHeight: 22,
  },

  fieldBlock: {
    gap: 8,
  },

  fieldHeaderRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5B4438",
    textAlign: "right",
  },

  inlineLockIconButton: {
    minWidth: 28,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  textInput: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2D1C5",
    backgroundColor: "#FFFDFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#4F3B31",
  },

  notesInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },

  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#7B5A4D",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  primaryButtonDisabled: {
    opacity: 0.6,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default styles;