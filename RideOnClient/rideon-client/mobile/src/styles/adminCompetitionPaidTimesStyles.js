import { StyleSheet } from "react-native";

var styles = StyleSheet.create({
  screenContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },

  errorCard: {
    backgroundColor: "#FFF1F0",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E3B4AE",
  },

  errorText: {
    color: "#9C3D35",
    fontSize: 14,
    textAlign: "right",
    lineHeight: 22,
  },

  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 10,
  },

  loadingText: {
    fontSize: 14,
    color: "#6D564A",
    textAlign: "center",
  },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    gap: 12,
  },

  searchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    gap: 10,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4F3B31",
    textAlign: "right",
  },

  helperText: {
    fontSize: 14,
    color: "#6D564A",
    textAlign: "right",
    lineHeight: 22,
  },

  summaryRow: {
    flexDirection: "row-reverse",
    gap: 10,
  },

  summaryBox: {
    flex: 1,
    backgroundColor: "#FAF5F1",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    alignItems: "center",
    gap: 4,
  },

  summaryNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4F3B31",
  },

  summaryLabel: {
    fontSize: 12,
    color: "#7B5A4D",
    textAlign: "center",
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5B4438",
    textAlign: "right",
  },

  textInput: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2D1C5",
    backgroundColor: "#FFFDFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#4F3B31",
  },

  requestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    gap: 10,
  },

  cardTopRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  badgesRow: {
    flexDirection: "row-reverse",
    gap: 8,
    flexWrap: "wrap",
    flex: 1,
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  statusAssigned: {
    backgroundColor: "#E8F5E9",
  },

  statusPending: {
    backgroundColor: "#FFF3E0",
  },

  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F3B31",
  },

  paymentBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  paymentPaid: {
    backgroundColor: "#E8F5E9",
  },

  paymentUnpaid: {
    backgroundColor: "#FCE8E6",
  },

  paymentBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F3B31",
  },

  priceText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#7B5A4D",
    textAlign: "left",
  },

  horseName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#3F312B",
    textAlign: "right",
  },

  barnName: {
    fontSize: 13,
    color: "#8D6E63",
    textAlign: "right",
  },

  detailsBlock: {
    gap: 4,
  },

  detailText: {
    fontSize: 14,
    color: "#5B4438",
    textAlign: "right",
    lineHeight: 21,
  },

  slotCard: {
    backgroundColor: "#FAF5F1",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    gap: 4,
  },

  slotTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7B5A4D",
    textAlign: "right",
  },

  slotText: {
    fontSize: 14,
    color: "#4F3B31",
    textAlign: "right",
  },

  notesBox: {
    backgroundColor: "#FFF9F5",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#EADBD1",
    gap: 4,
  },

  notesTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7B5A4D",
    textAlign: "right",
  },

  notesText: {
    fontSize: 13,
    color: "#5B4438",
    textAlign: "right",
    lineHeight: 20,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    gap: 6,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#4F3B31",
    textAlign: "right",
  },

  emptyText: {
    fontSize: 14,
    color: "#6D564A",
    textAlign: "right",
    lineHeight: 22,
  },

  slotDateText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4F3B31",
    textAlign: "right",
  },

  filterSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    gap: 10,
  },

  filterTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#4F3B31",
    textAlign: "right",
  },

  chipsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },

  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#FAF5F1",
    borderWidth: 1,
    borderColor: "#E7D6CA",
  },

  filterChipActive: {
    backgroundColor: "#7B5A4D",
    borderColor: "#7B5A4D",
  },

  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5B4438",
  },

  filterChipTextActive: {
    color: "#FFFFFF",
  },

  summaryBoxActive: {
    backgroundColor: "#7B5A4D",
    borderColor: "#7B5A4D",
  },

  summaryNumberActive: {
    color: "#FFFFFF",
  },

  summaryLabelActive: {
    color: "#FFFFFF",
  },

  clearFiltersButton: {
    alignSelf: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

  clearFiltersText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7B5A4D",
  },

  resultsText: {
    fontSize: 13,
    color: "#7B5A4D",
    textAlign: "right",
  },

  filterToggleCard: {
    gap: 10,
  },

  filterToggleButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },

  filterToggleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4F3B31",
  },

  filterToggleIcon: {
    fontSize: 12,
    color: "#7B5A4D",
  },

  // ---------------------------------------------------------------------
  // טופס בקשה בודדת (טאב פייד טיים במסך ההרשמות).
  //
  // CompetitionPaidTimeFormCard ו-CompetitionPaidTimeTab מייבאים את הקובץ
  // הזה, אבל השתמשו במפתחות שקיימים רק ב-adminCompetitionRegistrationsStyles,
  // כך שהכרטיס וכפתור השליחה קיבלו undefined ורונדרו בלי עיצוב. הערכים כאן
  // הועתקו משם כדי שהטופס ייראה זהה לטאב המקצים - לא הומצאה כאן פלטה חדשה.
  // ---------------------------------------------------------------------

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    gap: 14,
  },

  fieldBlock: {
    gap: 8,
  },

  fieldHeaderRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },

  inlineLockIconButton: {
    minWidth: 28,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  notesInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },

  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#7B5A4D",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  primaryButtonDisabled: {
    opacity: 0.6,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  // סקשנים בתוך טופס הבקשה הבודדת: מתי / סוג / פרטים / הערות.
  formSection: {
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F0E4DC",
  },

  formSectionFirst: {
    paddingTop: 0,
    borderTopWidth: 0,
  },

  formSectionHeaderRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  formSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#4F3B31",
    textAlign: "right",
    flexShrink: 1,
  },

  formSectionHint: {
    fontSize: 12,
    color: "#8A7468",
    textAlign: "right",
    lineHeight: 18,
  },

  lockHintRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FAF5F1",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EADBD1",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  lockHintText: {
    fontSize: 12,
    color: "#7B5A4D",
    textAlign: "right",
    lineHeight: 18,
    flexShrink: 1,
  },

  fieldErrorText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9C3D35",
    textAlign: "right",
    lineHeight: 18,
  },

  // תיבת סיכום לערך שנבחר (סלוט מבוקש / סוג פייד טיים).
  selectionSummaryCard: {
    backgroundColor: "#FAF5F1",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    padding: 12,
    gap: 6,
  },

  selectionSummaryRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 8,
  },

  selectionSummaryLabel: {
    fontSize: 13,
    color: "#8A7468",
    textAlign: "right",
    minWidth: 58,
  },

  selectionSummaryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4F3B31",
    textAlign: "right",
    flexShrink: 1,
    flex: 1,
  },

  infoNote: {
    backgroundColor: "#FFF8F3",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EADBD1",
    paddingVertical: 9,
    paddingHorizontal: 10,
  },

  infoNoteText: {
    fontSize: 12,
    color: "#7B5A4D",
    textAlign: "right",
    lineHeight: 18,
  },

  infoNoteStrong: {
    fontSize: 13,
    fontWeight: "800",
    color: "#5B4438",
    textAlign: "right",
    lineHeight: 20,
  },

  // כרטיסי בחירת סוג פייד טיים (מחליפים את הדרופדאון).
  typeCardsWrap: {
    gap: 10,
  },

  typeCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D8C1B4",
    backgroundColor: "#FFFDFB",
    padding: 12,
    minHeight: 60,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  typeCardActive: {
    borderColor: "#7B5A4D",
    backgroundColor: "#FFF8F3",
    borderWidth: 2,
  },

  typeCardTextWrap: {
    flex: 1,
    gap: 3,
  },

  typeCardName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4F3B31",
    textAlign: "right",
  },

  typeCardMeta: {
    fontSize: 12,
    color: "#8A7468",
    textAlign: "right",
  },

  typeCardPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: "#7B5A4D",
    textAlign: "left",
  },

  // מודלים משותפים של המסלול הבודד: בחירת אופן הזמנה / אישור / הצלחה.
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 16,
  },

  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    maxHeight: "90%",
    gap: 12,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#3F312B",
    textAlign: "right",
  },

  modalSubtitle: {
    fontSize: 13,
    color: "#8A7468",
    textAlign: "right",
    lineHeight: 20,
  },

  modalScroll: {
    maxHeight: 420,
  },

  modalActionsRow: {
    flexDirection: "row-reverse",
    gap: 10,
  },

  modalPrimaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#7B5A4D",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  modalPrimaryButtonDisabled: {
    opacity: 0.6,
  },

  modalPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },

  modalSecondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#7B5A4D",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  modalSecondaryText: {
    color: "#7B5A4D",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },

  // כרטיסי הבחירה של אופן ההזמנה (הזמנה אחת / כמה הזמנות יחד).
  modeCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D8C1B4",
    backgroundColor: "#FFFDFB",
    padding: 14,
    minHeight: 76,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },

  modeCardBulk: {
    borderColor: "#7B5A4D",
    backgroundColor: "#FFF8F3",
  },

  modeCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3E7DE",
  },

  modeCardTextWrap: {
    flex: 1,
    gap: 4,
  },

  modeCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#4F3B31",
    textAlign: "right",
  },

  modeCardText: {
    fontSize: 12,
    color: "#7B6355",
    textAlign: "right",
    lineHeight: 18,
  },

  // שורות מסך האישור.
  reviewGroup: {
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0E4DC",
  },

  reviewGroupFirst: {
    paddingTop: 0,
    borderTopWidth: 0,
  },

  reviewGroupTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#7B5A4D",
    textAlign: "right",
  },

  reviewRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 8,
  },

  reviewLabel: {
    fontSize: 13,
    color: "#8A7468",
    textAlign: "right",
    minWidth: 74,
  },

  reviewValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4F3B31",
    textAlign: "right",
    flex: 1,
    flexShrink: 1,
  },

  reviewPriceValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#7B5A4D",
    textAlign: "right",
    flex: 1,
  },

  // מצב ההצלחה.
  successIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    alignSelf: "center",
  },

  successTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#3F312B",
    textAlign: "center",
  },

  successPendingBadge: {
    alignSelf: "center",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFF3E0",
  },

  successPendingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7B5A4D",
    textAlign: "center",
  },

  // הודעה כשאין לתחרות הגדרות פייד טיים (סלוטים/מחירים).
  setupNoticeCard: {
    backgroundColor: "#FFF8F3",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7D6CA",
    padding: 18,
    gap: 8,
  },

  setupNoticeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3E7DE",
    alignSelf: "flex-end",
  },

  setupNoticeTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#4F3B31",
    textAlign: "right",
  },

  setupNoticeText: {
    fontSize: 14,
    color: "#5B4438",
    textAlign: "right",
    lineHeight: 22,
  },

  setupNoticeHint: {
    fontSize: 13,
    color: "#8A7468",
    textAlign: "right",
    lineHeight: 20,
  },
});

export default styles;
