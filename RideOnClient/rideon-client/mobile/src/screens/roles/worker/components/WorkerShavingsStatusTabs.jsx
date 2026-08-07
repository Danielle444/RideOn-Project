import { Pressable, ScrollView, Text, View } from "react-native";
import workerShavingsStatusTabsStyles from "../../../../styles/workerShavingsStatusTabsStyles";

// Status-tab switcher for the Worker shavings board (דורש טיפול / בטיפול / הושלם),
// patterned on CompetitionDayTabs' pill visual language (brown active pill, RTL
// row-reverse) — no existing component in this app combines that with a per-tab count, so
// this is a small new component rather than a reuse of CompetitionDayTabs itself, which is
// competitions-scoped and has no count-badge support.
export default function WorkerShavingsStatusTabs(props) {
  var tabs = Array.isArray(props.tabs) ? props.tabs : [];
  var activeKey = props.activeKey;

  return (
    <ScrollView
      horizontal={true}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={workerShavingsStatusTabsStyles.row}
    >
      {tabs.map(function (tab) {
        var isActive = tab.key === activeKey;

        return (
          <Pressable
            key={tab.key}
            style={
              isActive
                ? workerShavingsStatusTabsStyles.tabActive
                : workerShavingsStatusTabsStyles.tab
            }
            onPress={function () {
              props.onChange(tab.key);
            }}
          >
            <Text
              style={
                isActive
                  ? workerShavingsStatusTabsStyles.tabActiveText
                  : workerShavingsStatusTabsStyles.tabText
              }
            >
              {tab.label}
            </Text>

            <View
              style={
                isActive
                  ? workerShavingsStatusTabsStyles.countBadgeActive
                  : workerShavingsStatusTabsStyles.countBadge
              }
            >
              <Text
                style={
                  isActive
                    ? workerShavingsStatusTabsStyles.countBadgeTextActive
                    : workerShavingsStatusTabsStyles.countBadgeText
                }
              >
                {tab.count}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
