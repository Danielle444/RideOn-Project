import { StyleSheet } from "react-native";

export default StyleSheet.create({
  contentContainer: {
    padding: 16,
    paddingBottom: 120,
  },

  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8DDD6",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },

  headerTopRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  payerName: {
    flex: 1,
    fontSize: 22,
    fontWeight: "900",
    color: "#4F3B31",
    textAlign: "right",
  },

  payerSubText: {
    marginTop: 5,
    fontSize: 13,
    color: "#8A7268",
    textAlign: "right",
  },

  statusBadgeBase: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },

  statusPaid: {
    backgroundColor: "#E8F5E9",
  },

  statusPartial: {
    backgroundColor: "#FFF4DE",
  },

  statusUnpaid: {
    backgroundColor: "#FDECEC",
  },

  statusDefault: {
    backgroundColor: "#EFE7E2",
  },

  statusTextBase: {
    fontSize: 12,
    fontWeight: "900",
  },

  statusTextPaid: {
    color: "#2E7D32",
  },

  statusTextPartial: {
    color: "#B26A00",
  },

  statusTextUnpaid: {
    color: "#B42318",
  },

  statusTextDefault: {
    color: "#6A5248",
  },

  summaryGrid: {
    marginTop: 16,
    gap: 10,
  },

  summaryRow: {
    flexDirection: "row-reverse",
    gap: 10,
  },

  summaryBox: {
    flex: 1,
    backgroundColor: "#FAF6F2",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E8DDD6",
  },

  summaryLabel: {
    fontSize: 12,
    color: "#8A7268",
    textAlign: "right",
    marginBottom: 4,
  },

  summaryValue: {
    fontSize: 17,
    fontWeight: "900",
    color: "#4F3B31",
    textAlign: "right",
  },

  grandTotalBox: {
    backgroundColor: "#7B5A4D",
    borderRadius: 18,
    padding: 14,
    marginTop: 10,
  },

  grandTotalLabel: {
    fontSize: 13,
    color: "#F4E9E0",
    textAlign: "right",
    marginBottom: 4,
  },

  grandTotalValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "right",
  },

  tabsWrap: {
    flexDirection: "row-reverse",
    backgroundColor: "#EFE7E2",
    padding: 4,
    borderRadius: 16,
    marginBottom: 14,
  },

  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  tabButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },

  tabText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#8A7268",
  },

  tabTextActive: {
    color: "#4F3B31",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#4F3B31",
    textAlign: "right",
    marginBottom: 10,
  },

  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8DDD6",
  },

  itemTopRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },

  itemTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    color: "#4F3B31",
    textAlign: "right",
  },

  itemAmount: {
    fontSize: 16,
    fontWeight: "900",
    color: "#7B5A4D",
    textAlign: "left",
  },

  itemText: {
    fontSize: 13,
    color: "#6A5248",
    textAlign: "right",
    marginTop: 4,
    lineHeight: 19,
  },

  itemMutedText: {
    fontSize: 12,
    color: "#9E8A7F",
    textAlign: "right",
    marginTop: 4,
  },

  splitRow: {
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 10,
  },

  splitPill: {
    flex: 1,
    backgroundColor: "#FAF6F2",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },

  splitPillLabel: {
    fontSize: 11,
    color: "#8A7268",
    textAlign: "right",
  },

  splitPillValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#4F3B31",
    textAlign: "right",
    marginTop: 2,
  },

  emptyWrap: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E8DDD6",
    alignItems: "center",
  },

  emptyText: {
    fontSize: 14,
    color: "#8A7268",
    textAlign: "center",
    lineHeight: 20,
  },

  loadingWrap: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 10,
    color: "#7B5A4D",
    fontSize: 14,
    fontWeight: "700",
  },

  errorCard: {
    backgroundColor: "#FDECEC",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F7C6C6",
  },

  errorText: {
    color: "#B42318",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  refreshButton: {
    backgroundColor: "#7B5A4D",
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 16,
    marginTop: 12,
    alignSelf: "center",
  },

  refreshButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});