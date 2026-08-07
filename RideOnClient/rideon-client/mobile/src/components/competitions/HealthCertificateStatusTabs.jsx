import React from "react";

import { Pressable, ScrollView, Text } from "react-native";

import competitionInvitationStyles from "../../styles/competitionInvitationStyles";

// Same visual shape as CompetitionDayTabs (horizontal scroll of pill
// buttons), plus a "quiet" per-tab variant so the Approved tab can render
// less prominently than the two action-oriented tabs beside it. Kept as its
// own component rather than extending CompetitionDayTabs so the unrelated
// competition-day-selection feature is not touched by this change.

function getTabStyle(isActive, isQuiet) {
  if (isActive) {
    return competitionInvitationStyles.dayTabActive;
  }

  if (isQuiet) {
    return [
      competitionInvitationStyles.dayTab,
      { backgroundColor: "#F8F4F1" },
    ];
  }

  return competitionInvitationStyles.dayTab;
}

function getTabTextStyle(isActive, isQuiet) {
  if (isActive) {
    return competitionInvitationStyles.dayTabActiveText;
  }

  if (isQuiet) {
    return [competitionInvitationStyles.dayTabText, { color: "#B8A79C" }];
  }

  return competitionInvitationStyles.dayTabText;
}

export default function HealthCertificateStatusTabs(props) {
  var tabs = Array.isArray(props.tabs) ? props.tabs : [];
  var activeKey = props.activeKey;

  return (
    <ScrollView
      horizontal={true}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={competitionInvitationStyles.tabsRow}
    >
      {tabs.map(function (tab) {
        var isActive = tab.key === activeKey;

        return (
          <Pressable
            key={tab.key}
            style={getTabStyle(isActive, tab.quiet)}
            onPress={function () {
              props.onChange(tab.key);
            }}
          >
            <Text style={getTabTextStyle(isActive, tab.quiet)}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
