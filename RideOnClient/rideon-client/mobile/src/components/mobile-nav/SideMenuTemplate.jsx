import { useState } from "react";
import { View, Text, Pressable, Image, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import roleSharedStyles from "../../styles/roleSharedStyles";
import logo from "shared/assets/logo.png";
import AppDialog from "../common/AppDialog";

export default function SideMenuTemplate(props) {
  var [switchRoleDialogVisible, setSwitchRoleDialogVisible] = useState(false);
  var [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  var [isLoggingOut, setIsLoggingOut] = useState(false);

  function handleSwitchRolePress() {
    setSwitchRoleDialogVisible(true);
  }

  function handleSwitchRoleCancel() {
    setSwitchRoleDialogVisible(false);
  }

  function handleSwitchRoleConfirm() {
    setSwitchRoleDialogVisible(false);
    props.onSwitchRole();
    if (props.closeMenu) {
      props.closeMenu();
    }
  }

  function handleLogoutPress() {
    setLogoutDialogVisible(true);
  }

  function handleLogoutCancel() {
    if (isLoggingOut) {
      return;
    }
    setLogoutDialogVisible(false);
  }

  async function handleLogoutConfirm() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    await props.onLogout();
    setIsLoggingOut(false);
    setLogoutDialogVisible(false);

    if (props.closeMenu) {
      props.closeMenu();
    }
  }

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
        onPress={handleSwitchRolePress}
      >
        <Text style={roleSharedStyles.menuItemText}>החלפת פרופיל פעיל</Text>
        <Ionicons name="sync-outline" size={24} color="#7B5A4D" />
      </Pressable>

      <Pressable
        style={roleSharedStyles.logoutItem}
        onPress={handleLogoutPress}
      >
        <Text style={roleSharedStyles.logoutText}>יציאה מהמשתמש</Text>
        <Ionicons name="log-out-outline" size={24} color="#D94141" />
      </Pressable>

      <AppDialog
        visible={switchRoleDialogVisible}
        type="confirm"
        title="החלפת פרופיל פעיל"
        message="האם לעבור למסך בחירת הפרופיל הפעיל?"
        confirmLabel="החלפה"
        cancelLabel="ביטול"
        onConfirm={handleSwitchRoleConfirm}
        onCancel={handleSwitchRoleCancel}
      />

      <AppDialog
        visible={logoutDialogVisible}
        type="warning"
        destructive={true}
        title="יציאה מהמשתמש"
        message="האם לצאת מהמשתמש?"
        confirmLabel="יציאה"
        cancelLabel="ביטול"
        isBusy={isLoggingOut}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
    </View>
  );
}