import { StyleSheet } from "react-native";

const roleSharedStyles = StyleSheet.create({
  /* ---------- HOME ---------- */

  welcomeCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7D8CF",
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 28,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  welcomeTitle: {
    textAlign: "right",
    fontSize: 22,
    fontWeight: "800",
    color: "#6E4C3D",
  },

  welcomeText: {
    textAlign: "right",
    fontSize: 18,
    color: "#2C2C2C",
    marginTop: 10,
    lineHeight: 28,
  },

  shortcutButton: {
    borderWidth: 2,
    borderColor: "#8B6352",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },

  shortcutButtonText: {
    color: "#6B4B3C",
    fontSize: 18,
    fontWeight: "800",
  },

  sectionTitle: {
    textAlign: "right",
    fontSize: 20,
    fontWeight: "800",
    color: "#4E342E",
    marginBottom: 16,
  },

  /* ---------- CARD ---------- */

  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7D8CF",
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 18,
  },

  cardTopRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  cardTextWrap: {
    flex: 1,
    paddingLeft: 14,
  },

  cardTitle: {
    textAlign: "right",
    fontSize: 18,
    fontWeight: "800",
    color: "#4E342E",
  },

  cardSubText: {
    textAlign: "right",
    fontSize: 14,
    color: "#9B7C6C",
    marginTop: 6,
  },

  statusBadge: {
    minWidth: 72,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },

  statusNow: {
    backgroundColor: "#DCECD9",
  },

  statusOpen: {
    backgroundColor: "#DCEAF8",
  },

  statusClosed: {
    backgroundColor: "#F1E5D5",
  },

  statusOther: {
    backgroundColor: "#EFE8E3",
  },

  statusText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4E342E",
  },

  buttonsRow: {
    flexDirection: "row-reverse",
    gap: 10,
  },

  primaryButton: {
    flex: 1,
    backgroundColor: "#8B6352",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  disabledButton: {
    backgroundColor: "#E5E1DF",
  },

  disabledButtonText: {
    color: "#9F9793",
  },

  /* ---------- MENU ---------- */

  menuWrapper: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
  },

  menuWrapperWithTopInset: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 55,
  },

  menuLogoWrap: {
    alignItems: "center",
    marginBottom: 18,
  },

  menuLogo: {
    width: 92,
    height: 72,
  },

  menuUserCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E7D8CF",
    padding: 16,
    marginBottom: 18,
  },

  menuUserName: {
    textAlign: "right",
    fontSize: 19,
    fontWeight: "800",
    color: "#4E342E",
  },

  menuUserMeta: {
    textAlign: "right",
    fontSize: 15,
    color: "#8B6352",
    marginTop: 8,
  },

  menuItem: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },

  activeMenuItem: {
    backgroundColor: "#F3ECE8",
  },

  menuItemText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#3E2723",
  },

  separator: {
    borderTopWidth: 1,
    borderTopColor: "#D7CCC8",
    marginVertical: 14,
  },

  logoutItem: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
  },

  logoutText: {
    color: "#D94141",
    fontWeight: "800",
    fontSize: 17,
  },

  /* ---------- PROFILE ---------- */

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
  },

  profileName: {
    textAlign: "right",
    fontSize: 22,
    fontWeight: "800",
    color: "#4E342E",
    marginBottom: 14,
  },

  profileLine: {
    textAlign: "right",
    fontSize: 16,
    color: "#7B5A4D",
    marginBottom: 10,
  },
});

export default roleSharedStyles;