import { StyleSheet } from "react-native";

// Pill visual language matches competitionInvitationStyles' CompetitionDayTabs pills
// (brown active pill, RTL row-reverse) — kept as its own file rather than extending that one,
// since it's competitions-scoped and this is a Worker-role component with an added count
// badge that component has no equivalent for.
const workerShavingsStatusTabsStyles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    gap: 8,
    marginBottom: 16,
  },

  tab: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F0EC",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  tabActive: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#7B5A4D",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  tabText: {
    color: "#6A4E42",
    fontWeight: "700",
    fontSize: 13,
  },

  tabActiveText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: "#E7D8CF",
    alignItems: "center",
    justifyContent: "center",
  },

  countBadgeActive: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },

  countBadgeText: {
    color: "#6A4E42",
    fontWeight: "700",
    fontSize: 12,
  },

  countBadgeTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
});

export default workerShavingsStatusTabsStyles;
