import { View, Text, Pressable } from "react-native";
import roleSharedStyles from "../../../../styles/roleSharedStyles";

export default function AdminHomeCard(props) {
  function getStatusStyle(status) {
    if (status === "כעת") return roleSharedStyles.statusNow;
    if (status === "פתוחה") return roleSharedStyles.statusOpen;
    if (status === "סגורה") return roleSharedStyles.statusClosed;
    return roleSharedStyles.statusOther;
  }

  return (
    <View style={roleSharedStyles.card}>
      <View style={roleSharedStyles.cardTopRow}>
        <View style={[roleSharedStyles.statusBadge, getStatusStyle(props.status)]}>
          <Text style={roleSharedStyles.statusText}>{props.status}</Text>
        </View>

        <View style={roleSharedStyles.cardTextWrap}>
          <Text style={roleSharedStyles.cardTitle}>{props.title}</Text>
          <Text style={roleSharedStyles.cardSubText}>{props.dateText}</Text>
          <Text style={roleSharedStyles.cardSubText}>{props.ranchName}</Text>
        </View>
      </View>

      <View style={roleSharedStyles.buttonsRow}>
        <Pressable style={roleSharedStyles.primaryButton} onPress={props.onDetailsPress}>
          <Text style={roleSharedStyles.primaryButtonText}>פרטי תחרות</Text>
        </Pressable>

        <Pressable
          style={[
            roleSharedStyles.primaryButton,
            props.registrationDisabled ? roleSharedStyles.disabledButton : null,
          ]}
          onPress={props.onRegistrationPress}
          disabled={props.registrationDisabled}
        >
          <Text
            style={[
              roleSharedStyles.primaryButtonText,
              props.registrationDisabled ? roleSharedStyles.disabledButtonText : null,
            ]}
          >
            הרשמה
          </Text>
        </Pressable>

        <Pressable
          style={[
            roleSharedStyles.primaryButton,
            props.enterDisabled ? roleSharedStyles.disabledButton : null,
          ]}
          onPress={props.onEnterPress}
          disabled={props.enterDisabled}
        >
          <Text
            style={[
              roleSharedStyles.primaryButtonText,
              props.enterDisabled ? roleSharedStyles.disabledButtonText : null,
            ]}
          >
            כניסה
          </Text>
        </Pressable>
      </View>
    </View>
  );
}