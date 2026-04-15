import { StyleSheet } from "react-native";

const homeScreenStyles = StyleSheet.create({
  pageContent: {
    paddingBottom: 28,
    gap: 18,
  },

  welcomeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E8DDD7",
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#3F312B",
    textAlign: "right",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#8B6F63",
    textAlign: "right",
    lineHeight: 20,
  },

  quickButton: {
    backgroundColor: "#8B6352",
    borderRadius: 18,
    minHeight: 60,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  quickButtonTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  quickButtonTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "right",
  },
  quickButtonSubtitle: {
    color: "#F5ECE8",
    fontSize: 13,
    textAlign: "right",
    marginTop: 4,
  },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E8DDD7",
    padding: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#3F312B",
    textAlign: "right",
    marginBottom: 14,
  },

  competitionCard: {
    borderWidth: 1,
    borderColor: "#EFE5DF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#FFFDFC",
  },
  competitionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  competitionTitleWrap: {
    flex: 1,
    marginRight: 12,
    alignItems: "flex-end",
  },
  competitionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#3F312B",
    textAlign: "right",
    marginBottom: 6,
  },
  competitionMeta: {
    fontSize: 13,
    color: "#8B6F63",
    textAlign: "right",
    marginBottom: 2,
  },
  statusBadgeBase: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },

  competitionButtonsRow: {
    flexDirection: "row-reverse",
    gap: 8,
    flexWrap: "wrap",
  },
  actionButton: {
    minWidth: 92,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  primaryActionButton: {
    backgroundColor: "#8B6352",
  },
  secondaryActionButton: {
    backgroundColor: "#EFE5DF",
  },
  disabledActionButton: {
    backgroundColor: "#E1E1E1",
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryActionText: {
    color: "#5D4037",
    fontSize: 15,
    fontWeight: "700",
  },
  disabledActionText: {
    color: "#999999",
    fontSize: 15,
    fontWeight: "700",
  },

  shortcutsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10,
  },
  shortcutCard: {
    width: "48%",
    backgroundColor: "#F8F5F2",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8DDD7",
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 92,
  },
  shortcutLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "#5D4037",
    textAlign: "center",
  },

  emptyText: {
    fontSize: 15,
    color: "#8B6F63",
    textAlign: "center",
    paddingVertical: 16,
  },
  loadingWrapper: {
    paddingVertical: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeRole: {
  fontSize: 15,
  fontWeight: "600",
  color: "#5D4037",
  textAlign: "right",
  marginTop: 6,
},
});

export default homeScreenStyles;
