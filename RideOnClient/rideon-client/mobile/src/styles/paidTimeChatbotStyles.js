import { StyleSheet } from "react-native";

const COLORS = {
  background: "#F5EFE6",
  surface: "#FFFFFF",
  primary: "#7B5A4D",
  primaryDark: "#5A4036",
  primaryLight: "#E8DCD0",
  textPrimary: "#2A2A2A",
  textMuted: "#7A7A7A",
  botBubble: "#FFFFFF",
  userBubble: "#7B5A4D",
  warning: "#D97706",
  warningBg: "#FEF3C7",
  border: "#D9CFC2",
  danger: "#B45454",
  success: "#5C7E5A",
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  headerBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "right",
    flex: 1,
    marginHorizontal: 12,
  },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  progressWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  progressText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "right",
    marginBottom: 6,
  },

  progressTrack: {
    height: 6,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 3,
    overflow: "hidden",
  },

  progressFill: {
    height: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  bubbleRow: {
    marginBottom: 12,
    flexDirection: "row",
  },

  bubbleRowBot: {
    justifyContent: "flex-start",
  },

  bubbleRowUser: {
    justifyContent: "flex-end",
  },

  bubble: {
    maxWidth: "85%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },

  bubbleBot: {
    backgroundColor: COLORS.botBubble,
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  bubbleUser: {
    backgroundColor: COLORS.userBubble,
    borderTopLeftRadius: 4,
  },

  bubbleTextBot: {
    color: COLORS.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "right",
  },

  bubbleTextUser: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "right",
  },

  answerCard: {
    marginTop: 4,
    marginBottom: 16,
    padding: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  primaryButton: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
  },

  primaryButtonDisabled: {
    backgroundColor: "#C4B5AA",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  secondaryButton: {
    marginTop: 8,
    backgroundColor: "transparent",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "600",
  },

  // מטרת מגע נוחה: 48 גובה מינימלי במקום שורה צרה.
  optionRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },

  optionRowSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: COLORS.primaryLight,
  },

  optionLabel: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    textAlign: "right",
    marginHorizontal: 8,
  },

  warningBanner: {
    backgroundColor: COLORS.warningBg,
    borderRightWidth: 4,
    borderRightColor: COLORS.warning,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },

  warningTitle: {
    color: COLORS.warning,
    fontWeight: "700",
    fontSize: 14,
    textAlign: "right",
    marginBottom: 4,
  },

  warningText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    textAlign: "right",
    lineHeight: 20,
  },

  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderRightWidth: 4,
    borderRightColor: COLORS.danger,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },

  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    textAlign: "right",
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "right",
  },

  // -------------------------------------------------------------------
  // שלב B2 - טופס הזמנה מרוכזת (במקום מראה של שיחת צ'אט).
  // אותה פלטה, בלי צבעים חדשים.
  // -------------------------------------------------------------------

  headerTitleBlock: {
    flex: 1,
    marginHorizontal: 12,
  },

  headerStepName: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "right",
    marginTop: 2,
  },

  progressSegments: {
    flexDirection: "row-reverse",
    gap: 4,
  },

  progressSegment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.primaryLight,
  },

  progressSegmentDone: {
    backgroundColor: COLORS.primary,
  },

  // רצועת הסיכום הקבועה שמלווה את כל השלבים.
  summaryStrip: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  summaryChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  summaryChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },

  summaryChipMuted: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // כותרת סקשן בתוך שלב (מחליפה את בועות הצ'אט).
  sectionHeading: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "right",
    marginBottom: 6,
  },

  sectionHelp: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "right",
    lineHeight: 21,
    marginBottom: 4,
  },

  infoNote: {
    backgroundColor: COLORS.surface,
    borderRightWidth: 4,
    borderRightColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },

  infoNoteText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    textAlign: "right",
    lineHeight: 20,
  },

  // סרגל ניווט תחתון קבוע.
  bottomBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  bottomBarButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  bottomBarPrimary: {
    backgroundColor: COLORS.primary,
  },

  bottomBarPrimaryDisabled: {
    backgroundColor: "#C4B5AA",
  },

  bottomBarPrimaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  bottomBarSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },

  bottomBarSecondaryText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "700",
  },

  bottomBarReason: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 2,
    backgroundColor: COLORS.surface,
  },

  bottomBarReasonText: {
    fontSize: 12,
    color: COLORS.warning,
    textAlign: "right",
    lineHeight: 18,
  },

  // חיפוש בתוך רשימת בחירה.
  searchInput: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },

  // צ'יפים של סוסים שנבחרו - נראים בלי לפתוח את הרשימה מחדש.
  chipsWrap: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },

  horseChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },

  horseChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },

  chipRemoveHit: {
    minWidth: 24,
    minHeight: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  selectedCountText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
    textAlign: "right",
    marginBottom: 8,
  },

  emptySelectionText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "right",
    marginBottom: 10,
  },

  // כרטיס בקשה בסקירה הסופית.
  requestCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
    gap: 6,
  },

  requestCardExcluded: {
    borderColor: COLORS.warning,
    backgroundColor: COLORS.warningBg,
  },

  requestCardTopRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  requestHorseName: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "right",
    flexShrink: 1,
  },

  requestPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.primary,
  },

  requestDetailRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 6,
  },

  requestDetailLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    minWidth: 46,
    textAlign: "right",
  },

  requestDetailValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    textAlign: "right",
    flex: 1,
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },

  statusBadgeOk: {
    backgroundColor: "#EAF2E9",
  },

  statusBadgeBlocked: {
    backgroundColor: COLORS.warningBg,
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },

  statusBadgeTextOk: {
    color: COLORS.success,
  },

  statusBadgeTextBlocked: {
    color: COLORS.warning,
  },

  // שורות סיכום כולל.
  totalsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },

  totalsRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  totalsLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: "right",
  },

  totalsValue: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.primary,
  },

  totalsValueStrong: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.primaryDark,
  },

  // מצב הצלחה.
  successIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF2E9",
    alignSelf: "center",
    marginBottom: 10,
  },

  successTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 4,
  },

  successSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 21,
  },
});

export { COLORS };
export default styles;
