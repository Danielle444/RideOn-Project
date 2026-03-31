import { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MobileTopBar from "./MobileTopBar";
import MobileBottomNav from "./MobileBottomNav";
import MobileSideMenu from "./MobileSideMenu";
import mobileNavStyles from "../../styles/mobileNavStyles";

export default function MobileScreenLayout(props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function openMenu() {
    setIsMenuOpen(true);
  }

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={mobileNavStyles.safeArea}>
      <KeyboardAvoidingView
        style={mobileNavStyles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={mobileNavStyles.screenContainer}>
          <MobileTopBar title={props.title} subtitle={props.subtitle} />

          <ScrollView
            contentContainerStyle={mobileNavStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {props.children}
          </ScrollView>

          <MobileBottomNav
            activeTab={props.activeBottomTab}
            items={props.bottomNavItems}
            onMenuPress={openMenu}
          />

          <MobileSideMenu visible={isMenuOpen} onClose={closeMenu}>
            {props.menuContent ? props.menuContent({ closeMenu: closeMenu }) : null}
          </MobileSideMenu>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}