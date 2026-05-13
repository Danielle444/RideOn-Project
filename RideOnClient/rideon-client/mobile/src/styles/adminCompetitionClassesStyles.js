import { StyleSheet } from "react-native";

var styles = StyleSheet.create({
  screenContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
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

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    gap: 12,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4F3B31",
    textAlign: "right",
  },

  helperText: {
    fontSize: 14,
    color: "#6D564A",
    textAlign: "right",
    lineHeight: 22,
  },

  summaryRow: {
    flexDirection: "row-reverse",
    gap: 10,
  },

  summaryBox: {
    flex: 1,
    backgroundColor: "#FAF5F1",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    alignItems: "center",
    gap: 4,
  },

  summaryBoxActive: {
    backgroundColor: "#7B5A4D",
    borderColor: "#7B5A4D",
  },

  summaryNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4F3B31",
  },

  summaryNumberActive: {
    color: "#FFFFFF",
  },

  summaryLabel: {
    fontSize: 12,
    color: "#7B5A4D",
    textAlign: "center",
  },

  summaryLabelActive: {
    color: "#FFFFFF",
  },

  searchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    gap: 10,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5B4438",
    textAlign: "right",
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

  filterToggleCard: {
    gap: 10,
  },

  filterToggleButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },

  filterToggleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4F3B31",
  },

  filterToggleIcon: {
    fontSize: 12,
    color: "#7B5A4D",
  },

  filterSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    gap: 10,
  },

  filterTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#4F3B31",
    textAlign: "right",
  },

  chipsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },

  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#FAF5F1",
    borderWidth: 1,
    borderColor: "#E7D6CA",
  },

  filterChipActive: {
    backgroundColor: "#7B5A4D",
    borderColor: "#7B5A4D",
  },

  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5B4438",
  },

  filterChipTextActive: {
    color: "#FFFFFF",
  },

  clearFiltersButton: {
    alignSelf: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

  clearFiltersText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7B5A4D",
  },

  resultsText: {
    fontSize: 13,
    color: "#7B5A4D",
    textAlign: "right",
  },

  entryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    gap: 10,
  },

  topRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },

  classBlock: {
    flex: 1,
    gap: 4,
  },

  className: {
    fontSize: 17,
    fontWeight: "800",
    color: "#3F312B",
    textAlign: "right",
  },

  classDate: {
    fontSize: 13,
    color: "#8D6E63",
    textAlign: "right",
  },

  amountText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#7B5A4D",
    textAlign: "left",
  },

  mainLine: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4F3B31",
    textAlign: "right",
  },

  badgesRow: {
    flexDirection: "row-reverse",
    gap: 8,
    flexWrap: "wrap",
  },

  paymentBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  paymentPaid: {
    backgroundColor: "#E8F5E9",
  },

  paymentUnpaid: {
    backgroundColor: "#FCE8E6",
  },

  paymentBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F3B31",
  },

  fineBadge: {
    backgroundColor: "#FFF3E0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  fineBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8A5A00",
  },

  detailsBlock: {
    gap: 5,
  },

  detailText: {
    fontSize: 14,
    color: "#5B4438",
    textAlign: "right",
    lineHeight: 21,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    gap: 6,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#4F3B31",
    textAlign: "right",
  },

  emptyText: {
    fontSize: 14,
    color: "#6D564A",
    textAlign: "right",
    lineHeight: 22,
  },

  addButton: {
    backgroundColor: "#7B5A4D",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});

export default styles;