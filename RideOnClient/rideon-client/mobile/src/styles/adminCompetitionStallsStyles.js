import { StyleSheet } from "react-native";

export default StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F1EE",
  },

  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
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
    paddingHorizontal: 14,
    paddingVertical: 7,
  },

  paymentPaid: {
    backgroundColor: "#DDF5E3",
  },

  paymentUnpaid: {
    backgroundColor: "#FCE4E4",
  },

  paymentBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3E2E27",
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
});
