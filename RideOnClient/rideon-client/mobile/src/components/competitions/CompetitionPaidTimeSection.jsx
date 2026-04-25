import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import competitionInvitationStyles from "../../styles/competitionInvitationStyles";
import CompetitionDayTabs from "./CompetitionDayTabs";
import CompetitionSectionCard from "./CompetitionSectionCard";

function formatTime(value) {
  if (!value) {
    return "—";
  }

  return String(value).slice(0, 5);
}

export default function CompetitionPaidTimeSection(props) {
  var groups = Array.isArray(props.groups) ? props.groups : [];
  var [selectedKey, setSelectedKey] = useState(
    groups.length > 0 ? groups[0].key : ""
  );

  useEffect(
    function () {
      if (groups.length > 0) {
        setSelectedKey(groups[0].key);
      } else {
        setSelectedKey("");
      }
    },
    [groups]
  );

  var selectedGroup = groups.find(function (group) {
    return group.key === selectedKey;
  });

  return (
    <CompetitionSectionCard title="פייד טיים" initialExpanded={false}>
      {groups.length === 0 ? (
        <Text style={competitionInvitationStyles.emptyText}>
          לא הוגדרו סלוטים של פייד טיים לתחרות זו
        </Text>
      ) : (
        <>
          <CompetitionDayTabs
            groups={groups}
            activeKey={selectedKey}
            onChange={setSelectedKey}
          />

          {selectedGroup?.items?.map(function (item) {
            return (
              <View
                key={String(item.PaidTimeSlotInCompId)}
                style={competitionInvitationStyles.itemCard}
              >
                <Text style={competitionInvitationStyles.itemTitle}>
                  {item.timeOfDay || "פייד טיים"}
                </Text>

                <Text style={competitionInvitationStyles.itemMeta}>
                  שעות: {formatTime(item.startTime)} - {formatTime(item.endTime)}
                </Text>

                <Text style={competitionInvitationStyles.itemMeta}>
                  זירה: {item.arenaName || "—"}
                </Text>
              </View>
            );
          })}
        </>
      )}
    </CompetitionSectionCard>
  );
}