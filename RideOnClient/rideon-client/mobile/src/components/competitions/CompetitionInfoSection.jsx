import React from "react";
import { Text, View } from "react-native";
import competitionInvitationStyles from "../../styles/competitionInvitationStyles";
import CompetitionSectionCard from "./CompetitionSectionCard";

function formatDate(value) {
  if (!value) {
    return "—";
  }

  try {
    var date = new Date(value);

    return date.toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    return String(value);
  }
}

export default function CompetitionInfoSection(props) {
  var competition = props.competition;

  return (
    <CompetitionSectionCard title="פרטי תחרות" initialExpanded={true}>
      <View style={competitionInvitationStyles.infoGrid}>
        <View style={competitionInvitationStyles.infoRow}>
          <Text style={competitionInvitationStyles.infoLabel}>שם התחרות</Text>
          <Text style={competitionInvitationStyles.infoValue}>
            {competition?.competitionName || "—"}
          </Text>
        </View>

        <View style={competitionInvitationStyles.infoRow}>
          <Text style={competitionInvitationStyles.infoLabel}>החווה המארחת</Text>
          <Text style={competitionInvitationStyles.infoValue}>
            {competition?.hostRanchName || "—"}
          </Text>
        </View>

        <View style={competitionInvitationStyles.infoRow}>
          <Text style={competitionInvitationStyles.infoLabel}>ענף</Text>
          <Text style={competitionInvitationStyles.infoValue}>
            {competition?.fieldName || "—"}
          </Text>
        </View>

        <View style={competitionInvitationStyles.infoRow}>
          <Text style={competitionInvitationStyles.infoLabel}>סטטוס</Text>
          <Text style={competitionInvitationStyles.infoValue}>
            {competition?.competitionStatus || "—"}
          </Text>
        </View>

        <View style={competitionInvitationStyles.infoRow}>
          <Text style={competitionInvitationStyles.infoLabel}>תחילת תחרות</Text>
          <Text style={competitionInvitationStyles.infoValue}>
            {formatDate(competition?.competitionStartDate)}
          </Text>
        </View>

        <View style={competitionInvitationStyles.infoRow}>
          <Text style={competitionInvitationStyles.infoLabel}>סיום תחרות</Text>
          <Text style={competitionInvitationStyles.infoValue}>
            {formatDate(competition?.competitionEndDate)}
          </Text>
        </View>
      </View>

      {competition?.notes ? (
        <View style={competitionInvitationStyles.notesWrap}>
          <Text style={competitionInvitationStyles.notesLabel}>הערות</Text>
          <Text style={competitionInvitationStyles.notesText}>
            {competition.notes}
          </Text>
        </View>
      ) : null}
    </CompetitionSectionCard>
  );
}