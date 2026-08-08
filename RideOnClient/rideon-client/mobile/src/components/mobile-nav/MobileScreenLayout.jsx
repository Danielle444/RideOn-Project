import { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MobileTopBar from "./MobileTopBar";
import MobileBottomNav from "./MobileBottomNav";
import MobileSideMenu from "./MobileSideMenu";
import AppDialog from "../common/AppDialog";
import mobileNavStyles from "../../styles/mobileNavStyles";

export default function MobileScreenLayout(props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const [pendingExitCallback, setPendingExitCallback] = useState(null);

  function openMenu() {
    setIsMenuOpen(true);
  }

  function closeMenu() {
    setIsMenuOpen(false);
  }

  // Owned here (outside MobileSideMenu's own Modal) so the exit-confirmation
  // AppDialog is never a native Modal nested inside the side menu's native
  // Modal. Every CompetitionMenuTemplate consumer shares this exact copy -
  // see the audit for the regression this fixes (bdc26a5 nested the two).
  function requestExitConfirm(onExitCompetition) {
    setPendingExitCallback(function () {
      return onExitCompetition;
    });
    setExitConfirmVisible(true);
  }

  function handleExitConfirmCancel() {
    setExitConfirmVisible(false);
  }

  function handleExitConfirmConfirm() {
    setExitConfirmVisible(false);
    if (typeof pendingExitCallback === "function") {
      pendingExitCallback();
    }
    setPendingExitCallback(null);
    closeMenu();
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
            {props.menuContent
              ? props.menuContent({
                  closeMenu: closeMenu,
                  requestExitConfirm: requestExitConfirm,
                })
              : null}
          </MobileSideMenu>

          <AppDialog
            visible={exitConfirmVisible}
            type="warning"
            title="יציאה מהתחרות"
            message="האם לצאת מהתחרות ולחזור ללוח התחרויות?"
            confirmLabel="יציאה מהתחרות"
            cancelLabel="ביטול"
            onConfirm={handleExitConfirmConfirm}
            onCancel={handleExitConfirmCancel}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}