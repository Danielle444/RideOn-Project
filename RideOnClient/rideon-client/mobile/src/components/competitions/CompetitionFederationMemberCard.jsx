import { Text, View } from "react-native";
import horsesStyles from "../../styles/horsesStyles";

export default function CompetitionFederationMemberCard(props) {
  var item = props.item;
  var roleLabel = props.roleLabel || "";

  return (
    <View style={horsesStyles.horseCard}>
      <Text style={horsesStyles.horseTitle}>
        {item.fullName ||
          ((item.firstName || "") + " " + (item.lastName || "")).trim() ||
          "ללא שם"}
      </Text>

      <Text style={horsesStyles.horseMeta}>
        {roleLabel}: {item.federationMemberId || "-"}
      </Text>
    </View>
  );
}