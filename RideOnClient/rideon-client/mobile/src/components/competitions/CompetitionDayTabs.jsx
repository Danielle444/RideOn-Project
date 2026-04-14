import React from "react";
import { Pressable, ScrollView, Text } from "react-native";
import competitionInvitationStyles from "../../styles/competitionInvitationStyles";

export default function CompetitionDayTabs(props) {
  var groups = Array.isArray(props.groups) ? props.groups : [];
  var activeKey = props.activeKey;

  return (
    <ScrollView
      horizontal={true}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={competitionInvitationStyles.tabsRow}
    >
      {groups.map(function (group) {
        var isActive = group.key === activeKey;

        return (
          <Pressable
            key={group.key}
            style={
              isActive
                ? competitionInvitationStyles.dayTabActive
                : competitionInvitationStyles.dayTab
            }
            onPress={function () {
              props.onChange(group.key);
            }}
          >
            <Text
              style={
                isActive
                  ? competitionInvitationStyles.dayTabActiveText
                  : competitionInvitationStyles.dayTabText
              }
            >
              {group.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}