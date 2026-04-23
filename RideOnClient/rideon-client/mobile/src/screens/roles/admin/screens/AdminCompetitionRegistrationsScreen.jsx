import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";
import CompetitionRegistrationsClassesTab from "../../../../components/competitions/CompetitionRegistrationsClassesTab";
import CompetitionPaidTimeTab from "../../../../components/competitions/CompetitionPaidTimeTab";
import CompetitionStallBookingsTab from "../../../../components/competitionRegistrations/CompetitionStallBookingsTab";

import styles from "../../../../styles/adminCompetitionRegistrationsStyles";

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getAdminCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";

import { useUser } from "../../../../context/UserContext";
import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { useCompetition } from "../../../../context/CompetitionContext";

import useAdminCompetitionRegistrations from "../../../../hooks/useAdminCompetitionRegistrations";
import useAdminCompetitionPaidTimes from "../../../../hooks/useAdminCompetitionPaidTimes";
import useAdminCompetitionStallBookings from "../../../../hooks/useAdminCompetitionStallBookings";

function RegistrationsTabs(props) {
  return (
    <View style={styles.tabsWrapper}>
      <Pressable
        style={[
          styles.tabButton,
          props.activeTab === "classes" ? styles.tabButtonActive : null,
        ]}
        onPress={function () {
          props.onChangeTab("classes");
        }}
      >
        <Text
          style={[
            styles.tabButtonText,
            props.activeTab === "classes" ? styles.tabButtonTextActive : null,
          ]}
        >
          מקצים
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.tabButton,
          props.activeTab === "paidTimes" ? styles.tabButtonActive : null,
        ]}
        onPress={function () {
          props.onChangeTab("paidTimes");
        }}
      >
        <Text
          style={[
            styles.tabButtonText,
            props.activeTab === "paidTimes" ? styles.tabButtonTextActive : null,
          ]}
        >
          פייד טיימים
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.tabButton,
          props.activeTab === "stalls" ? styles.tabButtonActive : null,
        ]}
        onPress={function () {
          props.onChangeTab("stalls");
        }}
      >
        <Text
          style={[
            styles.tabButtonText,
            props.activeTab === "stalls" ? styles.tabButtonTextActive : null,
          ]}
        >
          תאים
        </Text>
      </Pressable>

      <Pressable style={styles.tabButtonDisabled}>
        <Text style={styles.tabButtonTextDisabled}>נסורת</Text>
      </Pressable>
    </View>
  );
}

export default function AdminCompetitionRegistrationsScreen(props) {
  var [activeTab, setActiveTab] = useState("classes");

  var userContext = useUser();
  var activeRoleContext = useActiveRole();
  var competitionContext = useCompetition();

  var user = userContext.user;
  var activeRole = activeRoleContext.activeRole;
  var activeCompetition = competitionContext.activeCompetition;

  var competitionId =
    props.route?.params?.competitionId ||
    activeCompetition?.competitionId ||
    null;

  var registration = useAdminCompetitionRegistrations({
    user: user,
    activeRole: activeRole,
    competitionId: competitionId,
  });

  var paidTime = useAdminCompetitionPaidTimes({
    user: user,
    activeRole: activeRole,
    competitionId: competitionId,
  });

  var stallBookings = useAdminCompetitionStallBookings({
    user: user,
    activeRole: activeRole,
    competitionId: competitionId,
    activeCompetition: activeCompetition,
    isActiveTab: activeTab === "stalls",
  });

  function handleCompetitionMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  async function handleExitCompetition() {
    await competitionContext.clearCompetition();
    props.navigation.navigate("AdminCompetitionsBoard");
  }

  return (
    <MobileScreenLayout
      title="הכנסת הרשמות"
      subtitle=""
      activeBottomTab={null}
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <CompetitionMenuTemplate
            activeKey="competition-registration"
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
      >
        <RegistrationsTabs activeTab={activeTab} onChangeTab={setActiveTab} />

        {activeTab === "classes" ? (
          <CompetitionRegistrationsClassesTab
            loading={registration.loading}
            screenError={registration.screenError}
            classes={registration.classes}
            horses={registration.horses}
            riders={registration.riders}
            trainers={registration.trainers}
            payers={registration.payers}
            selectedClass={registration.selectedClass}
            selectedHorse={registration.selectedHorse}
            selectedRider={registration.selectedRider}
            selectedTrainer={registration.selectedTrainer}
            selectedPayer={registration.selectedPayer}
            prizeRecipientName={registration.prizeRecipientName}
            setPrizeRecipientName={registration.setPrizeRecipientName}
            setSelectedClass={registration.setSelectedClass}
            setSelectedHorse={registration.setSelectedHorse}
            setSelectedRider={registration.setSelectedRider}
            setSelectedTrainer={registration.setSelectedTrainer}
            setSelectedPayer={registration.setSelectedPayer}
            locks={registration.locks}
            onToggleLock={registration.handleToggleLock}
            formatClassLabel={registration.formatClassLabel}
            formatHorseLabel={registration.formatHorseLabel}
            formatMemberLabel={registration.formatMemberLabel}
            formatPayerLabel={registration.formatPayerLabel}
            canSubmit={registration.canSubmit}
            isSaving={registration.isSaving}
            onSubmit={registration.handleCreateEntry}
          />
        ) : null}

        {activeTab === "paidTimes" ? (
          <CompetitionPaidTimeTab
            loading={paidTime.loading}
            screenError={paidTime.screenError}
            priceCatalogItems={paidTime.priceCatalogItems}
            requestableSlots={paidTime.requestableSlots}
            riders={paidTime.riders}
            horses={paidTime.horses}
            trainers={paidTime.trainers}
            payers={paidTime.payers}
            selectedPriceCatalog={paidTime.selectedPriceCatalog}
            selectedRequestedSlot={paidTime.selectedRequestedSlot}
            selectedRider={paidTime.selectedRider}
            selectedHorse={paidTime.selectedHorse}
            selectedTrainer={paidTime.selectedTrainer}
            selectedPayer={paidTime.selectedPayer}
            notes={paidTime.notes}
            setSelectedPriceCatalog={paidTime.setSelectedPriceCatalog}
            setSelectedRequestedSlot={paidTime.setSelectedRequestedSlot}
            setSelectedRider={paidTime.setSelectedRider}
            setSelectedHorse={paidTime.setSelectedHorse}
            setSelectedTrainer={paidTime.setSelectedTrainer}
            setSelectedPayer={paidTime.setSelectedPayer}
            setNotes={paidTime.setNotes}
            locks={paidTime.locks}
            onToggleLock={paidTime.handleToggleLock}
            formatPriceCatalogLabel={paidTime.formatPriceCatalogLabel}
            formatRequestedSlotLabel={paidTime.formatRequestedSlotLabel}
            formatMemberLabel={paidTime.formatMemberLabel}
            formatHorseLabel={paidTime.formatHorseLabel}
            formatPayerLabel={paidTime.formatPayerLabel}
            canSubmit={paidTime.canSubmit}
            isSaving={paidTime.isSaving}
            onSubmit={paidTime.handleCreatePaidTimeRequest}
          />
        ) : null}

        {activeTab === "stalls" ? (
          <CompetitionStallBookingsTab
            mode={stallBookings.mode}
            loading={stallBookings.loading}
            screenError={stallBookings.screenError}
            horseStallTypeOptions={stallBookings.horseStallTypeOptions}
            tackStallTypeOptions={stallBookings.tackStallTypeOptions}
            selectedHorseToAdd={stallBookings.selectedHorseToAdd}
            setSelectedHorseToAdd={stallBookings.setSelectedHorseToAdd}
            selectedHorseStallType={stallBookings.selectedHorseStallType}
            setSelectedHorseStallType={stallBookings.setSelectedHorseStallType}
            minCompetitionDate={
              activeCompetition?.competitionStartDate ||
              activeCompetition?.CompetitionStartDate ||
              ""
            }
            maxCompetitionDate={
              activeCompetition?.competitionEndDate ||
              activeCompetition?.CompetitionEndDate ||
              ""
            }
            checkInDate={stallBookings.checkInDate}
            setCheckInDate={stallBookings.setCheckInDate}
            checkOutDate={stallBookings.checkOutDate}
            setCheckOutDate={stallBookings.setCheckOutDate}
            notes={stallBookings.notes}
            setNotes={stallBookings.setNotes}
            selectedHorseBookings={stallBookings.selectedHorseBookings}
            availableHorseOptions={stallBookings.availableHorseOptions}
            allEligibleHorsesAlreadyBooked={
              stallBookings.allEligibleHorsesAlreadyBooked
            }
            hasAnyHorseStallBookingsForCompetition={
              stallBookings.hasAnyHorseStallBookingsForCompetition
            }
            getAvailablePayersForHorse={
              stallBookings.getAvailablePayersForHorse
            }
            handleRemoveHorseBooking={stallBookings.handleRemoveHorseBooking}
            toggleHorsePayerSelection={stallBookings.toggleHorsePayerSelection}
            expandedHorseEditorId={stallBookings.expandedHorseEditorId}
            toggleHorseEditor={stallBookings.toggleHorseEditor}
            selectedTackStallType={stallBookings.selectedTackStallType}
            setSelectedTackStallType={stallBookings.setSelectedTackStallType}
            tackQuantity={stallBookings.tackQuantity}
            setTackQuantity={stallBookings.setTackQuantity}
            tackSplitMode={stallBookings.tackSplitMode}
            setTackSplitMode={stallBookings.setTackSplitMode}
            selectedTackPayers={stallBookings.selectedTackPayers}
            toggleTackPayerSelection={stallBookings.toggleTackPayerSelection}
            tackNotes={stallBookings.tackNotes}
            setTackNotes={stallBookings.setTackNotes}
            tackStartDate={stallBookings.tackStartDate}
            setTackStartDate={stallBookings.setTackStartDate}
            tackEndDate={stallBookings.tackEndDate}
            setTackEndDate={stallBookings.setTackEndDate}
            tackPricingSummary={stallBookings.tackPricingSummary}
            allSelectedHorsePayers={stallBookings.allSelectedHorsePayers}
            allHorseStallTypes={stallBookings.allHorseStallTypes}
            handleCreateHorseStallBookings={
              stallBookings.handleCreateHorseStallBookings
            }
            handleOpenTackMode={stallBookings.handleOpenTackMode}
            handleBackToHorseMode={stallBookings.handleBackToHorseMode}
            handleSubmitTackDraft={stallBookings.handleSubmitTackDraft}
            isSaving={stallBookings.isSaving}
            formatHorseLabel={stallBookings.formatHorseLabel}
            formatPayerLabel={stallBookings.formatPayerLabel}
            formatStallTypeLabel={stallBookings.formatStallTypeLabel}
            bookedHorseNamesSummary={stallBookings.bookedHorseNamesSummary}
            existingTackBookingsCount={stallBookings.existingTackBookingsCount}
          />
        ) : null}
      </ScrollView>
    </MobileScreenLayout>
  );
}
