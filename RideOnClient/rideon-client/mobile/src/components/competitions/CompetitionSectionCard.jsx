import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import competitionInvitationStyles from "../../styles/competitionInvitationStyles";

export default function CompetitionSectionCard(props) {
  var [isExpanded, setIsExpanded] = useState(
    props.initialExpanded !== false
  );

  function toggleExpand() {
    setIsExpanded(function (prev) {
      return !prev;
    });
  }

  return (
    <View style={competitionInvitationStyles.sectionCard}>
      <Pressable
        style={competitionInvitationStyles.sectionHeader}
        onPress={toggleExpand}
      >
        <Text style={competitionInvitationStyles.sectionHeaderTitle}>
          {props.title}
        </Text>

        <Text style={competitionInvitationStyles.sectionHeaderIcon}>
          {isExpanded ? "⌃" : "⌄"}
        </Text>
      </Pressable>

      {isExpanded ? (
        <View style={competitionInvitationStyles.sectionBody}>
          {props.children}
        </View>
      ) : null}
    </View>
  );
}