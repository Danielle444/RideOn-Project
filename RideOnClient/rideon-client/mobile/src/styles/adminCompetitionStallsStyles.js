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

  stallCardDisabled: {
    opacity: 0.72,
  },

  stallTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },

  stallDetails: {
    flex: 1,
    alignItems: "flex-end",
  },

  stallTitleBlock: {
    width: "100%",
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

  stallStatusBadge: {
    marginTop: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },

  stallStatusText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#4F3B31",
    textAlign: "center",
  },

  stallStatusPending: {
    backgroundColor: "#FFF3D6",
  },

  stallStatusCancelled: {
    backgroundColor: "#FCE4E4",
  },

  stallStatusUpdated: {
    backgroundColor: "#E6F0FA",
  },

  stallDivider: {
    height: 1,
    backgroundColor: "#E8DCD6",
    marginTop: 16,
    marginBottom: 12,
  },

  stallFooterBlock: {
    gap: 10,
  },

  stallFooterActionsLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  stallTotalText: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
    color: "#6A4F43",
    textAlign: "right",
  },

  footerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },

  cancelStallButton: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0B8B3",
    backgroundColor: "#FFF7F6",
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelStallButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#A3473F",
  },

  editStallButton: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8C2B4",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  editStallButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6A5248",
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

  shavingsPlusButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8A6454",
  },

  shavingsPlus: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "800",
    lineHeight: 22,
  },

  shavingsPlusButtonDisabled: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEE4DE",
  },

  shavingsPlusDisabled: {
    fontSize: 20,
    color: "#A08C82",
    fontWeight: "800",
    lineHeight: 22,
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

  editFormCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E1D2CB",
  },

  editFormTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
    color: "#3E2E27",
    textAlign: "right",
  },

  editFormSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
    color: "#7B685F",
    textAlign: "right",
  },

  editLoadingWrap: {
    marginTop: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },

  editHelperText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#7B685F",
    textAlign: "right",
  },

  editErrorBox: {
    marginTop: 14,
    backgroundColor: "#FFF7F6",
    borderWidth: 1,
    borderColor: "#F0C4BD",
    borderRadius: 12,
    padding: 10,
  },

  editErrorText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#A3473F",
    fontWeight: "700",
    textAlign: "right",
  },

  editFieldBlock: {
    marginTop: 18,
  },

  editFieldLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900",
    color: "#4F3B31",
    textAlign: "right",
    marginBottom: 8,
  },

  editOptionRow: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E3D5CE",
    backgroundColor: "#FFFDFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
    marginBottom: 8,
  },

  editOptionRowActive: {
    borderColor: "#8A6454",
    backgroundColor: "#F6EFEA",
  },

  editOptionText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: "#5B4438",
    textAlign: "right",
  },

  editOptionTextActive: {
    color: "#4F3B31",
    fontWeight: "900",
  },

  editDateFields: {
    marginTop: 18,
    gap: 12,
  },

  editTextInput: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E3D5CE",
    backgroundColor: "#FFFDFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#3E2E27",
  },

  editSummaryBox: {
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: "#FAF5F1",
    borderWidth: 1,
    borderColor: "#E7D6CA",
    padding: 12,
    gap: 4,
  },

  editSummaryText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    color: "#5B4438",
    textAlign: "right",
  },

  editSubmitButton: {
    marginTop: 18,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#7B5A4D",
    alignItems: "center",
    justifyContent: "center",
  },

  editSubmitButtonDisabled: {
    opacity: 0.6,
  },

  editSubmitButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  topActionsRow: {
    flexDirection: "row-reverse",
    gap: 8,
    marginBottom: 12,
  },

  addStallTopButton: {
    flex: 1,
    minHeight: 42,
    backgroundColor: "#7B5A4D",
    borderRadius: 13,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  addStallTopButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    textAlign: "center",
  },

  addShavingsTopButton: {
    flex: 1,
    minHeight: 42,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8C7BC",
    borderRadius: 13,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },

  addShavingsTopButtonText: {
    color: "#6A5248",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    textAlign: "center",
  },
});
