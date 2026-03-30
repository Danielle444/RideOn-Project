import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#E9E4E2",
  },

  keyboardWrapper: {
    flex: 1,
  },

  centeredScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    backgroundColor: "#E9E4E2",
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 28,
    backgroundColor: "#E9E4E2",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E9E4E2",
  },

  loadingText: {
    marginTop: 12,
    color: "#6A3F2C",
    fontSize: 15,
    textAlign: "center",
  },

  card: {
    width: "100%",
    maxWidth: 390,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
    shadowColor: "#6E4B3A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 8,
  },

  logo: {
    width: 130,
    height: 70,
    alignSelf: "center",
    marginBottom: 20,
  },

  loginTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#5B3524",
    textAlign: "center",
    marginBottom: 26,
  },

  registerTitle: {
    width: "100%",
    fontSize: 22,
    fontWeight: "700",
    color: "#5B3524",
    textAlign: "right",
    marginBottom: 8,
  },

  registerSubtitle: {
    width: "100%",
    fontSize: 14,
    color: "#8A6A5C",
    textAlign: "right",
    marginBottom: 20,
    lineHeight: 20,
  },

  errorText: {
    textAlign: "right",
    color: "#C62828",
    marginBottom: 12,
    backgroundColor: "#FDECEC",
    padding: 10,
    borderRadius: 12,
  },

  successText: {
    textAlign: "right",
    color: "#2E7D32",
    marginBottom: 12,
    backgroundColor: "#EDF7ED",
    padding: 10,
    borderRadius: 12,
  },

  fieldGroup: {
    marginBottom: 16,
    width: "100%",
  },

  label: {
    width: "100%",
    fontSize: 15,
    fontWeight: "600",
    color: "#6A3F2C",
    textAlign: "right",
    marginBottom: 8,
  },

  helperText: {
    width: "100%",
    textAlign: "right",
    color: "#8D6E63",
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },

  input: {
    width: "100%",
    height: 48,
    borderWidth: 1.2,
    borderColor: "#D8C8C1",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#3E2A22",
  },

  readOnlyInput: {
    backgroundColor: "#F3ECE8",
    borderColor: "#E5D7CF",
    color: "#6D4C41",
  },

  passwordWrapper: {
    width: "100%",
    height: 48,
    borderWidth: 1.2,
    borderColor: "#D8C8C1",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },

  passwordInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 14,
    paddingLeft: 6,
    fontSize: 16,
    color: "#3E2A22",
    textAlign: "right",
  },

  eyeButton: {
    width: 48,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#E8D8D1",
  },

  optionsRow: {
    marginTop: 2,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  rememberWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.4,
    borderColor: "#8B6A5A",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  checkboxChecked: {
    backgroundColor: "#8B6352",
    borderColor: "#8B6352",
  },

  checkboxMark: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  optionText: {
    fontSize: 14,
    color: "#6A3F2C",
  },

  forgotText: {
    fontSize: 14,
    color: "#6A3F2C",
  },

  primaryButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#8B6352",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 18,
  },

  primaryButtonCompact: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#8B6352",
    justifyContent: "center",
    alignItems: "center",
  },

  primaryButtonDisabled: {
    opacity: 0.7,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },

  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.3,
    borderColor: "#D8C8C1",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  secondaryButtonText: {
    color: "#795548",
    fontSize: 16,
    fontWeight: "600",
  },

  bottomLink: {
    textAlign: "center",
    color: "#8B6352",
    fontSize: 16,
  },

  stepButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },

  sectionBox: {
    borderWidth: 1,
    borderColor: "#E9D8CF",
    borderRadius: 18,
    marginBottom: 14,
    overflow: "hidden",
    backgroundColor: "#FFFDFC",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FBF5F1",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  sectionHeaderArrow: {
    fontSize: 14,
    color: "#8B6352",
    marginLeft: 10,
  },

  sectionHeaderText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#5D4037",
    textAlign: "right",
  },

  sectionContent: {
    padding: 16,
  },

  genderRow: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
  },

  genderOption: {
    flex: 1,
    borderWidth: 1.2,
    borderColor: "#D8C8C1",
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  genderOptionSelected: {
    backgroundColor: "#8B6352",
    borderColor: "#8B6352",
  },

  genderOptionText: {
    color: "#5D4037",
    fontSize: 15,
    fontWeight: "600",
  },

  genderOptionTextSelected: {
    color: "#FFFFFF",
  },

  readOnlyOption: {
    opacity: 0.75,
  },

  inputButton: {
    width: "100%",
    height: 48,
    borderWidth: 1.2,
    borderColor: "#D8C8C1",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    justifyContent: "center",
  },

  inputButtonText: {
    textAlign: "right",
    color: "#3E2A22",
    fontSize: 16,
  },

  placeholderText: {
    color: "#B7AAA3",
  },

  pairBox: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EFE3DC",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#FFFCFA",
  },

  pairTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  pairTopActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  pairEditTitle: {
    color: "#6A3F2C",
    fontWeight: "700",
    fontSize: 14,
    textAlign: "right",
    flex: 1,
  },

  collapsedPairCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAD8CF",
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#FFFCFA",
    marginBottom: 10,
  },

  collapsedPairTextWrap: {
    flex: 1,
    alignItems: "flex-end",
  },

  collapsedPairMain: {
    fontSize: 15,
    fontWeight: "700",
    color: "#5D4037",
    textAlign: "right",
  },

  collapsedPairSub: {
    marginTop: 4,
    fontSize: 13,
    color: "#8B6A5A",
    textAlign: "right",
  },

  collapsedPairActions: {
    marginLeft: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  collapsedPairArrow: {
    color: "#8B6352",
    fontSize: 14,
    marginTop: 4,
  },

  removeSmallButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#FDECEC",
  },

  removeSmallButtonText: {
    color: "#C62828",
    fontSize: 12,
    fontWeight: "700",
  },

  removePairButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#FDECEC",
  },

  removePairButtonText: {
    color: "#C62828",
    fontSize: 12,
    fontWeight: "700",
  },

  pickerBox: {
    width: "100%",
    borderWidth: 1.2,
    borderColor: "#D8C8C1",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },

  picker: {
    width: "100%",
    color: "#3E2A22",
  },

  addPairButton: {
    marginTop: 2,
    marginBottom: 12,
    alignSelf: "flex-end",
  },

  addPairButtonText: {
    color: "#795548",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },

  noticeBox: {
    backgroundColor: "#FFF4E5",
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
  },

  noticeText: {
    textAlign: "right",
    color: "#7A4E2D",
    fontSize: 13,
    lineHeight: 18,
  },
  passwordLabelRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
  },

  infoButton: {
    padding: 2,
  },

  passwordInfoBox: {
    backgroundColor: "#F8F3F0",
    borderWidth: 1,
    borderColor: "#E6D7CF",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },

  passwordInfoText: {
    fontSize: 12,
    color: "#6D4C41",
    textAlign: "right",
    lineHeight: 18,
  },
});

export default styles;
