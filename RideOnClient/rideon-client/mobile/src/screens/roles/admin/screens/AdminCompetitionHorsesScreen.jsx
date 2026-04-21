import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";
import CompetitionHorseCard from "../../../../components/competitions/CompetitionHorseCard";

import roleSharedStyles from "../../../../styles/roleSharedStyles";
import horsesStyles from "../../../../styles/horsesStyles";

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getAdminCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";

import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { useCompetition } from "../../../../context/CompetitionContext";

import {
  getCompetitionHorses,
  updateHorseBarnName,
} from "../../../../services/horsesService";

export default function AdminCompetitionHorsesScreen(props) {
  var activeRoleContext = useActiveRole();
  var competitionContext = useCompetition();

  var activeRole = activeRoleContext.activeRole;
  var activeCompetition = competitionContext.activeCompetition;

  var [horses, setHorses] = useState([]);
  var [loading, setLoading] = useState(false);
  var [searchText, setSearchText] = useState("");
  var [screenError, setScreenError] = useState("");

  var [selectedHorse, setSelectedHorse] = useState(null);
  var [barnNameInput, setBarnNameInput] = useState("");
  var [isEditModalVisible, setIsEditModalVisible] = useState(false);
  var [isSavingBarnName, setIsSavingBarnName] = useState(false);

  useFocusEffect(
    useCallback(
      function () {
        if (
          !activeRole ||
          !activeRole.ranchId ||
          !activeCompetition ||
          !activeCompetition.competitionId
        ) {
          return;
        }

        loadCompetitionHorses(searchText.trim());
      },
      [activeRole, activeCompetition, searchText],
    ),
  );

  async function loadCompetitionHorses(searchValue) {
    try {
      if (
        !activeRole ||
        !activeRole.ranchId ||
        !activeCompetition ||
        !activeCompetition.competitionId
      ) {
        return;
      }

      setLoading(true);
      setScreenError("");

      var response = await getCompetitionHorses(
        activeRole.ranchId,
        activeCompetition.competitionId,
        searchValue || null,
      );

      setHorses(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setScreenError(
        String(error?.response?.data || "אירעה שגיאה בטעינת סוסי התחרות"),
      );
      setHorses([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    await loadCompetitionHorses(searchText.trim());
  }

  function handleCompetitionMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  async function handleExitCompetition() {
    await competitionContext.clearCompetition();
    props.navigation.navigate("AdminCompetitionsBoard");
  }

  function openEditBarnNameModal(horse) {
    setSelectedHorse(horse);
    setBarnNameInput(horse?.barnName || "");
    setIsEditModalVisible(true);
  }

  function closeEditBarnNameModal() {
    if (isSavingBarnName) {
      return;
    }

    setIsEditModalVisible(false);
    setSelectedHorse(null);
    setBarnNameInput("");
  }

  async function handleSaveBarnName() {
    try {
      if (!selectedHorse || !selectedHorse.horseId) {
        Alert.alert("שגיאה", "לא נמצאו פרטי סוס לעדכון");
        return;
      }

      if (!activeRole || !activeRole.ranchId) {
        Alert.alert("שגיאה", "לא נמצאה חווה פעילה");
        return;
      }

      setIsSavingBarnName(true);

      await updateHorseBarnName(
        selectedHorse.horseId,
        activeRole.ranchId,
        barnNameInput.trim() || null,
      );

      setHorses(function (prevHorses) {
        return prevHorses.map(function (horse) {
          if (horse.horseId !== selectedHorse.horseId) {
            return horse;
          }

          return {
            ...horse,
            barnName: barnNameInput.trim() || null,
          };
        });
      });

      closeEditBarnNameModal();

      Alert.alert("נשמר", "כינוי הסוס עודכן בהצלחה");
    } catch (error) {
      Alert.alert(
        "שגיאה",
        String(error?.response?.data || "אירעה שגיאה בעדכון כינוי הסוס"),
      );
    } finally {
      setIsSavingBarnName(false);
    }
  }

  return (
    <MobileScreenLayout
      title="הסוסים שלי"
      subtitle=""
      activeBottomTab={null}
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <CompetitionMenuTemplate
            activeKey="my-horses"
            closeMenu={closeMenu}
            competitionName={
              activeCompetition ? activeCompetition.competitionName : ""
            }
            items={getAdminCompetitionMenuItems()}
            onItemPress={handleCompetitionMenuPress}
            onExitCompetition={handleExitCompetition}
          />
        );
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={horsesStyles.screenContent}
      >
        <View style={horsesStyles.searchCard}>
          <Text style={horsesStyles.searchLabel}>חיפוש סוס בתחרות</Text>

          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="שם סוס, כינוי או מספר התאחדות"
            placeholderTextColor="#9E8A7F"
            style={horsesStyles.searchInput}
            textAlign="right"
          />

          <Text style={horsesStyles.helperText}>
            יוצגו רק סוסים שמשתתפים בתחרות הפעילה.
          </Text>

          <View style={horsesStyles.rowWrap}>
            <Pressable
              style={horsesStyles.primaryButton}
              onPress={handleSearch}
            >
              <Text style={horsesStyles.primaryButtonText}>חיפוש</Text>
            </Pressable>
          </View>
        </View>

        <Text style={roleSharedStyles.sectionTitle}>סוסי התחרות</Text>

        {screenError ? (
          <View style={horsesStyles.errorCard}>
            <Text style={horsesStyles.errorText}>{screenError}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={horsesStyles.loadingWrap}>
            <ActivityIndicator size="large" color="#7B5A4D" />
            <Text style={horsesStyles.loadingText}>טוענת את סוסי התחרות...</Text>
          </View>
        ) : horses.length === 0 ? (
          <View style={horsesStyles.emptyCard}>
            <Text style={horsesStyles.emptyTitle}>לא נמצאו סוסים</Text>
            <Text style={horsesStyles.emptyText}>
              לא נמצאו סוסים שמשתתפים בתחרות לפי החיפוש שביצעת.
            </Text>
          </View>
        ) : (
          <View style={horsesStyles.listCard}>
            <Text style={horsesStyles.sectionTitle}>
              סה״כ סוסים: {horses.length}
            </Text>

            {horses.map(function (horse) {
              return (
                <CompetitionHorseCard
                  key={String(horse.horseId)}
                  horse={horse}
                  onEditBarnName={openEditBarnNameModal}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={isEditModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={closeEditBarnNameModal}
      >
        <TouchableWithoutFeedback onPress={closeEditBarnNameModal}>
          <View style={horsesStyles.modalOverlay}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView
                style={horsesStyles.keyboardAvoidingWrap}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
              >
                <View style={horsesStyles.modalCenterWrap}>
                  <View style={horsesStyles.modalCard}>
                    <Text style={horsesStyles.modalTitle}>עריכת כינוי סוס</Text>

                    <Text style={horsesStyles.modalSubtitle}>
                      {selectedHorse?.horseName || ""}
                    </Text>

                    <Text style={horsesStyles.fieldLabel}>כינוי חדש</Text>

                    <TextInput
                      value={barnNameInput}
                      onChangeText={setBarnNameInput}
                      placeholder="אפשר להשאיר ריק"
                      placeholderTextColor="#9E8A7F"
                      style={horsesStyles.fieldInput}
                      textAlign="right"
                    />

                    <View style={horsesStyles.modalButtonsRow}>
                      <Pressable
                        style={[
                          horsesStyles.primaryButton,
                          isSavingBarnName ? { opacity: 0.7 } : null,
                        ]}
                        onPress={handleSaveBarnName}
                        disabled={isSavingBarnName}
                      >
                        <Text style={horsesStyles.primaryButtonText}>
                          {isSavingBarnName ? "שומרת..." : "שמור"}
                        </Text>
                      </Pressable>

                      <Pressable
                        style={horsesStyles.secondaryButton}
                        onPress={closeEditBarnNameModal}
                        disabled={isSavingBarnName}
                      >
                        <Text style={horsesStyles.secondaryButtonText}>
                          ביטול
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </MobileScreenLayout>
  );
}