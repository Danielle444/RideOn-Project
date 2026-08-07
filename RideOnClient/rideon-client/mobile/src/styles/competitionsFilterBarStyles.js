import { StyleSheet } from "react-native";

const competitionsFilterBarStyles = StyleSheet.create({
  // CAP-1: compact resting-board trigger, replacing the always-inline card.
  filterButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#D7CCC8",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterButtonText: {
    color: "#5D4037",
    fontSize: 14,
    fontWeight: "700",
  },

  // Bottom-sheet chrome.
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  sheetHeaderRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#4F3B31",
  },
  sheetScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E3D7D0",
    padding: 16,
    marginBottom: 16,
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6D4C41",
    textAlign: "right",
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7CCC8",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    justifyContent: "center",
    textAlign: "right",
  },
  pickerBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7CCC8",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },

  // CAP-1: multi-select chip wraps (status / host ranch / field-discipline).
  chipWrap: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D7CCC8",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: {
    backgroundColor: "#7B5A4D",
    borderColor: "#7B5A4D",
  },
  chipText: {
    color: "#5D4037",
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  chipEmptyText: {
    color: "#9E8A7F",
    fontSize: 13,
  },

  // CAP-1: date range kept visually apart from the footer's Clear action
  // (its own fieldBlock, above the footer row - never inline beside it).
  dateRow: {
    flexDirection: "row-reverse",
    gap: 10,
  },
  dateField: {
    flex: 1,
  },

  sheetFooter: {
    flexDirection: "row-reverse",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#F0E4DC",
  },
  resetButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7CCC8",
    alignItems: "center",
    justifyContent: "center",
  },
  resetButtonText: {
    color: "#5D4037",
    fontSize: 15,
    fontWeight: "700",
  },
  applyButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#7B5A4D",
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default competitionsFilterBarStyles;
