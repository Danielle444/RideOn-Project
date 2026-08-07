import React, { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useActiveRole } from "../../context/ActiveRoleContext";

import { adminEditStallBooking } from "../../services/stallBookingsService";

import { getCompetitionInvitationDetails } from "../../services/competitionService";

import {
  getServicePriceSectionsFromInvitation,
  extractHorseStallPriceItems,
  extractTackStallPriceItems,
  formatStallTypeLabel,
} from "../../hooks/useAdminCompetitionStallBookings";

import CompetitionDateField from "../competitionRegistrations/CompetitionDateField";

import CompetitionRegistrationDropdown from "./CompetitionRegistrationDropdown";

import styles from "../../styles/adminCompetitionStallsStyles";

function normalizeDateForInput(value) {
  if (!value) {
    return "";
  }

  var text = String(value).trim();

  if (!text) {
    return "";
  }

  if (text.includes("T")) {
    return text.split("T")[0];
  }

  if (text.length >= 10) {
    return text.slice(0, 10);
  }

  return text;
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "₪0";
  }

  try {
    return "₪" + Number(value).toLocaleString("he-IL");
  } catch {
    return "₪" + String(value);
  }
}

function calculateNumberOfDays(startDate, endDate) {
  if (!startDate || !endDate) {
    return 1;
  }

  try {
    var start = new Date(startDate);
    var end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 1;
    }

    var diff = end.getTime() - start.getTime();
    var days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    return days > 0 ? days : 1;
  } catch {
    return 1;
  }
}

export default function StallBookingEditModal(props) {
  var activeRoleContext = useActiveRole();

  var activeRole = activeRoleContext.activeRole;

  var item = props.item;

  var [isSaving, setIsSaving] = useState(false);
  var [startDate, setStartDate] = useState("");
  var [endDate, setEndDate] = useState("");
  var [notes, setNotes] = useState("");

  // Admin-payer direct-changes feature: the type/product field is exposed
  // only while the booking is unassigned to a physical stall -- the server
  // (usp_admineditstallbooking) independently rejects a real product change
  // once stallassignment has a row for this booking, regardless of what the
  // client sends, so this is a convenience gate, not the enforcement point.
  var isAssigned = item && item.isAssigned === true;

  var [stallTypeOptions, setStallTypeOptions] = useState([]);
  var [selectedStallType, setSelectedStallType] = useState(null);
  var [loadingStallTypes, setLoadingStallTypes] = useState(false);

  var isTackBooking = item && item.isTackBooking === true;

  useEffect(
    function () {
      if (!props.visible || !item) {
        return;
      }

      setStartDate(normalizeDateForInput(item.startDate));
      setEndDate(normalizeDateForInput(item.endDate));
      setNotes(item.notes || "");
      setSelectedStallType(null);
      setStallTypeOptions([]);
    },
    [props.visible, item],
  );

  useEffect(
    function () {
      if (!props.visible || !item || isAssigned) {
        return;
      }

      if (!props.competitionId || !activeRole || !activeRole.ranchId) {
        return;
      }

      var isCurrent = true;

      async function loadStallTypeOptions() {
        try {
          setLoadingStallTypes(true);

          var invitationResponse = await getCompetitionInvitationDetails(
            props.competitionId,
            activeRole.roleId,
            activeRole.ranchId,
          );

          if (!isCurrent) {
            return;
          }

          var sections = Array.isArray(
            invitationResponse?.data?.servicePriceSections,
          )
            ? invitationResponse.data.servicePriceSections
            : getServicePriceSectionsFromInvitation(invitationResponse);

          var options = isTackBooking
            ? extractTackStallPriceItems(sections)
            : extractHorseStallPriceItems(sections);

          setStallTypeOptions(options);

          var currentOption = options.find(function (option) {
            return (
              option.priceCatalogId &&
              item.priceCatalogId &&
              Number(option.priceCatalogId) === Number(item.priceCatalogId)
            );
          });

          setSelectedStallType(currentOption || options[0] || null);
        } catch (error) {
          console.log("LOAD STALL TYPE OPTIONS ERROR", error);
        } finally {
          if (isCurrent) {
            setLoadingStallTypes(false);
          }
        }
      }

      loadStallTypeOptions();

      return function () {
        isCurrent = false;
      };
    },
    [props.visible, item, isAssigned, props.competitionId, activeRole, isTackBooking],
  );

  var numberOfDays = useMemo(
    function () {
      return calculateNumberOfDays(startDate, endDate);
    },
    [startDate, endDate],
  );

  var effectiveDailyPrice = useMemo(
    function () {
      if (!isAssigned && selectedStallType) {
        return Number(selectedStallType.itemPrice || 0);
      }

      return Number(item?.itemPrice || 0);
    },
    [isAssigned, selectedStallType, item],
  );

  var effectiveStallTypeName = useMemo(
    function () {
      if (isAssigned) {
        return item?.assignedProductName || (isTackBooking ? "תא ציוד" : "תא רגיל");
      }

      if (selectedStallType) {
        return selectedStallType.productName;
      }

      return isTackBooking ? "תא ציוד" : "תא רגיל";
    },
    [isAssigned, item, isTackBooking, selectedStallType],
  );

  var estimatedAmount = useMemo(
    function () {
      return numberOfDays * effectiveDailyPrice;
    },
    [numberOfDays, effectiveDailyPrice],
  );

  function validateForm() {
    if (!item || !item.stallBookingId) {
      return "לא נמצא מזהה הזמנת תא תקין";
    }

    if (item.isPaid) {
      return "לא ניתן לערוך תא שכבר שולם";
    }

    if (item.isCancelled || item.hasPendingCancellation) {
      return "לא ניתן לערוך תא עם בקשה פתוחה או תא שבוטל";
    }

    if (!activeRole || !activeRole.ranchId) {
      return "לא נמצאה חווה פעילה";
    }

    if (!startDate || !endDate) {
      return "יש לבחור תאריכי התחלה וסיום";
    }

    if (new Date(startDate) > new Date(endDate)) {
      return "תאריך התחלה לא יכול להיות אחרי תאריך סיום";
    }

    return "";
  }

  async function handleSubmit() {
    var validationMessage = validateForm();

    if (validationMessage) {
      Alert.alert("שגיאה", validationMessage);
      return;
    }

    try {
      setIsSaving(true);

      await adminEditStallBooking({
        stallBookingId: item.stallBookingId,
        ranchId: activeRole.ranchId,
        newStartDate: startDate,
        newEndDate: endDate,
        notes: notes ? notes.trim() : null,
        newProductId:
          !isAssigned && selectedStallType
            ? selectedStallType.productId
            : null,
      });

      if (typeof props.onUpdated === "function") {
        await props.onUpdated();
      }

      Alert.alert("עודכן", "הזמנת התא עודכנה בהצלחה");

      if (typeof props.onClose === "function") {
        props.onClose();
      }
    } catch (error) {
      Alert.alert(
        "שגיאה",
        String(error?.response?.data || "אירעה שגיאה בעדכון הזמנת התא"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={props.onClose}
    >
      <SafeAreaView style={styles.shavingsModalContainer}>
        <View style={styles.shavingsModalHeader}>
          <Pressable
            onPress={props.onClose}
            style={styles.shavingsModalCloseButton}
          >
            <Ionicons name="close-outline" size={28} color="#4F3B31" />
          </Pressable>

          <Text style={styles.shavingsModalTitle}>עריכת הזמנת תא</Text>

          <View style={styles.shavingsModalHeaderSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.shavingsModalContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.editFormCard}>
            <Text style={styles.editFormTitle}>
              {isTackBooking ? "תא ציוד" : item?.horseName || "תא סוס"}
            </Text>

            {isAssigned ? (
              <Text style={styles.editFormSubtitle}>
                אפשר לערוך תאריכים והערות בלבד. סוג התא והמחיר נקבעים לפי
                השיבוץ בפועל.
              </Text>
            ) : null}

            <View style={styles.editSummaryBox}>
              <Text style={styles.editSummaryText}>
                סוג תא: {effectiveStallTypeName}
              </Text>

              <Text style={styles.editSummaryText}>
                מחיר יומי: {formatPrice(effectiveDailyPrice)}
              </Text>
            </View>

            {!isAssigned ? (
              <View style={styles.editFieldBlock}>
                {loadingStallTypes ? (
                  <Text style={styles.editFieldLabel}>טוען סוגי תא...</Text>
                ) : (
                  <CompetitionRegistrationDropdown
                    label="סוג תא"
                    placeholder="בחירת סוג תא"
                    searchPlaceholder="חיפוש סוג תא"
                    items={stallTypeOptions}
                    selectedItem={selectedStallType}
                    getItemId={function (option) {
                      return option.priceCatalogId;
                    }}
                    getItemLabel={formatStallTypeLabel}
                    onSelect={setSelectedStallType}
                  />
                )}
              </View>
            ) : null}

            <View style={styles.editDateFields}>
              <CompetitionDateField
                label="תאריך התחלה"
                value={startDate}
                onChange={setStartDate}
              />

              <CompetitionDateField
                label="תאריך סיום"
                value={endDate}
                onChange={setEndDate}
              />
            </View>

            <View style={styles.editFieldBlock}>
              <Text style={styles.editFieldLabel}>הערות</Text>

              <TextInput
                style={styles.editTextInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="הערות להזמנה"
                textAlign="right"
              />
            </View>

            <View style={styles.editSummaryBox}>
              <Text style={styles.editSummaryText}>
                מספר ימים חדש: {numberOfDays}
              </Text>

              <Text style={styles.editSummaryText}>
                עלות תא משוערת: {formatPrice(estimatedAmount)}
              </Text>
            </View>

            <Pressable
              style={[
                styles.editSubmitButton,
                isSaving ? styles.editSubmitButtonDisabled : null,
              ]}
              disabled={isSaving}
              onPress={handleSubmit}
            >
              <Text style={styles.editSubmitButtonText}>
                {isSaving ? "שומר..." : "שמירת שינויים"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
