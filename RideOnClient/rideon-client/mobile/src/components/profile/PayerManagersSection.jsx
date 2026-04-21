import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View, ActivityIndicator } from "react-native";
import ProfileSectionCard from "./ProfileSectionCard";
import profileStyles from "../../styles/profileStyles";

export default function PayerManagersSection(props) {
  function handleRemovePress(item) {
    if ((props.managers || []).length <= 1) {
      Alert.alert("לא ניתן להסיר", "למשלם חייב להישאר לפחות מנהל אחד");
      return;
    }

    var fullName = (item.firstName || "") + " " + (item.lastName || "");

    Alert.alert(
      "הסרת מנהל",
      "האם להסיר את " + fullName.trim() + " מרשימת המנהלים שלך?",
      [
        {
          text: "ביטול",
          style: "cancel",
        },
        {
          text: "הסר",
          style: "destructive",
          onPress: function () {
            props.onRemoveManager(item.adminPersonId);
          },
        },
      ]
    );
  }

  return (
    <>
      <ProfileSectionCard
        title="האדמינים שמנהלים אותי"
        subtitle="רשימת האדמינים המשויכים למשלם. חייב להישאר לפחות מנהל אחד."
      >
        <View style={profileStyles.buttonsRow}>
          <Pressable
            style={profileStyles.primaryButton}
            onPress={props.onOpenManagersModal}
          >
            <Text style={profileStyles.primaryButtonText}>הוספת מנהל</Text>
          </Pressable>
        </View>

        {props.loadingManagers ? (
          <View style={profileStyles.loadingWrap}>
            <ActivityIndicator size="small" />
            <Text style={profileStyles.loadingText}>טוענת מנהלים...</Text>
          </View>
        ) : (props.managers || []).length === 0 ? (
          <Text style={profileStyles.emptyText}>לא נמצאו מנהלים משויכים</Text>
        ) : (
          <View style={{ marginTop: 12 }}>
            {(props.managers || []).map(function (item) {
              var isRemoving = props.removingManagerId === item.adminPersonId;

              return (
                <View key={String(item.adminPersonId)} style={profileStyles.managerCard}>
                  <Text style={profileStyles.managerName}>
                    {(item.firstName || "") + " " + (item.lastName || "")}
                  </Text>

                  <Text style={profileStyles.managerMeta}>
                    חוות: {item.ranchName || "—"}
                  </Text>

                  <Text style={profileStyles.managerMeta}>
                    טלפון: {item.cellPhone || "—"}
                  </Text>

                  <Text style={profileStyles.managerMeta}>
                    אימייל: {item.email || "—"}
                  </Text>

                  <Pressable
                    style={profileStyles.destructiveButton}
                    disabled={isRemoving}
                    onPress={function () {
                      handleRemovePress(item);
                    }}
                  >
                    <Text style={profileStyles.destructiveButtonText}>
                      {isRemoving ? "מסירה..." : "הסרה"}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ProfileSectionCard>

      <Modal
        visible={props.isManagersModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={props.onCloseManagersModal}
      >
        <View style={profileStyles.modalOverlay}>
          <View style={profileStyles.modalCard}>
            <Text style={profileStyles.modalTitle}>הוספת מנהל</Text>
            <Text style={profileStyles.modalSubtitle}>
              חיפוש לפי שם, אימייל, טלפון או חווה
            </Text>

            <TextInput
              value={props.managersSearchText}
              onChangeText={props.onManagersSearchChange}
              placeholder="חיפוש מנהל"
              placeholderTextColor="#8A7268"
              style={profileStyles.searchInput}
              textAlign="right"
            />

            {props.loadingAvailableManagers ? (
              <View style={profileStyles.loadingWrap}>
                <ActivityIndicator size="small" />
                <Text style={profileStyles.loadingText}>טוענת מנהלים זמינים...</Text>
              </View>
            ) : (props.availableManagers || []).length === 0 ? (
              <Text style={profileStyles.emptyText}>לא נמצאו מנהלים זמינים</Text>
            ) : (
              <ScrollView style={{ maxHeight: 360 }}>
                {(props.availableManagers || []).map(function (item) {
                  var isSubmitting = props.submittingManagerId === item.adminPersonId;

                  return (
                    <View key={String(item.adminPersonId)} style={profileStyles.managerCard}>
                      <Text style={profileStyles.managerName}>
                        {(item.firstName || "") + " " + (item.lastName || "")}
                      </Text>

                      <Text style={profileStyles.managerMeta}>
                        חוות: {item.ranchName || "—"}
                      </Text>

                      <Text style={profileStyles.managerMeta}>
                        טלפון: {item.cellPhone || "—"}
                      </Text>

                      <Text style={profileStyles.managerMeta}>
                        אימייל: {item.email || "—"}
                      </Text>

                      <Pressable
                        style={profileStyles.primaryButton}
                        disabled={isSubmitting}
                        onPress={function () {
                          props.onAddManager(item.adminPersonId);
                        }}
                      >
                        <Text style={profileStyles.primaryButtonText}>
                          {isSubmitting ? "מוסיפה..." : "הוספה"}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <View style={profileStyles.buttonsRow}>
              <Pressable
                style={profileStyles.secondaryButton}
                onPress={props.onCloseManagersModal}
              >
                <Text style={profileStyles.secondaryButtonText}>סגירה</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}