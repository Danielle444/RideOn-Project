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

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    gap: 12,
  },

  searchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    gap: 10,
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

  summaryNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4F3B31",
  },

  summaryLabel: {
    fontSize: 12,
    color: "#7B5A4D",
    textAlign: "center",
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

  requestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    gap: 10,
  },

  cardTopRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  badgesRow: {
    flexDirection: "row-reverse",
    gap: 8,
    flexWrap: "wrap",
    flex: 1,
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  statusAssigned: {
    backgroundColor: "#E8F5E9",
  },

  statusPending: {
    backgroundColor: "#FFF3E0",
  },

  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F3B31",
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

  priceText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#7B5A4D",
    textAlign: "left",
  },

  horseName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#3F312B",
    textAlign: "right",
  },

  barnName: {
    fontSize: 13,
    color: "#8D6E63",
    textAlign: "right",
  },

  detailsBlock: {
    gap: 4,
  },

  detailText: {
    fontSize: 14,
    color: "#5B4438",
    textAlign: "right",
    lineHeight: 21,
  },

  slotCard: {
    backgroundColor: "#FAF5F1",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    gap: 4,
  },

  slotTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7B5A4D",
    textAlign: "right",
  },

  slotText: {
    fontSize: 14,
    color: "#4F3B31",
    textAlign: "right",
  },

  notesBox: {
    backgroundColor: "#FFF9F5",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#EADBD1",
    gap: 4,
  },

  notesTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7B5A4D",
    textAlign: "right",
  },

  notesText: {
    fontSize: 13,
    color: "#5B4438",
    textAlign: "right",
    lineHeight: 20,
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

  slotDateText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4F3B31",
    textAlign: "right",
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

  summaryBoxActive: {
    backgroundColor: "#7B5A4D",
    borderColor: "#7B5A4D",
  },

  summaryNumberActive: {
    color: "#FFFFFF",
  },

  summaryLabelActive: {
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
});

export default styles;
