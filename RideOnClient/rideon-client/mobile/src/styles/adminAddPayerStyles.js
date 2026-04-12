import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 24,
    gap: 16,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2D6CF",
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    textAlign: "right",
    color: "#5D4037",
    fontSize: 15,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#F9F5F2",
    borderWidth: 1,
    borderColor: "#D7CCC8",
    borderRadius: 14,
    minHeight: 50,
    paddingHorizontal: 14,
    color: "#3E2723",
    fontSize: 15,
  },
  infoBox: {
    backgroundColor: "#F4ECE7",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 8,
  },
  infoText: {
    flex: 1,
    textAlign: "right",
    color: "#6D4C41",
    fontSize: 14,
    lineHeight: 22,
  },
  submitButton: {
    backgroundColor: "#8B6352",
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  backButton: {
    backgroundColor: "#EAE2DE",
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    color: "#7B5A4D",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default styles;