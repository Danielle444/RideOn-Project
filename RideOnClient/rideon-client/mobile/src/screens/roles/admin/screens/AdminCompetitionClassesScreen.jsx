import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useState } from "react";

import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getAdminCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";

import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { useCompetition } from "../../../../context/CompetitionContext";

import useAdminCompetitionEntriesList from "../../../../hooks/useAdminCompetitionEntriesList";

import styles from "../../../../styles/adminCompetitionClassesStyles";

import CompetitionEntryCreateModal from "../../../../components/competitions/CompetitionEntryCreateModal";

export default function AdminCompetitionClassesScreen(props) {
  var activeRoleContext = useActiveRole();

  var competitionContext = useCompetition();

  var activeRole = activeRoleContext.activeRole;

  var activeCompetition = competitionContext.activeCompetition;

  var entries = useAdminCompetitionEntriesList({
    activeRole: activeRole,
    activeCompetition: activeCompetition,
  });

  var [showFilters, setShowFilters] = useState(false);

  var [showCreateModal, setShowCreateModal] = useState(false);

  function handleCompetitionMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  async function handleExitCompetition() {
    await competitionContext.clearCompetition();

    props.navigation.navigate("AdminCompetitionsBoard");
  }

  function renderFilterChip(label, isActive, onPress, keyValue) {
    return (
      <Pressable
        key={keyValue || label}
        style={[styles.filterChip, isActive ? styles.filterChipActive : null]}
        onPress={onPress}
      >
        <Text
          style={[
            styles.filterChipText,
            isActive ? styles.filterChipTextActive : null,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function renderSummaryBox(label, number, filterValue) {
    var isActive = entries.paymentFilter === filterValue;

    return (
      <Pressable
        style={[styles.summaryBox, isActive ? styles.summaryBoxActive : null]}
        onPress={function () {
          entries.setPaymentFilter(filterValue);
        }}
      >
        <Text
          style={[
            styles.summaryNumber,
            isActive ? styles.summaryNumberActive : null,
          ]}
        >
          {number}
        </Text>

        <Text
          style={[
            styles.summaryLabel,
            isActive ? styles.summaryLabelActive : null,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function renderPaymentBadge(item) {
    return (
      <View
        style={[
          styles.paymentBadge,
          item.isPaid ? styles.paymentPaid : styles.paymentUnpaid,
        ]}
      >
        <Text style={styles.paymentBadgeText}>
          {item.isPaid ? "שולם" : "לא שולם"}
        </Text>
      </View>
    );
  }

  function renderFineBadge(item) {
    if (!item.fineAmount || Number(item.fineAmount) <= 0) {
      return null;
    }

    return (
      <View style={styles.fineBadge}>
        <Text style={styles.fineBadgeText}>כולל קנס ₪{item.fineAmount}</Text>
      </View>
    );
  }

  function renderEntryCard(item) {
    return (
      <View key={String(item.entryId)} style={styles.entryCard}>
        <View style={styles.topRow}>
          <View style={styles.classBlock}>
            <Text style={styles.className}>{item.className}</Text>

            <Text style={styles.classDate}>
              {entries.formatDate(item.classDate)}
            </Text>
          </View>

          <Text style={styles.amountText}>₪{item.amountToPay}</Text>
        </View>

        <Text style={styles.mainLine}>
          {item.riderName} • {item.horseName}
        </Text>

        <View style={styles.badgesRow}>
          {renderPaymentBadge(item)}
          {renderFineBadge(item)}
        </View>

        <View style={styles.detailsBlock}>
          <Text style={styles.detailText}>מאמן: {item.coachName || "-"}</Text>

          <Text style={styles.detailText}>משלם: {item.payerName || "-"}</Text>

          <Text style={styles.detailText}>
            מקבל פרס: {item.prizeRecipientName || "-"}
          </Text>

          {item.drawOrder ? (
            <Text style={styles.detailText}>סדר כניסה: {item.drawOrder}</Text>
          ) : null}
        </View>
      </View>
    );
  }

  function renderFilters() {
    return (
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>סינון לפי תשלום</Text>

        <View style={styles.chipsRow}>
          {renderFilterChip(
            "כל ההרשמות",
            entries.paymentFilter === "all",
            function () {
              entries.setPaymentFilter("all");
            },
          )}

          {renderFilterChip(
            "שולם",
            entries.paymentFilter === "paid",
            function () {
              entries.setPaymentFilter("paid");
            },
          )}

          {renderFilterChip(
            "לא שולם",
            entries.paymentFilter === "unpaid",
            function () {
              entries.setPaymentFilter("unpaid");
            },
          )}
        </View>

        <Text style={styles.filterTitle}>ימים</Text>

        <View style={styles.chipsRow}>
          {renderFilterChip(
            "כל הימים",
            entries.dateFilter === "all",
            function () {
              entries.setDateFilter("all");
            },
          )}

          {entries.availableDates.map(function (dateItem) {
            return renderFilterChip(
              dateItem.label,
              entries.dateFilter === dateItem.value,
              function () {
                entries.setDateFilter(dateItem.value);
              },
              "date-" + dateItem.value,
            );
          })}
        </View>

        <Pressable
          style={styles.clearFiltersButton}
          onPress={entries.resetFilters}
        >
          <Text style={styles.clearFiltersText}>ניקוי כל הסינונים</Text>
        </Pressable>
      </View>
    );
  }

  function renderContent() {
    if (entries.loading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#7B5A4D" />

          <Text style={styles.loadingText}>טוענת מקצים...</Text>
        </View>
      );
    }

    if (entries.screenError) {
      return (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{entries.screenError}</Text>
        </View>
      );
    }

    if (entries.filteredItems.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>לא נמצאו מקצים</Text>

          <Text style={styles.emptyText}>
            לא קיימות הרשמות למקצים שתואמות לחיפוש או לסינון שבחרת.
          </Text>
        </View>
      );
    }

    return entries.filteredItems.map(function (item) {
      return renderEntryCard(item);
    });
  }

  return (
    <MobileScreenLayout
      title="מקצים"
      subtitle=""
      activeBottomTab={null}
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <CompetitionMenuTemplate
            activeKey="classes"
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
        contentContainerStyle={styles.screenContent}
        refreshControl={
          <RefreshControl
            refreshing={entries.refreshing}
            onRefresh={entries.handleRefresh}
          />
        }
      >
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>ההרשמות שלי למקצים</Text>

          <Text style={styles.helperText}>
            כאן מוצגות כל ההרשמות למקצים שיצרת עבור התחרות הפעילה.
          </Text>

          <View style={styles.summaryRow}>
            {renderSummaryBox("סה״כ הרשמות", entries.items.length, "all")}

            {renderSummaryBox(
              "שולמו",
              entries.items.filter(function (item) {
                return item.isPaid;
              }).length,
              "paid",
            )}

            {renderSummaryBox(
              "לא שולמו",
              entries.items.filter(function (item) {
                return !item.isPaid;
              }).length,
              "unpaid",
            )}
          </View>
        </View>

        <View style={styles.searchCard}>
          <Text style={styles.fieldLabel}>חיפוש</Text>

          <TextInput
            value={entries.searchText}
            onChangeText={entries.setSearchText}
            placeholder="חיפוש לפי מקצה, סוס, רוכב, מאמן או משלם"
            placeholderTextColor="#9E8A7F"
            style={styles.textInput}
            textAlign="right"
          />
        </View>

        <View style={styles.filterToggleCard}>
          <Pressable
            style={styles.filterToggleButton}
            onPress={function () {
              setShowFilters(!showFilters);
            }}
          >
            <Text style={styles.filterToggleText}>
              {showFilters ? "הסתר סינונים" : "הצג סינונים"}
            </Text>

            <Text style={styles.filterToggleIcon}>
              {showFilters ? "▲" : "▼"}
            </Text>
          </Pressable>

          {showFilters ? renderFilters() : null}
        </View>

        <Pressable
          style={styles.addButton}
          onPress={function () {
            setShowCreateModal(true);
          }}
        >
          <Text style={styles.addButtonText}>+ הוסף הרשמה למקצה</Text>
        </Pressable>

        <CompetitionEntryCreateModal
          visible={showCreateModal}
          onClose={function () {
            setShowCreateModal(false);
          }}
          onCreated={entries.handleRefresh}
        />

        <Text style={styles.resultsText}>
          מוצגות {entries.filteredItems.length} מתוך {entries.items.length}{" "}
          הרשמות
        </Text>

        {renderContent()}
      </ScrollView>
    </MobileScreenLayout>
  );
}
