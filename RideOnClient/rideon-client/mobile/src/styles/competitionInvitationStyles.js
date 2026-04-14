import { StyleSheet } from "react-native";

const competitionInvitationStyles = StyleSheet.create({
  screenContent: {
    paddingBottom: 28,
  },

  loaderWrap: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  loaderText: {
    marginTop: 12,
    color: "#7C6256",
    fontSize: 14,
    textAlign: "center",
  },

  errorCard: {
    backgroundColor: "#FFF2F2",
    borderColor: "#F2C9C9",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },

  errorText: {
    textAlign: "right",
    color: "#9C3D3D",
    fontSize: 14,
    lineHeight: 20,
  },

  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8DBD3",
    marginBottom: 16,
  },

  heroTitle: {
    textAlign: "right",
    fontSize: 24,
    fontWeight: "800",
    color: "#3F312B",
    marginBottom: 8,
  },

  heroSubTitle: {
    textAlign: "right",
    fontSize: 15,
    color: "#7C6256",
    marginBottom: 4,
  },

  heroStatusBadge: {
    alignSelf: "flex-end",
    backgroundColor: "#EFE4DC",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 10,
  },

  heroStatusText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6A4E42",
    textAlign: "center",
  },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E8DBD3",
    marginBottom: 16,
    overflow: "hidden",
  },

  sectionHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4A362E",
    textAlign: "right",
  },

  sectionHeaderIcon: {
    fontSize: 16,
    color: "#7C6256",
    textAlign: "center",
  },

  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  infoGrid: {
    gap: 12,
  },

  infoRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1E7E2",
    paddingBottom: 10,
  },

  infoLabel: {
    textAlign: "right",
    fontSize: 13,
    color: "#8D756A",
    marginBottom: 4,
  },

  infoValue: {
    textAlign: "right",
    fontSize: 15,
    fontWeight: "700",
    color: "#3F312B",
  },

  notesWrap: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1E7E2",
  },

  notesLabel: {
    textAlign: "right",
    fontSize: 13,
    color: "#8D756A",
    marginBottom: 6,
  },

  notesText: {
    textAlign: "right",
    fontSize: 14,
    lineHeight: 20,
    color: "#4A362E",
  },

  simpleListRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3ECE8",
  },

  simpleListText: {
    textAlign: "right",
    fontSize: 15,
    color: "#3F312B",
  },

  emptyText: {
    textAlign: "center",
    color: "#8D756A",
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 10,
  },

  tabsRow: {
    flexDirection: "row-reverse",
    gap: 8,
    paddingBottom: 12,
  },

  dayTab: {
    backgroundColor: "#F5F0EC",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  dayTabActive: {
    backgroundColor: "#7B5A4D",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  dayTabText: {
    color: "#6A4E42",
    fontWeight: "700",
    fontSize: 13,
    textAlign: "center",
  },

  dayTabActiveText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
    textAlign: "center",
  },

  itemCard: {
    borderWidth: 1,
    borderColor: "#F1E7E2",
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#FCFAF8",
    marginBottom: 10,
  },

  itemHeaderRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },

  itemTitle: {
    flex: 1,
    textAlign: "right",
    fontSize: 16,
    fontWeight: "800",
    color: "#3F312B",
  },

  priceText: {
    textAlign: "left",
    fontSize: 15,
    fontWeight: "800",
    color: "#7B5A4D",
  },

  itemMeta: {
    textAlign: "right",
    fontSize: 13,
    color: "#7C6256",
    marginBottom: 4,
    lineHeight: 18,
  },

  serviceCategoryWrap: {
    marginBottom: 14,
  },

  serviceCategoryTitle: {
    textAlign: "right",
    fontSize: 16,
    fontWeight: "800",
    color: "#4A362E",
    marginBottom: 10,
  },

  serviceRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1E7E2",
    borderRadius: 16,
    backgroundColor: "#FCFAF8",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 12,
  },

  serviceTextWrap: {
    flex: 1,
  },

  serviceName: {
    textAlign: "right",
    fontSize: 15,
    fontWeight: "700",
    color: "#3F312B",
  },

  serviceMeta: {
    textAlign: "right",
    fontSize: 12,
    color: "#8D756A",
    marginTop: 4,
  },

  servicePrice: {
    textAlign: "left",
    fontSize: 15,
    fontWeight: "800",
    color: "#7B5A4D",
  },

  ctaWrap: {
    marginTop: 6,
  },

  ctaButton: {
    backgroundColor: "#7B5A4D",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },

  ctaButtonText: {
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});

export default competitionInvitationStyles;