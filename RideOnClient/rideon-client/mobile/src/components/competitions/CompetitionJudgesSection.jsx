import React from "react";
import { Text, View } from "react-native";
import competitionInvitationStyles from "../../styles/competitionInvitationStyles";
import CompetitionSectionCard from "./CompetitionSectionCard";

export default function CompetitionJudgesSection(props) {
  var judges = Array.isArray(props.judges) ? props.judges : [];

  return (
    <CompetitionSectionCard title="שופטים" initialExpanded={false}>
      {judges.length === 0 ? (
        <Text style={competitionInvitationStyles.emptyText}>
          לא הוגדרו שופטים לתחרות זו
        </Text>
      ) : (
        judges.map(function (judge, index) {
          return (
            <View
              key={String(index) + "-" + String(judge)}
              style={competitionInvitationStyles.simpleListRow}
            >
              <Text style={competitionInvitationStyles.simpleListText}>
                {judge}
              </Text>
            </View>
          );
        })
      )}
    </CompetitionSectionCard>
  );
}