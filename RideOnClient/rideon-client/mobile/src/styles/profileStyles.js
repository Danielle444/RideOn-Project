import { StyleSheet } from "react-native";

const profileStyles = StyleSheet.create({
  screenContent: {
    paddingBottom: 20,
  },

  headerCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7D8CF",
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 16,
  },

  headerTitle: {
    textAlign: "right",
    fontSize: 22,
    fontWeight: "800",
    color: "#4E342E",
    marginBottom: 12,
  },

  headerLine: {
    textAlign: "right",
    fontSize: 16,
    color: "#7B5A4D",
    marginBottom: 8,
  },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7D8CF",
    borderRadius: 24,
    marginBottom: 16,
    overflow: "hidden",
  },

  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EFE5DF",
    backgroundColor: "#FCFAF8",
  },

  sectionHeaderTextWrap: {
    flex: 1,
  },

  sectionTitle: {
    textAlign: "right",
    fontSize: 18,
    fontWeight: "800",
    color: "#4E342E",
  },

  sectionSubtitle: {
    textAlign: "right",
    fontSize: 13,
    color: "#8B6352",
    marginTop: 4,
    lineHeight: 18,
  },

  sectionBody: {
    padding: 16,
  },

  fieldCard: {
    borderWidth: 1,
    borderColor: "#EADFD8",
    backgroundColor: "#FCFAF8",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },

  fieldLabel: {
    textAlign: "right",
    fontSize: 13,
    fontWeight: "700",
    color: "#7B5A4D",
    marginBottom: 6,
  },

  fieldValue: {
    textAlign: "right",
    fontSize: 15,
    color: "#3F312B",
    lineHeight: 22,
  },

  fieldInput: {
    borderWidth: 1,
    borderColor: "#D8CBC3",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#3F312B",
    fontSize: 15,
  },

  buttonsRow: {
    marginTop: 6,
    gap: 10,
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

  destructiveButton: {
    borderRadius: 14,
    backgroundColor: "#B85C38",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  destructiveButtonText: {
    textAlign: "center",
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  helperText: {
    textAlign: "right",
    color: "#8A7268",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
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

  profileListItem: {
    borderWidth: 1,
    borderColor: "#EADFD8",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#FCFAF8",
    marginBottom: 10,
  },

  activeProfileListItem: {
    backgroundColor: "#F6F0EC",
    borderColor: "#DCC9BF",
  },

  profileListTitle: {
    textAlign: "right",
    fontSize: 16,
    fontWeight: "700",
    color: "#3F312B",
  },

  profileListSubTitle: {
    textAlign: "right",
    fontSize: 14,
    color: "#6D4C41",
    marginTop: 4,
  },

  profileBadgeRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },

  statusApproved: {
    backgroundColor: "#E5F4E9",
  },

  statusPending: {
    backgroundColor: "#FFF3D8",
  },

  statusOther: {
    backgroundColor: "#EFE8E3",
  },

  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4E342E",
  },

  platformText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6D4C41",
  },

  managerCard: {
    borderWidth: 1,
    borderColor: "#EADFD8",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#FCFAF8",
    marginBottom: 10,
  },

  managerName: {
    textAlign: "right",
    fontSize: 16,
    fontWeight: "700",
    color: "#3F312B",
    marginBottom: 6,
  },

  managerMeta: {
    textAlign: "right",
    fontSize: 14,
    color: "#6D4C41",
    marginBottom: 4,
    lineHeight: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.28)",
    justifyContent: "flex-end",
  },

  modalCard: {
    backgroundColor: "#FFFDFB",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    padding: 16,
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

  selectorButton: {
    borderWidth: 1,
    borderColor: "#D8CBC3",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },

  selectorButtonText: {
    textAlign: "right",
    fontSize: 15,
    color: "#3F312B",
  },

  optionsListWrap: {
    borderWidth: 1,
    borderColor: "#E7D8CF",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
    overflow: "hidden",
  },

  optionItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E8E2",
  },

  optionItemText: {
    textAlign: "right",
    color: "#3F312B",
    fontSize: 14,
  },

  searchInput: {
    borderWidth: 1,
    borderColor: "#D8CBC3",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#3F312B",
    fontSize: 15,
    marginBottom: 12,
  },

  emptyText: {
    textAlign: "center",
    color: "#8A7268",
    fontSize: 14,
    paddingVertical: 20,
  },
});

export default profileStyles;