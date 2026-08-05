import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

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
import useRegistrationStepStatus from "../../../../hooks/useRegistrationStepStatus";

import CompetitionShavingsTab from "../../../../components/competitionRegistrations/CompetitionShavingsTab";
import useAdminCompetitionShavings from "../../../../hooks/useAdminCompetitionShavings";

import PaidTimeChatbotModal from "../../../../components/competitions/paidTimeChatbot/PaidTimeChatbotModal";
import SmartBookingFab from "../../../../components/competitions/paidTimeChatbot/SmartBookingFab";

import { evaluatePaidTimeBookingAvailability } from "../../../../utils/paidTimeBookingAvailability";
import { BULK_PAID_TIME_ENTRY_ENABLED } from "../../../../utils/paidTimeBulkEntryFlag";
import { buildRegistrationStepNoticeMessage } from "../../../../utils/registrationStepNoticeMessages";
import RegistrationStepNotice from "../../../../components/competitions/RegistrationStepNotice";

// סדר קבוע לפתרון טאב פתיחה לא תקין/לא זמין ולבחירת טאב חלופי - ראו
// resolveRequestedInitialTab ו-resolveFallbackTab.
var REGISTRATION_STEP_TAB_ORDER = ["classes", "paidTimes", "stalls", "shavings"];

function resolveRequestedInitialTab(value) {
  return REGISTRATION_STEP_TAB_ORDER.indexOf(value) !== -1 ? value : "classes";
}

// טאב פתיחה לא תקין, או טאב שהוסתר (כרגע רק פייד טיים יכול להיות מוסתר),
// חייב ליפול לטאב הראשון שגם גלוי וגם שמיש. אם התחרות הסתיימה ואף טאב אינו
// שמיש, נופלים לטאב הגלוי הראשון (מקצים תמיד גלוי) כדי שהמסך תמיד ינחת על
// טאב אמיתי ולא יישאר תקוע על טאב מוסתר.
function resolveFallbackTab(availability) {
  var usableTabKey = REGISTRATION_STEP_TAB_ORDER.find(function (key) {
    var stepAvailability = availability[key];
    return stepAvailability && stepAvailability.isVisible && stepAvailability.isEnabled;
  });

  if (usableTabKey) {
    return usableTabKey;
  }

  var visibleTabKey = REGISTRATION_STEP_TAB_ORDER.find(function (key) {
    var stepAvailability = availability[key];
    return stepAvailability && stepAvailability.isVisible;
  });

  return visibleTabKey || "classes";
}

// CAP-6: this tab strip's label needs up to two lines ("פייד טיימים" was
// clipping to one). Deliberately a LOCAL constant, not a change to the
// shared RTL_LABEL_NUMBER_OF_LINES (which stays 1 for Button.jsx and every
// other consumer) - centering still comes from styles.tabButtonText's own
// rtlLabelStyle spread, unaffected by the line count.
var TAB_LABEL_NUMBER_OF_LINES = 2;

function RegistrationsTabs(props) {
  var availability = props.availability;

  function renderTabButton(key, label) {
    var stepAvailability = availability[key];

    if (!stepAvailability || !stepAvailability.isVisible) {
      return null;
    }

    var isActive = props.activeTab === key;
    var isDisabled = !stepAvailability.isEnabled;

    return (
      <Pressable
        key={key}
        style={[
          isDisabled ? styles.tabButtonDisabled : styles.tabButton,
          isActive ? styles.tabButtonActive : null,
        ]}
        onPress={function () {
          props.onChangeTab(key);
        }}
      >
        <Text
          numberOfLines={TAB_LABEL_NUMBER_OF_LINES}
          style={[
            isDisabled ? styles.tabButtonTextDisabled : styles.tabButtonText,
            isActive ? styles.tabButtonTextActive : null,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.tabsWrapper}>
      {renderTabButton("classes", "מקצים")}
      {renderTabButton("paidTimes", "פייד טיימים")}
      {renderTabButton("stalls", "תאים")}
      {renderTabButton("shavings", "נסורת")}
    </View>
  );
}

export default function AdminCompetitionRegistrationsScreen(props) {
  var routeParams = props.route?.params || {};
  var initialTab = resolveRequestedInitialTab(routeParams.initialTab);
  var shouldAutoOpenChatbot = !!routeParams.openSmartBooking;

  var [activeTab, setActiveTab] = useState(initialTab);

  // הצ'אטבוט כבר לא נפתח מיד עם הפרמטר מהניווט. קודם ממתינים לנתוני
  // הפייד טיים של התחרות, ורק אם יש הגדרות מספקות נפתחת ההזמנה המרוכזת -
  // אחרת המשתמשת הייתה נכנסת לזרימה שאי אפשר להתקדם בה.
  var [isChatbotOpen, setIsChatbotOpen] = useState(false);
  var autoOpenHandledRef = useRef(false);

  // משמש את טופס הפייד טיים הבודד כדי לגלול לסקשן הראשון שנכשל בוולידציה.
  var contentScrollRef = useRef(null);

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

  var registrationStepStatus = useRegistrationStepStatus({
    competitionId: competitionId,
    ranchId: activeRole?.ranchId,
    enabled: true,
  });

  var availability = registrationStepStatus.availability;
  var isRegistrationStatusLoading = registrationStepStatus.loading;
  var registrationStatusError = registrationStepStatus.error;
  var reloadRegistrationStepStatus = registrationStepStatus.reload;

  // טאב פתיחה שגוי, או טאב שהתגלה כמוסתר אחרי שהסטטוס האמיתי נטען (כרגע רק
  // פייד טיים יכול להיות מוסתר), עוברים לטאב חלופי. לא מזיזים טאב שרק
  // disabled (לא visible=false) - למשתמשת מותר לבחור טאב חסום כדי לראות את
  // ההסבר, ראו RegistrationStepNotice.
  useEffect(
    function () {
      var currentTabAvailability = availability[activeTab];

      if (!currentTabAvailability || !currentTabAvailability.isVisible) {
        setActiveTab(resolveFallbackTab(availability));
      }
    },
    [availability, activeTab],
  );

  // useFocusEffect also fires once immediately on initial mount (the screen
  // is already focused by then), on top of the hook's own internal
  // mount/param-change effect - without this guard that's a duplicate fetch
  // every time reloadRegistrationStepStatus gets a new identity (mount, or a
  // competitionId/ranchId change). This ref remembers the last reload
  // identity already triggered elsewhere; a genuine re-focus (returning from
  // a child screen with the SAME identity) still calls reload exactly once.
  var lastTriggeredReloadRef = useRef(null);

  useFocusEffect(
    useCallback(
      function () {
        if (lastTriggeredReloadRef.current !== reloadRegistrationStepStatus) {
          lastTriggeredReloadRef.current = reloadRegistrationStepStatus;
          return;
        }

        reloadRegistrationStepStatus();
      },
      [reloadRegistrationStepStatus],
    ),
  );

  var registration = useAdminCompetitionRegistrations({
    user: user,
    activeRole: activeRole,
    competitionId: competitionId,
  });

  // CAP-1: this inline surface has no modal onClose - "dismissed and later
  // reopened" here means leaving this screen via navigation and coming back.
  // AppNavigator is one flat native-stack (no unmountOnBlur), so navigating
  // to a sibling competition screen (e.g. tapping "מקצים" in the menu) PUSHES
  // it on top and leaves this screen mounted-but-blurred underneath;
  // navigating back to "AdminCompetitionRegistrations" then POPS back to
  // that SAME still-mounted instance rather than remounting it - so without
  // this, a stale success banner/tally from before the user left would still
  // be showing on return. useFocusEffect's cleanup fires exactly on that
  // blur (leaving), which is the smallest existing lifecycle signal for
  // this surface's "dismiss" - and does NOT fire on local activeTab
  // switches (those are plain state, not a navigation focus/blur event), so
  // an in-progress create session survives switching between classes/
  // paidTimes/stalls/shavings. The callback is registered with a stable
  // (empty-deps) identity and reads the always-current reset function via a
  // ref, so it isn't torn down and re-armed by the very re-renders that
  // creating an entry causes (which would otherwise fire the "leaving"
  // cleanup while the user is still on this screen, mid-session).
  var resetCreationSummaryRef = useRef(registration.resetCreationSummary);

  useEffect(
    function () {
      resetCreationSummaryRef.current = registration.resetCreationSummary;
    },
    [registration.resetCreationSummary],
  );

  useFocusEffect(
    useCallback(function () {
      return function () {
        resetCreationSummaryRef.current();
      };
    }, []),
  );

  var paidTime = useAdminCompetitionPaidTimes({
    user: user,
    activeRole: activeRole,
    competitionId: competitionId,
    competitionName: activeCompetition ? activeCompetition.competitionName : "",
  });

  var stallBookings = useAdminCompetitionStallBookings({
    user: user,
    activeRole: activeRole,
    competitionId: competitionId,
    isActiveTab: activeTab === "stalls",
  });

  var shavings = useAdminCompetitionShavings({
    user: user,
    activeRole: activeRole,
    competitionId: competitionId,
    isActiveTab: activeTab === "shavings",
  });

  // מקור אמת יחיד לשתי נקודות הכניסה (SmartBookingFab וגם המעבר מ-
  // PaidTimeBookingModeModal עם openSmartBooking), וגם לטופס הבודד -
  // כולם דורשים בדיוק את אותם סלוטים ומחירים.
  var paidTimeAvailability = useMemo(
    function () {
      return evaluatePaidTimeBookingAvailability({
        requestableSlots: paidTime.requestableSlots,
        priceCatalogItems: paidTime.priceCatalogItems,
      });
    },
    [paidTime.requestableSlots, paidTime.priceCatalogItems],
  );

  var isPaidTimeDataReady = !paidTime.loading && !paidTime.screenError;

  useEffect(
    function () {
      if (!shouldAutoOpenChatbot || autoOpenHandledRef.current) {
        return;
      }

      if (!isPaidTimeDataReady || isRegistrationStatusLoading) {
        // Wait for the registration-step status to settle too, not just this
        // screen's own paid-time data - otherwise the one-shot "handled" flag
        // below could be consumed on the fail-closed default (isEnabled always
        // false while loading), permanently missing the deep-link auto-open
        // once the real status confirms it's actually eligible.
        return;
      }

      autoOpenHandledRef.current = true;

      if (
        BULK_PAID_TIME_ENTRY_ENABLED &&
        availability.paidTimes.isEnabled &&
        paidTimeAvailability.canBookBulk
      ) {
        setIsChatbotOpen(true);
      }
    },
    [
      shouldAutoOpenChatbot,
      isPaidTimeDataReady,
      isRegistrationStatusLoading,
      availability.paidTimes.isEnabled,
      paidTimeAvailability.canBookBulk,
    ],
  );

  // Force-closes an already-open chatbot/review flow the moment Paid Time
  // becomes disabled or read-only (e.g. the competition ends, or the status
  // reloads with different data) - a still-open modal must not remain a live
  // mutation path just because it was opened before eligibility changed.
  useEffect(
    function () {
      if (availability.paidTimes.isEnabled) {
        return;
      }

      if (isChatbotOpen) {
        setIsChatbotOpen(false);
      }

      if (paidTime.isReviewOpen) {
        paidTime.handleBackToEdit();
      }
    },
    [availability.paidTimes.isEnabled, isChatbotOpen, paidTime.isReviewOpen, paidTime.handleBackToEdit],
  );

  function handleOpenSmartBooking() {
    if (
      !BULK_PAID_TIME_ENTRY_ENABLED ||
      !availability.paidTimes.isEnabled ||
      !paidTimeAvailability.canBookBulk
    ) {
      return;
    }

    setIsChatbotOpen(true);
  }

  function handleCompetitionMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  async function handleExitCompetition() {
    await competitionContext.clearCompetition();
    props.navigation.navigate("AdminCompetitionsBoard");
  }

  function handleScrollToOffset(offsetY) {
    var scrollView = contentScrollRef.current;

    if (!scrollView || typeof scrollView.scrollTo !== "function") {
      return;
    }

    scrollView.scrollTo({ y: Math.max(0, offsetY), animated: true });
  }

  // "בקשה נוספת" - סוגר את מצב ההצלחה ונשאר בטופס. השדות כבר אופסו לפי
  // לוגיקת הנעילה הקיימת, כך שרק מה שננעל נשמר.
  function handleAddAnotherPaidTime() {
    paidTime.handleCloseSuccess();
    handleScrollToOffset(0);
  }

  // "סיום" - חוזר למסך הפייד טיימים הקיים (מסלול מאומת ב-AppNavigator).
  function handleFinishPaidTime() {
    paidTime.handleCloseSuccess();
    props.navigation.navigate("AdminCompetitionPaidTimes");
  }

  return (
    <View style={{ flex: 1 }}>
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
        ref={contentScrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.screenContent}
      >
        {registrationStatusError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{registrationStatusError}</Text>

            <Pressable
              style={styles.primaryButton}
              onPress={reloadRegistrationStepStatus}
            >
              <Text style={styles.primaryButtonText}>נסה שוב</Text>
            </Pressable>
          </View>
        ) : null}

        <RegistrationsTabs
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          availability={availability}
        />

        {activeTab === "classes" ? (
          <>
            {!availability.classes.isEnabled ? (
              <RegistrationStepNotice
                message={buildRegistrationStepNoticeMessage(
                  availability.classes,
                )}
                isLoading={isRegistrationStatusLoading}
                containerStyle={styles.errorCard}
                textStyle={styles.errorText}
              />
            ) : null}

            <CompetitionRegistrationsClassesTab
              loading={registration.loading}
              screenError={registration.screenError}
              classes={registration.classes}
              horses={registration.horses}
              horsesLoading={registration.horsesLoading}
              onSearchHorses={registration.loadHorsesForPicker}
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
              canSubmit={registration.canSubmit && availability.classes.isEnabled}
              isSaving={registration.isSaving}
              onSubmit={registration.handleCreateEntry}
              justCreated={registration.justCreated}
              createdCount={registration.createdCount}
            />
          </>
        ) : null}

        {activeTab === "paidTimes" && availability.paidTimes.isVisible ? (
          <>
            {!availability.paidTimes.isEnabled ? (
              <RegistrationStepNotice
                message={buildRegistrationStepNoticeMessage(
                  availability.paidTimes,
                )}
                isLoading={isRegistrationStatusLoading}
                containerStyle={styles.errorCard}
                textStyle={styles.errorText}
              />
            ) : null}

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
              formatRequestedSlotLabel={paidTime.formatRequestedSlotLabel}
              formatMemberLabel={paidTime.formatMemberLabel}
              formatHorseLabel={paidTime.formatHorseLabel}
              formatPayerLabel={paidTime.formatPayerLabel}
              canSubmit={paidTime.canSubmit && availability.paidTimes.isEnabled}
              isSaving={paidTime.isSaving}
              fieldErrors={paidTime.fieldErrors}
              formError={paidTime.formError}
              scrollRequest={paidTime.scrollRequest}
              onScrollToOffset={handleScrollToOffset}
              onContinueToReview={paidTime.handleContinueToReview}
              isReviewOpen={paidTime.isReviewOpen && availability.paidTimes.isEnabled}
              reviewModel={paidTime.reviewModel}
              submitError={paidTime.submitError}
              onBackToEdit={paidTime.handleBackToEdit}
              onConfirmSubmit={paidTime.handleConfirmSubmit}
              isSuccessOpen={paidTime.isSuccessOpen}
              successSnapshot={paidTime.successSnapshot}
              onAddAnother={handleAddAnotherPaidTime}
              onFinish={handleFinishPaidTime}
              availability={paidTimeAvailability}
            />
          </>
        ) : null}

        {activeTab === "stalls" ? (
          availability.stalls.isEnabled ? (
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
              minCompetitionDate={stallBookings.minCompetitionDate}
              maxCompetitionDate={stallBookings.maxCompetitionDate}
              highlightedCompetitionRange={
                stallBookings.highlightedCompetitionRange
              }
              startDate={stallBookings.startDate}
              setstartDate={stallBookings.setstartDate}
              endDate={stallBookings.endDate}
              setendDate={stallBookings.setendDate}
              notes={stallBookings.notes}
              setNotes={stallBookings.setNotes}
              selectedHorseBookings={stallBookings.selectedHorseBookings}
              availableHorseOptions={stallBookings.availableHorseOptions}
              bookedHorseIds={stallBookings.bookedHorseIds}
              orderedDates={stallBookings.orderedDates}
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
          ) : (
            <RegistrationStepNotice
              message={buildRegistrationStepNoticeMessage(
                availability.stalls,
              )}
              isLoading={isRegistrationStatusLoading}
              containerStyle={styles.errorCard}
              textStyle={styles.errorText}
              ctaLabel={
                availability.stalls.unavailableReason ===
                "NEEDS_RELEVANT_ENTRY"
                  ? "מעבר להוספת הרשמה"
                  : null
              }
              onCtaPress={
                availability.stalls.unavailableReason ===
                "NEEDS_RELEVANT_ENTRY"
                  ? function () {
                      setActiveTab("classes");
                    }
                  : null
              }
            />
          )
        ) : null}

        {activeTab === "shavings" ? (
          availability.shavings.isEnabled ? (
            <CompetitionShavingsTab
              loading={shavings.loading}
              screenError={shavings.screenError}
              availableStalls={shavings.availableStalls}
              existingOrders={shavings.existingOrders}
              priceCatalogItems={shavings.priceCatalogItems}
              selectedPriceCatalog={shavings.selectedPriceCatalog}
              setSelectedPriceCatalog={shavings.setSelectedPriceCatalog}
              deliveryMode={shavings.deliveryMode}
              setDeliveryMode={shavings.setDeliveryMode}
              deliveryDate={shavings.deliveryDate}
              setDeliveryDate={shavings.setDeliveryDate}
              deliveryTime={shavings.deliveryTime}
              setDeliveryTime={shavings.setDeliveryTime}
              earliestDeliveryDate={shavings.earliestDeliveryDate}
              isNowDeliveryAvailable={shavings.isNowDeliveryAvailable}
              quantityMode={shavings.quantityMode}
              setQuantityMode={shavings.setQuantityMode}
              equalBagQuantity={shavings.equalBagQuantity}
              setEqualBagQuantity={shavings.setEqualBagQuantity}
              selectedStalls={shavings.selectedStalls}
              selectedStallIds={shavings.selectedStallIds}
              toggleStallSelection={shavings.toggleStallSelection}
              setStallBagQuantity={shavings.setStallBagQuantity}
              notes={shavings.notes}
              setNotes={shavings.setNotes}
              totalBags={shavings.totalBags}
              totalPrice={shavings.totalPrice}
              getStallPrice={shavings.getStallPrice}
              isSaving={shavings.isSaving}
              onSubmit={shavings.handleCreateShavingsOrder}
              formatStallLabel={shavings.formatStallLabel}
              formatPriceCatalogLabel={shavings.formatPriceCatalogLabel}
            />
          ) : (
            <RegistrationStepNotice
              message={buildRegistrationStepNoticeMessage(
                availability.shavings,
              )}
              isLoading={isRegistrationStatusLoading}
              containerStyle={styles.errorCard}
              textStyle={styles.errorText}
              ctaLabel={
                availability.shavings.unavailableReason ===
                "NEEDS_RELEVANT_STALL_BOOKING"
                  ? "מעבר להזמנת תא"
                  : null
              }
              onCtaPress={
                availability.shavings.unavailableReason ===
                "NEEDS_RELEVANT_STALL_BOOKING"
                  ? function () {
                      setActiveTab("stalls");
                    }
                  : null
              }
            />
          )
        ) : null}
      </ScrollView>

      <PaidTimeChatbotModal
        visible={isChatbotOpen && availability.paidTimes.isEnabled}
        ranchId={activeRole?.ranchId}
        competitionId={competitionId}
        roleId={activeRole?.roleId}
        onClose={function () {
          setIsChatbotOpen(false);
        }}
      />
    </MobileScreenLayout>

      {/*
        הכפתור הצף מוסתר כשאין הגדרות פייד טיים, כדי שלא יהיה כפתור שלא
        עושה כלום. ההסבר עצמו מוצג בתוך הטאב דרך PaidTimeSetupNotice.
      */}
      {activeTab === "paidTimes" &&
      availability.paidTimes.isEnabled &&
      BULK_PAID_TIME_ENTRY_ENABLED &&
      paidTimeAvailability.canBookBulk ? (
        <SmartBookingFab onConfirm={handleOpenSmartBooking} />
      ) : null}
    </View>
  );
}
