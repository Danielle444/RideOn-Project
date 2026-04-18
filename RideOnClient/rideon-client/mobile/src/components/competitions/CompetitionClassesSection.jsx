import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
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
    return "";
  }

  return String(value).slice(0, 5);
}

export default function CompetitionClassesSection(props) {
  var groups = Array.isArray(props.groups) ? props.groups : [];
  var [selectedKey, setSelectedKey] = useState(
    groups.length > 0 ? groups[0].key : ""
  );
  var [expandedClassId, setExpandedClassId] = useState(null);

  useEffect(
    function () {
      if (groups.length > 0) {
        setSelectedKey(groups[0].key);
      } else {
        setSelectedKey("");
      }

      setExpandedClassId(null);
    },
    [groups]
  );

  var selectedGroup = groups.find(function (group) {
    return group.key === selectedKey;
  });

  function toggleClass(itemId) {
    setExpandedClassId(function (prev) {
      if (prev === itemId) {
        return null;
      }

      return itemId;
    });
  }

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
            onChange={function (nextKey) {
              setSelectedKey(nextKey);
              setExpandedClassId(null);
            }}
          />

          {selectedGroup?.items?.map(function (item) {
            var itemId = String(item.classInCompId);
            var isExpanded = expandedClassId === itemId;
            var formattedTime = formatTime(item.startTime);

            return (
              <View
                key={itemId}
                style={competitionInvitationStyles.itemCard}
              >
                <Pressable
                  onPress={function () {
                    toggleClass(itemId);
                  }}
                  style={competitionInvitationStyles.classCardPressable}
                >
                  <View style={competitionInvitationStyles.itemHeaderRow}>
                    <Text style={competitionInvitationStyles.itemTitle}>
                      {item.className || "ללא שם מקצה"}
                    </Text>

                    <Text style={competitionInvitationStyles.priceText}>
                      {formatPrice(item.totalPrice)}
                    </Text>
                  </View>

                  <Text style={competitionInvitationStyles.classExpandHint}>
                    {isExpanded ? "הסתר פרטים" : "הצג פרטים"}
                  </Text>
                </Pressable>

                {isExpanded ? (
                  <View style={competitionInvitationStyles.classDetailsWrap}>
                    {item.arenaName ? (
                      <Text style={competitionInvitationStyles.itemMeta}>
                        מגרש: {item.arenaName}
                      </Text>
                    ) : null}

                    {formattedTime ? (
                      <Text style={competitionInvitationStyles.itemMeta}>
                        שעה: {formattedTime}
                      </Text>
                    ) : null}

                    {item.judgesDisplay ? (
                      <Text style={competitionInvitationStyles.itemMeta}>
                        שופטים: {item.judgesDisplay}
                      </Text>
                    ) : null}

                    <Text style={competitionInvitationStyles.itemMeta}>
                      למארגן: {formatPrice(item.organizerCost)}
                    </Text>

                    <Text style={competitionInvitationStyles.itemMeta}>
                      להתאחדות: {formatPrice(item.federationCost)}
                    </Text>

                    {item.prizeTypeName ? (
                      <Text style={competitionInvitationStyles.itemMeta}>
                        פרס: {item.prizeTypeName}
                        {item.prizeAmount !== null && item.prizeAmount !== undefined
                          ? " • " + formatPrice(item.prizeAmount)
                          : ""}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </>
      )}
    </CompetitionSectionCard>
  );
}