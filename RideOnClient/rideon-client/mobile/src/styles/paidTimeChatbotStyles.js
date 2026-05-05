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

  optionRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },

  optionRowSelected: {
    borderColor: COLORS.primary,
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
});

export { COLORS };
export default styles;
