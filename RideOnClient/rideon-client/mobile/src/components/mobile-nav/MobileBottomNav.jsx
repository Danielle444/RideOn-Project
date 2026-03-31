import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import mobileNavStyles from "../../styles/mobileNavStyles";

export default function MobileBottomNav(props) {
  const insets = useSafeAreaInsets();
  const items = Array.isArray(props.items) ? props.items : [];

  function getColor(tabKey) {
    return props.activeTab === tabKey ? "#8B6352" : "#9E8A7F";
  }

  return (
    <View
      style={[
        mobileNavStyles.bottomNavWrapper,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      {items.map(function (item) {
        return (
          <Pressable
            key={item.key}
            style={mobileNavStyles.bottomNavButton}
            onPress={
              item.key === "menu"
                ? props.onMenuPress
                : item.onPress
            }
          >
            <Ionicons
              name={item.icon}
              size={item.key === "menu" ? 32 : item.key === "home" ? 30 : 28}
              color={getColor(item.key)}
            />
          </Pressable>
        );
      })}
    </View>
  );
}