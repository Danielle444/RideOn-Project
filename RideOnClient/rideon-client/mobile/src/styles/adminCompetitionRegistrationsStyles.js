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

  dropdownBlock: {
    gap: 8,
  },

  dropdownHeaderRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dropdownHeaderRight: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5B4438",
    textAlign: "right",
  },

  clearText: {
    fontSize: 13,
    color: "#A06B4D",
    fontWeight: "600",
  },

  inlineLockButton: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#D7C0B3",
    backgroundColor: "#FFF8F3",
  },

  inlineLockButtonActive: {
    backgroundColor: "#7B5A4D",
    borderColor: "#7B5A4D",
  },

  inlineLockButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7B5A4D",
  },

  inlineLockButtonTextActive: {
    color: "#FFFFFF",
  },

  dropdownTrigger: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D8C1B4",
    backgroundColor: "#FFFDFB",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  dropdownTriggerDisabled: {
    opacity: 0.55,
  },

  dropdownTriggerOpen: {
    borderColor: "#A9816B",
    backgroundColor: "#FFF8F3",
  },

  dropdownTriggerText: {
    flex: 1,
    textAlign: "right",
    color: "#4F3B31",
    fontSize: 15,
  },

  dropdownPlaceholderText: {
    color: "#9E8A7F",
  },

  dropdownPanel: {
    borderWidth: 1,
    borderColor: "#E0CDC0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    padding: 10,
    gap: 10,
  },

  dropdownSearchInput: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2D1C5",
    backgroundColor: "#FFFDFB",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#4F3B31",
  },

  dropdownList: {
    maxHeight: 220,
  },

  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E4DC",
  },

  dropdownItemText: {
    fontSize: 14,
    color: "#4F3B31",
    textAlign: "right",
    lineHeight: 22,
  },

  dropdownEmptyWrap: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  dropdownEmptyText: {
    color: "#9E8A7F",
    fontSize: 14,
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