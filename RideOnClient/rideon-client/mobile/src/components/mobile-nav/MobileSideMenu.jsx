import { Modal, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import mobileNavStyles from "../../styles/mobileNavStyles";

export default function MobileSideMenu(props) {
  return (
    <Modal
      visible={props.visible}
      transparent={true}
      animationType="fade"
      onRequestClose={props.onClose}
    >
      <View style={mobileNavStyles.overlayWrap}>
        <Pressable style={mobileNavStyles.overlay} onPress={props.onClose} />

        <SafeAreaView style={mobileNavStyles.sideMenuPanel} edges={["top", "bottom"]}>
          {props.children}
        </SafeAreaView>
      </View>
    </Modal>
  );
}