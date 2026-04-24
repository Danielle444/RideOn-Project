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

  dropdownHeaderActions: {
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

  inlineLockIconButton: {
    minWidth: 28,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
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

  tabsWrapper: {
    flexDirection: "row-reverse",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 6,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    gap: 8,
  },

  tabButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  tabButtonActive: {
    backgroundColor: "#7B5A4D",
  },

  tabButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6D564A",
  },

  tabButtonTextActive: {
    color: "#FFFFFF",
  },

  tabButtonDisabled: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    backgroundColor: "#F3ECE7",
  },

  tabButtonTextDisabled: {
    fontSize: 14,
    fontWeight: "700",
    color: "#A79185",
  },

  helperText: {
    fontSize: 13,
    color: "#8A7468",
    textAlign: "right",
    lineHeight: 20,
  },

  twoButtonsRow: {
    flexDirection: "row-reverse",
    gap: 10,
  },

  optionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D8C1B4",
    backgroundColor: "#FFFDFB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  optionButtonActive: {
    backgroundColor: "#7B5A4D",
    borderColor: "#7B5A4D",
  },

  optionButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6D564A",
    textAlign: "center",
  },

  optionButtonTextActive: {
    color: "#FFFFFF",
  },

  twoInputsRow: {
    flexDirection: "row-reverse",
    gap: 10,
  },

  textInput: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D8C1B4",
    backgroundColor: "#FFFDFB",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#4F3B31",
    flex: 1,
  },

  limitedListBox: {
    maxHeight: 260,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0CDC0",
    backgroundColor: "#FFFFFF",
    padding: 8,
  },

  selectableRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0CDC0",
    backgroundColor: "#FFFFFF",
    padding: 12,
    marginBottom: 8,
    gap: 4,
  },

  selectableRowActive: {
    borderColor: "#7B5A4D",
    backgroundColor: "#FFF8F3",
  },

  selectableRowText: {
    fontSize: 14,
    color: "#4F3B31",
    textAlign: "right",
    lineHeight: 22,
    fontWeight: "700",
  },

  quantityRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0CDC0",
    backgroundColor: "#FFFFFF",
    padding: 10,
  },

  quantityDetails: {
    flex: 1,
    gap: 3,
  },

  quantityHorseName: {
    fontSize: 14,
    color: "#4F3B31",
    textAlign: "right",
    fontWeight: "700",
  },

  quantityInput: {
    width: 90,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8C1B4",
    backgroundColor: "#FFFDFB",
    paddingHorizontal: 10,
    fontSize: 14,
    color: "#4F3B31",
  },

  summaryBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    backgroundColor: "#FFF8F3",
    padding: 12,
    gap: 6,
  },

  summaryLine: {
    borderRadius: 12,
    backgroundColor: "#FFF8F3",
    padding: 8,
  },

  summaryText: {
    fontSize: 14,
    color: "#4F3B31",
    textAlign: "right",
    fontWeight: "700",
  },
});

export default styles;
