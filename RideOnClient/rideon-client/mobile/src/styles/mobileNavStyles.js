import { StyleSheet } from "react-native";

const mobileNavStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5EDE8",
  },

  screenContainer: {
    flex: 1,
    backgroundColor: "#F5EDE8",
  },

  topBarWrapper: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: "#F5EDE8",
  },

  topBarLogo: {
    width: 72,
    height: 60,
  },

  topBarTextWrap: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 12,
  },

  topBarTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#4E342E",
    textAlign: "center",
  },

  topBarSubtitle: {
    marginTop: 6,
    fontSize: 15,
    color: "#9B7C6C",
    textAlign: "center",
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },

  bottomNavWrapper: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#E5D8D0",
    backgroundColor: "#FFFFFF",
    paddingTop: 10,
  },

  bottomNavButton: {
    width: 64,
    alignItems: "center",
    justifyContent: "center",
  },

  overlayWrap: {
    flex: 1,
    flexDirection: "row",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  sideMenuPanel: {
    width: "78%",
    backgroundColor: "#FAF7F5",
    borderLeftWidth: 1,
    borderLeftColor: "#E6DAD2",
    paddingTop: 0,
    paddingBottom: 24,
  },
});

export default mobileNavStyles;