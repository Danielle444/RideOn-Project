import { View, Text, Pressable } from "react-native";
import roleSharedStyles from "../../../../styles/roleSharedStyles";

export default function PayerHomeCard(props) {
  return (
    <View style={roleSharedStyles.card}>
      <View style={roleSharedStyles.cardTopRow}>
        <View style={roleSharedStyles.cardTextWrap}>
          <Text style={roleSharedStyles.cardTitle}>{props.title}</Text>
          <Text style={roleSharedStyles.cardSubText}>{props.dateText}</Text>
          <Text style={roleSharedStyles.cardSubText}>{props.ranchName}</Text>
        </View>

        <View style={[roleSharedStyles.statusBadge, props.statusStyle]}>
          <Text style={roleSharedStyles.statusText}>{props.status}</Text>
        </View>
      </View>

      <View style={roleSharedStyles.buttonsRow}>
        <Pressable style={roleSharedStyles.primaryButton} onPress={props.onDetailsPress}>
          <Text style={roleSharedStyles.primaryButtonText}>פרטי תחרות</Text>
        </Pressable>

        <Pressable style={roleSharedStyles.primaryButton} onPress={props.onEnterPress}>
          <Text style={roleSharedStyles.primaryButtonText}>כניסה</Text>
        </Pressable>
      </View>
    </View>
  );
}