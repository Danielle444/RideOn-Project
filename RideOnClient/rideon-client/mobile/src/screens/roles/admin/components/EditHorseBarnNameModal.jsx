import { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import horsesStyles from "../../../../styles/horsesStyles";

export default function EditHorseBarnNameModal(props) {
  const [localBarnName, setLocalBarnName] = useState("");

  useEffect(
    function () {
      if (props.visible && props.selectedHorse) {
        setLocalBarnName(props.barnNameValue || "");
      }
    },
    [props.visible, props.selectedHorse, props.barnNameValue]
  );

  if (!props.visible || !props.selectedHorse) {
    return null;
  }

  function handleChangeText(value) {
    setLocalBarnName(value);
    if (props.onChangeBarnName) {
      props.onChangeBarnName(value);
    }
  }

  return (
    <Modal
      visible={props.visible}
      animationType="fade"
      transparent={true}
      onRequestClose={props.onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={horsesStyles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={horsesStyles.keyboardAvoidingWrap}
          >
            <View style={horsesStyles.modalCenterWrap}>
              <TouchableWithoutFeedback>
                <View style={horsesStyles.modalCard}>
                  <Text style={horsesStyles.modalTitle}>עריכת כינוי לסוס</Text>

                  <Text style={horsesStyles.modalSubtitle}>
                    שם הסוס: {props.selectedHorse.horseName || "—"}
                  </Text>

                  <Text style={horsesStyles.fieldLabel}>כינוי</Text>

                  <TextInput
                    value={localBarnName}
                    onChangeText={handleChangeText}
                    placeholder="הזן כינוי לסוס"
                    placeholderTextColor="#B7AAA3"
                    style={horsesStyles.fieldInput}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={Keyboard.dismiss}
                    textAlign="right"
                  />

                  <View style={horsesStyles.modalButtonsRow}>
                    <Pressable
                      style={horsesStyles.primaryButton}
                      onPress={props.onSubmit}
                      disabled={props.isSaving}
                    >
                      <Text style={horsesStyles.primaryButtonText}>
                        {props.isSaving ? "שומר..." : "שמירת כינוי"}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={horsesStyles.secondaryButton}
                      onPress={props.onClose}
                      disabled={props.isSaving}
                    >
                      <Text style={horsesStyles.secondaryButtonText}>ביטול</Text>
                    </Pressable>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}