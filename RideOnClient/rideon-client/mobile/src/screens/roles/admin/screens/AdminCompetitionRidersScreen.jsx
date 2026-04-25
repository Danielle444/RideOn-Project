import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";
import CompetitionFederationMemberCard from "../../../../components/competitions/CompetitionFederationMemberCard";

import roleSharedStyles from "../../../../styles/roleSharedStyles";
import horsesStyles from "../../../../styles/horsesStyles";

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getAdminCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";

import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { useCompetition } from "../../../../context/CompetitionContext";

import { getCompetitionRiders } from "../../../../services/federationMembersService";

export default function AdminCompetitionRidersScreen(props) {
  var activeRoleContext = useActiveRole();
  var competitionContext = useCompetition();

  var activeRole = activeRoleContext.activeRole;
  var activeCompetition = competitionContext.activeCompetition;

  var [items, setItems] = useState([]);
  var [loading, setLoading] = useState(false);
  var [searchText, setSearchText] = useState("");
  var [screenError, setScreenError] = useState("");

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

        loadRiders(searchText.trim());
      },
      [activeRole, activeCompetition, searchText],
    ),
  );

  async function loadRiders(searchValue) {
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

      var response = await getCompetitionRiders(
        activeRole.ranchId,
        activeCompetition.competitionId,
        searchValue || null,
      );

      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setScreenError(
        String(error?.response?.data || "אירעה שגיאה בטעינת רוכבי התחרות"),
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    await loadRiders(searchText.trim());
  }

  function handleCompetitionMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  async function handleExitCompetition() {
    await competitionContext.clearCompetition();
    props.navigation.navigate("AdminCompetitionsBoard");
  }

  return (
    <MobileScreenLayout
      title="הרוכבים שלי"
      subtitle=""
      activeBottomTab={null}
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <CompetitionMenuTemplate
            activeKey="my-riders"
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
          <Text style={horsesStyles.searchLabel}>חיפוש רוכב בתחרות</Text>

          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="שם פרטי או שם משפחה"
            placeholderTextColor="#9E8A7F"
            style={horsesStyles.searchInput}
            textAlign="right"
          />

          <Text style={horsesStyles.helperText}>
            יוצגו רק רוכבים מהחווה הפעילה שלך שמשתתפים בתחרות הפעילה.
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

        <Text style={roleSharedStyles.sectionTitle}>רוכבי התחרות</Text>

        {screenError ? (
          <View style={horsesStyles.errorCard}>
            <Text style={horsesStyles.errorText}>{screenError}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={horsesStyles.loadingWrap}>
            <ActivityIndicator size="large" color="#7B5A4D" />
            <Text style={horsesStyles.loadingText}>טוענת את רוכבי התחרות...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={horsesStyles.emptyCard}>
            <Text style={horsesStyles.emptyTitle}>לא נמצאו רוכבים</Text>
            <Text style={horsesStyles.emptyText}>
              לא נמצאו רוכבים בתחרות לפי החיפוש שביצעת.
            </Text>
          </View>
        ) : (
          <View style={horsesStyles.listCard}>
            <Text style={horsesStyles.sectionTitle}>
              סה״כ רוכבים: {items.length}
            </Text>

            {items.map(function (item) {
              return (
                <CompetitionFederationMemberCard
                  key={String(item.federationMemberId)}
                  item={item}
                  roleLabel="מס׳ חבר התאחדות"
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </MobileScreenLayout>
  );
}