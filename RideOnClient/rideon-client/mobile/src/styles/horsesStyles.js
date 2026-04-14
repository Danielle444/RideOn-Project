import { StyleSheet } from "react-native";

const horsesStyles = StyleSheet.create({
  screenContent: {
    paddingBottom: 20,
  },

  errorCard: {
    backgroundColor: "#FFF1F0",
    borderColor: "#F0C6C1",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },

  errorText: {
    textAlign: "right",
    color: "#A94442",
    fontSize: 14,
    lineHeight: 20,
  },

  searchCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7D8CF",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },

  searchLabel: {
    textAlign: "right",
    fontSize: 15,
    fontWeight: "700",
    color: "#6E4C3D",
    marginBottom: 10,
  },

  searchInput: {
    borderWidth: 1,
    borderColor: "#D8CBC3",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#3F312B",
    fontSize: 15,
    textAlign: "right",
  },

  helperText: {
    textAlign: "right",
    color: "#8A7268",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },

  loadingWrap: {
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    textAlign: "center",
    color: "#8A7268",
    fontSize: 14,
    marginTop: 10,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7D8CF",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 22,
  },

  emptyTitle: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#4E342E",
  },

  emptyText: {
    textAlign: "center",
    fontSize: 14,
    color: "#8A7268",
    marginTop: 8,
    lineHeight: 20,
  },

  listCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7D8CF",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },

  sectionTitle: {
    textAlign: "right",
    fontSize: 18,
    fontWeight: "800",
    color: "#4E342E",
    marginBottom: 12,
  },

  horseCard: {
    borderWidth: 1,
    borderColor: "#EADFD8",
    backgroundColor: "#FCFAF8",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },

  horseTitle: {
    textAlign: "right",
    fontSize: 17,
    fontWeight: "800",
    color: "#3F312B",
    marginBottom: 8,
  },

  horseMeta: {
    textAlign: "right",
    fontSize: 14,
    color: "#6D4C41",
    marginBottom: 4,
    lineHeight: 20,
  },

  rowWrap: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },

  badge: {
    borderRadius: 999,
    backgroundColor: "#EFE8E3",
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },

  badgeText: {
    color: "#5D4037",
    fontWeight: "700",
    fontSize: 12,
  },

  primaryButton: {
    borderRadius: 14,
    backgroundColor: "#7B5A4D",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  primaryButtonText: {
    textAlign: "center",
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D8CBC3",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  secondaryButtonText: {
    textAlign: "center",
    color: "#5D4037",
    fontWeight: "700",
    fontSize: 14,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.28)",
  },

  keyboardAvoidingWrap: {
    flex: 1,
  },

  modalCenterWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },

  modalCard: {
    backgroundColor: "#FFFDFB",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E7D8CF",
  },

  modalTitle: {
    textAlign: "right",
    fontSize: 20,
    fontWeight: "800",
    color: "#3F312B",
    marginBottom: 6,
  },

  modalSubtitle: {
    textAlign: "right",
    fontSize: 13,
    color: "#8A7268",
    marginBottom: 14,
    lineHeight: 18,
  },

  fieldLabel: {
    textAlign: "right",
    fontSize: 14,
    fontWeight: "700",
    color: "#6E4C3D",
    marginBottom: 10,
  },

  fieldInput: {
    borderWidth: 1,
    borderColor: "#D8CBC3",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#3F312B",
    fontSize: 18,
    textAlign: "right",
    marginBottom: 14,
  },

  modalButtonsRow: {
    gap: 10,
  },
});

export default horsesStyles;