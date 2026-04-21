import { Pressable, Text, View } from "react-native";
import profileStyles from "../../styles/profileStyles";

export default function ProfileHeaderCard(props) {
  return (
    <View style={profileStyles.headerCard}>
      <Text style={profileStyles.headerTitle}>{props.fullName}</Text>

      <Text style={profileStyles.headerLine}>
        שם משתמש: {props.username || "—"}
      </Text>

      <Text style={profileStyles.headerLine}>
        תפקיד פעיל: {props.roleName || "—"}
      </Text>

      {props.showRanch ? (
        <Text style={profileStyles.headerLine}>
          חווה פעילה: {props.ranchName || "—"}
        </Text>
      ) : null}

      <View style={profileStyles.buttonsRow}>
        <Pressable style={profileStyles.secondaryButton} onPress={props.onSwitchRole}>
          <Text style={profileStyles.secondaryButtonText}>החלפת תפקיד פעיל</Text>
        </Pressable>
      </View>
    </View>
  );
}