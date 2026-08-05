import { StyleSheet } from "react-native";

const competitionsFilterBarStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E3D7D0",
    padding: 16,
    marginBottom: 16,
  },
  fieldBlock: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6D4C41",
    textAlign: "right",
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7CCC8",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    justifyContent: "center",
    textAlign: "right",
  },
  pickerBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7CCC8",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  dateRow: {
    flexDirection: "row-reverse",
    gap: 10,
  },
  dateField: {
    flex: 1,
  },
  resetButton: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7CCC8",
    alignItems: "center",
    justifyContent: "center",
  },
  resetButtonText: {
    color: "#5D4037",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default competitionsFilterBarStyles;
