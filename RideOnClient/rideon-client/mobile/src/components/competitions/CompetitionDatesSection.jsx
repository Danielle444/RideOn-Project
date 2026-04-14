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

export default function CompetitionDatesSection(props) {
  var competition = props.competition;

  return (
    <CompetitionSectionCard title="תאריכים חשובים" initialExpanded={true}>
      <View style={competitionInvitationStyles.infoGrid}>
        <View style={competitionInvitationStyles.infoRow}>
          <Text style={competitionInvitationStyles.infoLabel}>פתיחת הרשמה</Text>
          <Text style={competitionInvitationStyles.infoValue}>
            {formatDate(competition?.registrationOpenDate)}
          </Text>
        </View>

        <View style={competitionInvitationStyles.infoRow}>
          <Text style={competitionInvitationStyles.infoLabel}>סגירת הרשמה</Text>
          <Text style={competitionInvitationStyles.infoValue}>
            {formatDate(competition?.registrationEndDate)}
          </Text>
        </View>

        <View style={competitionInvitationStyles.infoRow}>
          <Text style={competitionInvitationStyles.infoLabel}>
            פתיחת רישום לפייד טיים
          </Text>
          <Text style={competitionInvitationStyles.infoValue}>
            {formatDate(competition?.paidTimeRegistrationDate)}
          </Text>
        </View>

        <View style={competitionInvitationStyles.infoRow}>
          <Text style={competitionInvitationStyles.infoLabel}>
            פרסום לו״ז פייד טיים
          </Text>
          <Text style={competitionInvitationStyles.infoValue}>
            {formatDate(competition?.paidTimePublicationDate)}
          </Text>
        </View>
      </View>
    </CompetitionSectionCard>
  );
}