import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import homeScreenStyles from "../../styles/homeScreenStyles";

export default function HomeShortcutGrid(props) {
  return (
    <View style={homeScreenStyles.shortcutsGrid}>
      {props.items.map(function (item) {
        return (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.9}
            style={homeScreenStyles.shortcutCard}
            onPress={item.onPress}
          >
            <Ionicons name={item.icon} size={24} color="#7B5A4D" />
            <Text style={homeScreenStyles.shortcutLabel}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}