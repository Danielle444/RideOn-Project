import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import competitionInvitationStyles from "../../styles/competitionInvitationStyles";
import CompetitionDayTabs from "./CompetitionDayTabs";
import CompetitionSectionCard from "./CompetitionSectionCard";

function formatPrice(value) {
  if (value === null || value === undefined) {
    return "—";
  }

  try {
    return "₪" + Number(value).toLocaleString("he-IL");
  } catch (error) {
    return "₪" + String(value);
  }
}

function formatTime(value) {
  if (!value) {
    return "—";
  }

  return String(value).slice(0, 5);
}

export default function CompetitionClassesSection(props) {
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
    <CompetitionSectionCard title="מקצים" initialExpanded={false}>
      {groups.length === 0 ? (
        <Text style={competitionInvitationStyles.emptyText}>
          לא הוגדרו מקצים לתחרות זו
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
                key={String(item.classInCompId)}
                style={competitionInvitationStyles.itemCard}
              >
                <View style={competitionInvitationStyles.itemHeaderRow}>
                  <Text style={competitionInvitationStyles.itemTitle}>
                    {item.className || "ללא שם מקצה"}
                  </Text>

                  <Text style={competitionInvitationStyles.priceText}>
                    {formatPrice(item.totalPrice)}
                  </Text>
                </View>

                <Text style={competitionInvitationStyles.itemMeta}>
                  זירה: {item.arenaName || "—"}
                </Text>

                <Text style={competitionInvitationStyles.itemMeta}>
                  שעה: {formatTime(item.startTime)}
                </Text>

                <Text style={competitionInvitationStyles.itemMeta}>
                  שופטים: {item.judgesDisplay || "—"}
                </Text>

                {item.prizeTypeName ? (
                  <Text style={competitionInvitationStyles.itemMeta}>
                    פרס: {item.prizeTypeName}
                    {item.prizeAmount ? " • " + formatPrice(item.prizeAmount) : ""}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </>
      )}
    </CompetitionSectionCard>
  );
}