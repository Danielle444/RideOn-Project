import React from "react";
import { Pressable, Text, View } from "react-native";
import competitionInvitationStyles from "../../styles/competitionInvitationStyles";

export default function CompetitionRegisterButton(props) {
  if (!props.visible) {
    return null;
  }

  return (
    <View style={competitionInvitationStyles.ctaWrap}>
      <Pressable
        style={competitionInvitationStyles.ctaButton}
        onPress={props.onPress}
      >
        <Text style={competitionInvitationStyles.ctaButtonText}>
          הרשמה לתחרות
        </Text>
      </Pressable>
    </View>
  );
}