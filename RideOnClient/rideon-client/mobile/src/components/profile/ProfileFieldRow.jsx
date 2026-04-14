import { Text, TextInput, View } from "react-native";
import profileStyles from "../../styles/profileStyles";

export default function ProfileFieldRow(props) {
  return (
    <View style={profileStyles.fieldCard}>
      <Text style={profileStyles.fieldLabel}>{props.label}</Text>

      {props.editable ? (
        <TextInput
          value={props.value}
          onChangeText={props.onChange}
          editable={!props.disabled}
          keyboardType={props.keyboardType || "default"}
          autoCapitalize="none"
          textAlign={props.textAlign || "right"}
          style={profileStyles.fieldInput}
        />
      ) : (
        <Text style={[profileStyles.fieldValue, props.textAlign === "left" ? { textAlign: "left" } : null]}>
          {props.value || "—"}
        </Text>
      )}
    </View>
  );
}