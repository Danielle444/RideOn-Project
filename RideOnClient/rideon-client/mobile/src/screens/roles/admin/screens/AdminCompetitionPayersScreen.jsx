import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import styles from "../../../../styles/adminCompetitionPayersStyles";

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getAdminCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";

import { useUser } from "../../../../context/UserContext";
import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { useCompetition } from "../../../../context/CompetitionContext";

import { getCompetitionPayers } from "../../../../services/payerService";

export default function AdminCompetitionPayersScreen(props) {
  var userContext = useUser();
  var activeRoleContext = useActiveRole();
  var competitionContext = useCompetition();

  var user = userContext.user;
  var activeRole = activeRoleContext.activeRole;
  var activeCompetition = competitionContext.activeCompetition;

  var [payers, setPayers] = useState([]);
  var [loading, setLoading] = useState(false);
  var [searchText, setSearchText] = useState("");

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

        loadCompetitionPayers(searchText.trim());
      },
      [activeRole, activeCompetition, searchText],
    ),
  );

  async function loadCompetitionPayers(searchValue) {
    try {
      if (!activeRole || !activeCompetition) {
        return;
      }

      setLoading(true);

      var response = await getCompetitionPayers(
        activeRole.ranchId,
        activeCompetition.competitionId,
        searchValue || null,
      );

      setPayers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.log("Competition payers error:", error);
      console.log("Competition payers status:", error?.response?.status);
      console.log("Competition payers data:", error?.response?.data);
      console.log("Active role:", activeRole);
      console.log("Active competition:", activeCompetition);

      Alert.alert(
        "שגיאה",
        String(error?.response?.data || "אירעה שגיאה בטעינת משלמי התחרות"),
      );

      setPayers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    await loadCompetitionPayers(searchText.trim());
  }

  function handleCompetitionMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  async function handleExitCompetition() {
    await competitionContext.clearCompetition();
    props.navigation.navigate("AdminCompetitionsBoard");
  }

  function renderStatusBadge(statusText) {
    var normalized = String(statusText || "").trim();

    var badgeStyle = styles.statusBadgeDefault;
    var textStyle = styles.statusTextDefault;
    var displayText = "ללא סטטוס";

    if (normalized === "Paid") {
      badgeStyle = styles.statusBadgePaid;
      textStyle = styles.statusTextPaid;
      displayText = "שולם";
    } else if (normalized === "Partial") {
      badgeStyle = styles.statusBadgePartial;
      textStyle = styles.statusTextPartial;
      displayText = "חלקי";
    } else if (normalized === "Unpaid") {
      badgeStyle = styles.statusBadgeUnpaid;
      textStyle = styles.statusTextUnpaid;
      displayText = "לא שולם";
    }

    return (
      <View style={[styles.statusBadgeBase, badgeStyle]}>
        <Text style={[styles.statusTextBase, textStyle]}>{displayText}</Text>
      </View>
    );
  }

  function formatCurrency(value) {
    var numberValue = Number(value || 0);

    return numberValue.toLocaleString("he-IL", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  return (
    <MobileScreenLayout
      title="המשלמים שלי"
      subtitle=""
      activeBottomTab={null}
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <CompetitionMenuTemplate
            activeKey="my-payers"
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
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>חיפוש משלם בתחרות</Text>

          <View style={styles.searchRow}>
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="שם, טלפון או אימייל"
              placeholderTextColor="#9E8A7F"
              style={styles.searchInput}
              textAlign="right"
            />

            <Pressable style={styles.searchButton} onPress={handleSearch}>
              <Ionicons name="search-outline" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <Text style={roleSharedStyles.sectionTitle}>משלמים בתחרות</Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#8B6352" />
          </View>
        ) : payers.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>לא נמצאו משלמים בתחרות זו</Text>
          </View>
        ) : (
          payers.map(function (payer) {
            return (
              <View key={String(payer.personId)} style={styles.card}>
                <View style={styles.cardTopRow}>
                  {renderStatusBadge(payer.paymentStatus)}

                  <View style={styles.iconCircle}>
                    <Ionicons name="card-outline" size={22} color="#7B5A4D" />
                  </View>
                </View>

                <Text style={styles.fullNameText}>
                  {payer.fullName ||
                    (
                      (payer.firstName || "") +
                      " " +
                      (payer.lastName || "")
                    ).trim()}
                </Text>

                <Text style={styles.infoText}>
                  טלפון: {payer.cellPhone || "-"}
                </Text>

                <Text style={styles.infoText}>
                  אימייל: {payer.email || "-"}
                </Text>

                <Text style={styles.infoText}>
                  שולם: ₪{formatCurrency(payer.paidAmount)}
                </Text>

                <Text style={styles.totalAmountText}>
                  סה״כ לתשלום: ₪{formatCurrency(payer.totalAmount)}
                </Text>

                <Pressable
                  style={styles.enterButton}
                  onPress={function () {
                    props.navigation.navigate("AdminCompetitionPayerAccount", {
                      payer: payer,
                      competition: activeCompetition,
                    });
                  }}
                >
                  <Text style={styles.enterButtonText}>כניסה לחשבון</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </MobileScreenLayout>
  );
}
