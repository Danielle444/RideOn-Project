import { StyleSheet } from "react-native";

const workerStyles = StyleSheet.create({
  filterRow: {
    flexDirection: "row-reverse",
    gap: 12,
    marginBottom: 18,
  },

  filterButtonInactive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D7CCC8",
  },

  filterButtonTextInactive: {
    color: "#5D4037",
  },

  orderIconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#E7DDD8",
    alignItems: "center",
    justifyContent: "center",
  },

  orderStatusBadge: {
    alignSelf: "flex-end",
    marginTop: 8,
    backgroundColor: "#F7DCDD",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },

  orderStatusText: {
    color: "#C93E47",
    fontWeight: "700",
    fontSize: 13,
    textAlign: "right",
  },

  orderDetailsWrap: {
    marginBottom: 18,
  },

  orderDetailRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  orderDetailLabel: {
    fontSize: 16,
    color: "#7B5A4D",
    textAlign: "right",
  },

  orderDetailValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2C2C2C",
    textAlign: "right",
  },

  doneButton: {
    backgroundColor: "#D4C9C5",
  },
});

export default workerStyles;