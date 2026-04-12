import { View, Text, Pressable, Image, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import roleSharedStyles from "../../styles/roleSharedStyles";
import logo from "shared/assets/logo.png";

export default function SideMenuTemplate(props) {
  return (
    <View style={roleSharedStyles.menuWrapperWithTopInset}>
      <View style={roleSharedStyles.menuLogoWrap}>
        <Image
          source={logo}
          style={roleSharedStyles.menuLogo}
          resizeMode="contain"
        />
      </View>

      <View style={roleSharedStyles.menuUserCard}>
        <Text style={roleSharedStyles.menuUserName}>{props.userName}</Text>

        <Text style={roleSharedStyles.menuUserMeta}>
          {[props.roleName, props.ranchName].filter(Boolean).join(" · ")}
        </Text>

        {props.competitionName ? (
          <Text style={roleSharedStyles.menuUserMeta}>
            {props.competitionName}
          </Text>
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {props.items.map(function (item) {
          var isActive = props.activeKey === item.key;

          return (
            <Pressable
              key={item.key}
              style={[
                roleSharedStyles.menuItem,
                isActive ? roleSharedStyles.activeMenuItem : null,
              ]}
              onPress={function () {
                props.onItemPress(item);
                if (props.closeMenu) {
                  props.closeMenu();
                }
              }}
            >
              <Text style={roleSharedStyles.menuItemText}>{item.label}</Text>
              <Ionicons name={item.icon} size={24} color="#7B5A4D" />
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={roleSharedStyles.separator} />

      <Pressable
        style={roleSharedStyles.menuItem}
        onPress={function () {
          props.onSwitchRole();
          if (props.closeMenu) {
            props.closeMenu();
          }
        }}
      >
        <Text style={roleSharedStyles.menuItemText}>החלפת פרופיל פעיל</Text>
        <Ionicons name="sync-outline" size={24} color="#7B5A4D" />
      </Pressable>

      <Pressable
        style={roleSharedStyles.logoutItem}
        onPress={async function () {
          await props.onLogout();
          if (props.closeMenu) {
            props.closeMenu();
          }
        }}
      >
        <Text style={roleSharedStyles.logoutText}>יציאה מהמשתמש</Text>
        <Ionicons name="log-out-outline" size={24} color="#D94141" />
      </Pressable>
    </View>
  );
}