import { useState } from "react";
import { View, Text, Pressable, Image, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import roleSharedStyles from "../../styles/roleSharedStyles";
import logo from "shared/assets/logo.png";
import AppDialog from "../common/AppDialog";

export default function CompetitionMenuTemplate(props) {
  var [exitDialogVisible, setExitDialogVisible] = useState(false);

  function handleExitPress() {
    setExitDialogVisible(true);
  }

  function handleExitCancel() {
    setExitDialogVisible(false);
  }

  function handleExitConfirm() {
    setExitDialogVisible(false);
    props.onExitCompetition();
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
        <Text style={roleSharedStyles.menuUserName}>
          {props.competitionName || ""}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
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
        style={roleSharedStyles.logoutItem}
        onPress={handleExitPress}
      >
        <Text style={roleSharedStyles.logoutText}>יציאה מהתחרות</Text>
        <Ionicons name="log-out-outline" size={24} color="#D94141" />
      </Pressable>

      <AppDialog
        visible={exitDialogVisible}
        type="warning"
        title="יציאה מהתחרות"
        message="האם לצאת מהתחרות ולחזור ללוח התחרויות?"
        confirmLabel="יציאה מהתחרות"
        cancelLabel="ביטול"
        onConfirm={handleExitConfirm}
        onCancel={handleExitCancel}
      />
    </View>
  );
}
