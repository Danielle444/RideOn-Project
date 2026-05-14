import { StyleSheet } from "react-native";

export default StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F1EE",
  },

  content: {
    padding: 16,
    paddingBottom: 120,
  },

  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F6F1EE",
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6A5248",
    fontWeight: "500",
  },

  errorWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F6F1EE",
  },

  errorText: {
    color: "#B42318",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E9DDD6",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
    gap: 14,
  },

  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  horseName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#3E2E27",
  },

  dateText: {
    marginTop: 4,
    fontSize: 14,
    color: "#7B685F",
  },

  amountText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#5B4338",
  },

  paymentBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  paymentPaid: {
    backgroundColor: "#DDF5E3",
  },

  paymentUnpaid: {
    backgroundColor: "#FCE4E4",
  },

  paymentBadgeText: {
    fontSize: 13,
    fontWeight: "800",
  },

  paymentBadgeTextPaid: {
    color: "#2F6B3B",
  },

  paymentBadgeTextUnpaid: {
    color: "#9D3E3E",
  },

  shavingsSection: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#EFE5DF",
    paddingTop: 12,
    gap: 10,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4E3A32",
  },

  emptyText: {
    fontSize: 14,
    color: "#8A776E",
  },

  shavingsCard: {
    backgroundColor: "#FAF7F5",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EEE4DE",
    gap: 4,
  },

  shavingsText: {
    fontSize: 14,
    color: "#5C463D",
  },

  emptyWrap: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9DDD6",
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3E2E27",
  },

  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#7B685F",
    textAlign: "center",
    lineHeight: 22,
  },

  shavingsMiniWidget: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#FAF5F1",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    minWidth: 170,
  },

  shavingsMiniTop: {
    gap: 4,
  },

  shavingsMiniTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4F3B31",
    textAlign: "right",
  },

  shavingsMiniCount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#7B5A4D",
    textAlign: "right",
  },

  shavingsMiniActions: {
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 10,
  },

  shavingsMiniButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    backgroundColor: "#7B5A4D",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  shavingsMiniButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  historyModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    maxHeight: "78%",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5D6CE",
  },

  historyModalHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E9DDD6",
    backgroundColor: "#FFFFFF",
  },

  historyCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F6F1EE",
    alignItems: "center",
    justifyContent: "center",
  },

  historyHeaderSpacer: {
    width: 42,
  },

  historyTitleWrap: {
    flex: 1,
    alignItems: "center",
  },

  historyModalTitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "900",
    color: "#3E2E27",
    textAlign: "center",
  },

  historySubtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: "#8A766A",
    textAlign: "center",
  },

  historySummaryRow: {
    flexDirection: "row-reverse",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFDFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E9DDD6",
  },

  historySummaryBox: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#FAF5F1",
    borderWidth: 1,
    borderColor: "#E7D6CA",
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
  },

  historySummaryValue: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
    color: "#5B4438",
    textAlign: "center",
  },

  historySummaryLabel: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: "#8A766A",
    textAlign: "center",
  },

  historyContent: {
    padding: 14,
    paddingBottom: 18,
    gap: 12,
  },

  historyEmptyWrap: {
    alignItems: "center",
    paddingVertical: 34,
    paddingHorizontal: 18,
  },

  historyEmptyTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#4F3B31",
    textAlign: "center",
  },

  historyEmptyText: {
    marginTop: 8,
    fontSize: 14,
    color: "#7B5A4D",
    textAlign: "center",
    lineHeight: 22,
  },

  historyOrderCard: {
    backgroundColor: "#FAF5F1",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E7D6CA",
  },

  historyOrderHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E8DCD6",
  },

  historyOrderPrice: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "900",
    color: "#5B4438",
    textAlign: "left",
  },

  historyStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: 150,
  },

  historyStatusSuccess: {
    backgroundColor: "#DDF5E3",
  },

  historyStatusInfo: {
    backgroundColor: "#E6F0FA",
  },

  historyStatusWarning: {
    backgroundColor: "#FFF3D6",
  },

  historyStatusDanger: {
    backgroundColor: "#FCE4E4",
  },

  historyStatusNeutral: {
    backgroundColor: "#EEE4DE",
  },

  historyStatusText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    color: "#4F3B31",
    textAlign: "center",
  },

  historyDetailsList: {
    marginTop: 10,
    gap: 8,
  },

  historyDetailRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  historyDetailLabel: {
    width: 92,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "900",
    color: "#8A766A",
    textAlign: "right",
  },

  historyDetailValue: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    color: "#3E2E27",
    textAlign: "left",
  },

  historyNotesBox: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#EADDD5",
  },

  historyNotesLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    color: "#8A766A",
    textAlign: "right",
    marginBottom: 4,
  },

  historyNotesText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#5B4438",
    textAlign: "right",
  },

  stallCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E1D2CB",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  stallTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },

  shavingsPanel: {
    width: 150,
    minHeight: 122,
    backgroundColor: "#FFFDFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCCBC2",
    padding: 10,
  },

  shavingsPanelTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },

  shavingsPlus: {
    fontSize: 18,
    color: "#5B4438",
    fontWeight: "400",
    lineHeight: 20,
  },

  shavingsPanelTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#5B4438",
    textAlign: "right",
    lineHeight: 18,
  },

  shavingsPanelPrice: {
    marginTop: 10,
    fontSize: 13,
    color: "#6B554B",
    fontWeight: "600",
    textAlign: "right",
    lineHeight: 17,
  },

  historyButton: {
    marginTop: 10,
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D9C8BF",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  historyButtonText: {
    fontSize: 12,
    lineHeight: 15,
    color: "#6A5248",
    fontWeight: "700",
    textAlign: "center",
  },

  stallDetails: {
    flex: 1,
    alignItems: "flex-end",
  },

  stallHorseName: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900",
    color: "#3E2E27",
    textAlign: "right",
  },

  stallMeta: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 19,
    color: "#6F5A51",
    fontWeight: "500",
    textAlign: "right",
  },

  stallDivider: {
    height: 1,
    backgroundColor: "#E8DCD6",
    marginTop: 16,
    marginBottom: 12,
  },

  stallFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  footerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 48,
  },

  iconButton: {
    minWidth: 28,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  iconButtonText: {
    fontSize: 20,
    color: "#5B4438",
  },

  totalAndStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  stallTotalText: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "900",
    color: "#6A4F43",
    textAlign: "right",
  },

  stallCardHeader: {
    minHeight: 160,
    justifyContent: "flex-start",
  },

  stallMainInfo: {
    flex: 1,
    paddingLeft: 170,
  },

  stallContentRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },

  stallDates: {
    marginTop: 8,
    fontSize: 14,
    color: "#7B685F",
    textAlign: "right",
  },

  stallMiddleRow: {
    marginTop: 10,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  stallLabel: {
    fontSize: 13,
    color: "#8A766A",
    textAlign: "right",
  },

  stallDateText: {
    marginTop: 2,
    fontSize: 14,
    color: "#7B685F",
    textAlign: "right",
    lineHeight: 20,
  },

  stallPriceSection: {
    marginTop: 12,
    alignItems: "flex-end",
  },

  stallPriceLabel: {
    fontSize: 14,
    color: "#8A766A",
    textAlign: "right",
  },

  stallPrice: {
    marginTop: 2,
    fontSize: 24,
    fontWeight: "900",
    color: "#5B4438",
    textAlign: "right",
    lineHeight: 30,
  },

  stallNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: "#6B5245",
    textAlign: "right",
  },

  shavingsCountWrap: {
    marginTop: 6,
    alignItems: "flex-end",
  },

  shavingsPanelCount: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: "900",
    color: "#4B342B",
    textAlign: "right",
    lineHeight: 28,
  },

  shavingsPanelSubtitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#4B342B",
    textAlign: "right",
    lineHeight: 18,
  },

  shavingsButtonsWrap: {
    gap: 8,
  },

  addShavingsButton: {
    height: 40,
    borderRadius: 12,
    backgroundColor: "#8A6454",
    alignItems: "center",
    justifyContent: "center",
  },

  addShavingsButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  shavingsActionButton: {
    height: 38,
    borderRadius: 12,
    backgroundColor: "#7B5A4D",
    alignItems: "center",
    justifyContent: "center",
  },

  shavingsActionText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  shavingsActionButtonSecondary: {
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8C2B4",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  shavingsActionTextSecondary: {
    color: "#6B5245",
    fontWeight: "700",
    fontSize: 13,
  },

  addShavingsTopButton: {
    backgroundColor: "#7B5A4D",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  addShavingsTopButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  shavingsModalContainer: {
    flex: 1,
    backgroundColor: "#F8F4F1",
  },

  shavingsModalHeader: {
    minHeight: 58,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E7D6CA",
  },

  shavingsModalCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F1EE",
  },

  shavingsModalHeaderSpacer: {
    width: 42,
    height: 42,
  },

  shavingsModalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    color: "#4F3B31",
    textAlign: "center",
  },

  shavingsModalContent: {
    padding: 16,
    paddingBottom: 40,
  },

  shavingsPlusButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6EFEA",
  },
});
