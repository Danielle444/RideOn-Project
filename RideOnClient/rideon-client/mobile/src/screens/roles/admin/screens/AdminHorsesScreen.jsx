import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
} from "react-native";
import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import HorseSearchCard from "../../../../components/horses/HorseSearchCard";
import HorseListItemCard from "../../../../components/horses/HorseListItemCard";
import EditHorseBarnNameModal from "../components/EditHorseBarnNameModal";
import horsesStyles from "../../../../styles/horsesStyles";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import { useUser } from "../../../../context/UserContext";
import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getAdminMenuItems } from "../../../../navigation/sideMenuConfigs";
import {
  getHorsesByRanch,
  updateHorseBarnName,
} from "../../../../services/horsesService";

export default function AdminHorsesScreen(props) {
  const { user } = useUser();
  const { activeRole } = useActiveRole();

  const [horses, setHorses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [screenError, setScreenError] = useState("");
  const [searchText, setSearchText] = useState("");

  const [selectedHorse, setSelectedHorse] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [barnNameValue, setBarnNameValue] = useState("");
  const [isSavingBarnName, setIsSavingBarnName] = useState(false);

  const ranchId = activeRole?.ranchId || 0;

  useEffect(
    function () {
      if (!ranchId) {
        return;
      }

      loadHorses("");
    },
    [ranchId]
  );

  async function loadHorses(nextSearchText) {
    if (!ranchId) {
      return;
    }

    try {
      setLoading(true);
      setScreenError("");

      const response = await getHorsesByRanch(ranchId, nextSearchText);
      setHorses(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.log("AdminHorsesScreen load error:", error?.response?.data || error);
      setScreenError(
        String(
          error?.response?.data ||
            error?.message ||
            "אירעה שגיאה בטעינת רשימת הסוסים"
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSearchChange(text) {
    setSearchText(text);
    await loadHorses(text);
  }

  function openEditModal(horse) {
    setSelectedHorse(horse);
    setBarnNameValue(horse?.barnName || "");
    setIsEditModalOpen(true);
  }

  function closeEditModal() {
    setSelectedHorse(null);
    setBarnNameValue("");
    setIsEditModalOpen(false);
  }

  async function handleSaveBarnName() {
    if (!selectedHorse || !ranchId) {
      return;
    }

    try {
      setIsSavingBarnName(true);

      await updateHorseBarnName(
        selectedHorse.horseId,
        ranchId,
        barnNameValue.trim()
      );

      closeEditModal();
      await loadHorses(searchText);

      Alert.alert("הצלחה", "הכינוי עודכן בהצלחה");
    } catch (error) {
      Alert.alert(
        "שגיאה",
        String(
          error?.response?.data ||
            error?.message ||
            "אירעה שגיאה בעדכון הכינוי"
        )
      );
    } finally {
      setIsSavingBarnName(false);
    }
  }

  async function handleLogout() {
    if (props.onLogout) {
      await props.onLogout();
    }
  }

  const fullName = useMemo(
    function () {
      return `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
    },
    [user]
  );

  return (
    <MobileScreenLayout
      title="ניהול סוסים"
      subtitle=""
      activeBottomTab="menu"
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <SideMenuTemplate
            userName={fullName}
            roleName={activeRole?.roleName || ""}
            ranchName={activeRole?.ranchName || ""}
            closeMenu={closeMenu}
            items={getAdminMenuItems()}
            activeKey="horses"
            onItemPress={function (item) {
              props.navigation.navigate(item.screen);
            }}
            onSwitchRole={function () {
              props.navigation.replace("SelectActiveRole");
              closeMenu();
            }}
            onLogout={async function () {
              await handleLogout();
              closeMenu();
            }}
          />
        );
      }}
    >
      <ScrollView
        contentContainerStyle={horsesStyles.screenContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={roleSharedStyles.welcomeCard}>
          <Text style={roleSharedStyles.welcomeTitle}>ניהול סוסים</Text>
          <Text style={roleSharedStyles.welcomeText}>
            כאן ניתן לצפות בכל הסוסים של החווה הפעילה ולעדכן את הכינוי שלהם
            לצורך זיהוי נוח יותר במסכים השונים.
          </Text>
        </View>

        {screenError ? (
          <View style={horsesStyles.errorCard}>
            <Text style={horsesStyles.errorText}>{screenError}</Text>
          </View>
        ) : null}

        <HorseSearchCard
          searchText={searchText}
          onChangeSearchText={handleSearchChange}
        />

        {loading ? (
          <View style={horsesStyles.loadingWrap}>
            <ActivityIndicator size="small" />
            <Text style={horsesStyles.loadingText}>טוענת סוסים...</Text>
          </View>
        ) : horses.length === 0 ? (
          <View style={horsesStyles.emptyCard}>
            <Text style={horsesStyles.emptyTitle}>לא נמצאו סוסים</Text>
            <Text style={horsesStyles.emptyText}>
              לא נמצאו סוסים תואמים עבור החווה הפעילה או עבור החיפוש שבוצע.
            </Text>
          </View>
        ) : (
          <View style={horsesStyles.listCard}>
            <Text style={horsesStyles.sectionTitle}>סוסי החווה</Text>

            {horses.map(function (item) {
              return (
                <HorseListItemCard
                  key={String(item.horseId)}
                  item={item}
                  onEdit={openEditModal}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      <EditHorseBarnNameModal
        visible={isEditModalOpen}
        selectedHorse={selectedHorse}
        barnNameValue={barnNameValue}
        onChangeBarnName={setBarnNameValue}
        onClose={closeEditModal}
        onSubmit={handleSaveBarnName}
        isSaving={isSavingBarnName}
      />
    </MobileScreenLayout>
  );
}