import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import profileStyles from "../../styles/profileStyles";
import { useMemo, useState } from "react";

export default function AddProfileModal(props) {
  var [openListKey, setOpenListKey] = useState("");

  var selectedRanchName = useMemo(
    function () {
      var found = (props.availableRanches || []).find(function (item) {
        return String(item.ranchId) === String(props.addProfileForm.ranchId);
      });

      return found ? found.ranchName : "";
    },
    [props.availableRanches, props.addProfileForm]
  );

  var selectedRoleName = useMemo(
    function () {
      var found = (props.availableRoles || []).find(function (item) {
        return String(item.roleId) === String(props.addProfileForm.roleId);
      });

      return found ? found.roleName : "";
    },
    [props.availableRoles, props.addProfileForm]
  );

  return (
    <Modal
      visible={props.isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={props.onClose}
    >
      <View style={profileStyles.modalOverlay}>
        <View style={profileStyles.modalCard}>
          <Text style={profileStyles.modalTitle}>הוספת פרופיל חדש</Text>
          <Text style={profileStyles.modalSubtitle}>
            בקשת שיוך לחווה ותפקיד נוספים
          </Text>

          <Pressable
            style={profileStyles.selectorButton}
            onPress={function () {
              setOpenListKey(openListKey === "ranches" ? "" : "ranches");
            }}
          >
            <Text style={profileStyles.selectorButtonText}>
              {selectedRanchName || "בחרי חווה"}
            </Text>
          </Pressable>

          {openListKey === "ranches" ? (
            <View style={profileStyles.optionsListWrap}>
              <ScrollView style={{ maxHeight: 180 }}>
                {(props.availableRanches || []).map(function (item) {
                  return (
                    <Pressable
                      key={String(item.ranchId)}
                      style={profileStyles.optionItem}
                      onPress={function () {
                        props.setAddProfileField("ranchId", String(item.ranchId));
                        setOpenListKey("");
                      }}
                    >
                      <Text style={profileStyles.optionItemText}>{item.ranchName}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <Pressable
            style={profileStyles.selectorButton}
            onPress={function () {
              setOpenListKey(openListKey === "roles" ? "" : "roles");
            }}
          >
            <Text style={profileStyles.selectorButtonText}>
              {selectedRoleName || "בחרי תפקיד"}
            </Text>
          </Pressable>

          {openListKey === "roles" ? (
            <View style={profileStyles.optionsListWrap}>
              <ScrollView style={{ maxHeight: 180 }}>
                {(props.availableRoles || []).map(function (item) {
                  return (
                    <Pressable
                      key={String(item.roleId)}
                      style={profileStyles.optionItem}
                      onPress={function () {
                        props.setAddProfileField("roleId", String(item.roleId));
                        setOpenListKey("");
                      }}
                    >
                      <Text style={profileStyles.optionItemText}>{item.roleName}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <View style={profileStyles.buttonsRow}>
            <Pressable
              style={profileStyles.primaryButton}
              disabled={
                props.addingProfile ||
                !props.addProfileForm.ranchId ||
                !props.addProfileForm.roleId
              }
              onPress={props.onSubmit}
            >
              <Text style={profileStyles.primaryButtonText}>
                {props.addingProfile ? "שולחת..." : "שליחת בקשה"}
              </Text>
            </Pressable>

            <Pressable
              style={profileStyles.secondaryButton}
              onPress={props.onClose}
            >
              <Text style={profileStyles.secondaryButtonText}>ביטול</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}