import { StyleSheet } from "react-native";

const competitionBoardStyles = StyleSheet.create({
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E3D7D0",
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  titleBlock: {
    flex: 1,
    marginRight: 12,
    alignItems: "flex-end",
  },
  statusBadgeBase: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3F312B",
    textAlign: "right",
    marginBottom: 6,
  },
  secondaryText: {
    fontSize: 14,
    color: "#8B6F63",
    textAlign: "right",
    marginBottom: 2,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "700",
  },
  buttonsRow: {
    flexDirection: "row-reverse",
    gap: 10,
    marginTop: 6,
  },
  buttonBase: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#8B6352",
  },
  secondaryButton: {
    backgroundColor: "#8B6352",
  },
  disabledButton: {
    backgroundColor: "#D9D9D9",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  disabledButtonText: {
    color: "#9B9B9B",
    fontSize: 17,
    fontWeight: "700",
  },
  emptyText: {
    textAlign: "center",
    color: "#8B6F63",
    fontSize: 16,
    marginTop: 40,
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 32,
  },
});

export default competitionBoardStyles;
