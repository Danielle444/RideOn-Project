import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 24,
    gap: 16,
  },
  searchCard: {
    backgroundColor: "#F4ECE7",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2D6CF",
  },
  searchLabel: {
    textAlign: "right",
    color: "#5D4037",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7CCC8",
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    color: "#3E2723",
    fontSize: 15,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#8B6352",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingWrap: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    backgroundColor: "#F4ECE7",
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E2D6CF",
  },
  emptyText: {
    textAlign: "center",
    color: "#7B5A4D",
    fontSize: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2D6CF",
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 8,
  },
  cardTopRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#EFE4DE",
    alignItems: "center",
    justifyContent: "center",
  },
  fullNameText: {
    textAlign: "right",
    color: "#3E2723",
    fontSize: 24,
    fontWeight: "700",
  },
  infoText: {
    textAlign: "right",
    color: "#6D4C41",
    fontSize: 16,
    lineHeight: 24,
  },
  totalAmountText: {
    textAlign: "right",
    color: "#5D4037",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  enterButton: {
    marginTop: 10,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#8B6352",
    alignItems: "center",
    justifyContent: "center",
  },
  enterButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  statusBadgeBase: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  statusBadgePaid: {
    backgroundColor: "#E3F1E7",
  },
  statusBadgePartial: {
    backgroundColor: "#FFF0D8",
  },
  statusBadgeUnpaid: {
    backgroundColor: "#FDE4E4",
  },
  statusBadgeDefault: {
    backgroundColor: "#ECE7E3",
  },
  statusTextBase: {
    fontSize: 14,
    fontWeight: "700",
  },
  statusTextPaid: {
    color: "#2E7D32",
  },
  statusTextPartial: {
    color: "#F57C00",
  },
  statusTextUnpaid: {
    color: "#D94141",
  },
  statusTextDefault: {
    color: "#7B5A4D",
  },
});

export default styles;