import React from "react";
import { Pressable, Text, View } from "react-native";
import competitionInvitationStyles from "../../styles/competitionInvitationStyles";
import { canAdminRegisterCompetition } from "../../../../shared/auth/utils/competitions/competitionStatus";

export default function CompetitionRegisterButton(props) {
  if (!props.visible) {
    return null;
  }

  // Same gate the competitions board applies to its register action.
  var isDisabled = !canAdminRegisterCompetition(props.status);

  return (
    <View style={competitionInvitationStyles.ctaWrap}>
      <Pressable
        disabled={isDisabled}
        style={[
          competitionInvitationStyles.ctaButton,
          isDisabled ? competitionInvitationStyles.ctaButtonDisabled : null,
        ]}
        onPress={props.onPress}
      >
        <Text
          style={[
            competitionInvitationStyles.ctaButtonText,
            isDisabled
              ? competitionInvitationStyles.ctaButtonTextDisabled
              : null,
          ]}
        >
          הרשמה לתחרות
        </Text>
      </Pressable>
    </View>
  );
}
