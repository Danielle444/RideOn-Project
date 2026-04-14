import { View, Text } from "react-native";
import profileStyles from "../../styles/profileStyles";

export default function ProfileSectionCard(props) {
  return (
    <View style={profileStyles.sectionCard}>
      <View style={profileStyles.sectionHeader}>
        <View style={profileStyles.sectionHeaderTextWrap}>
          <Text style={profileStyles.sectionTitle}>{props.title}</Text>

          {props.subtitle ? (
            <Text style={profileStyles.sectionSubtitle}>{props.subtitle}</Text>
          ) : null}
        </View>
      </View>

      <View style={profileStyles.sectionBody}>{props.children}</View>
    </View>
  );
}