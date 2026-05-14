import React, { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
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

import { getCompetitionInvitationDetails } from "../../services/competitionService";

import { createStallBookingChangeRequest } from "../../services/stallBookingsService";

import CompetitionDateField from "../competitionRegistrations/CompetitionDateField";

import styles from "../../styles/adminCompetitionStallsStyles";

function normalizePriceCatalogItem(item, categoryName) {
  if (!item) {
    return null;
  }

  return {
    priceCatalogId: item.priceCatalogId || item.PriceCatalogId || null,
    productId: item.productId || item.ProductId || null,
    itemPrice: Number(item.itemPrice || item.ItemPrice || 0),
    productName: item.productName || item.ProductName || "",
    categoryName: categoryName || "",
  };
}

function extractStallPriceItems(invitationResponse, isTackBooking) {
  var sections = Array.isArray(invitationResponse?.data?.servicePriceSections)
    ? invitationResponse.data.servicePriceSections
    : [];

  var result = [];

  sections.forEach(function (section) {
    var categoryName = String(section?.categoryName || "").trim();
    var items = Array.isArray(section?.items) ? section.items : [];

    items.forEach(function (item) {
      var normalized = normalizePriceCatalogItem(item, categoryName);

      if (!normalized) {
        return;
      }

      var productName = String(normalized.productName || "").trim();
      var lowerProductName = productName.toLowerCase();
      var lowerCategoryName = categoryName.toLowerCase();

      var mentionsStall =
        categoryName.includes("תא") ||
        productName.includes("תא") ||
        lowerProductName.includes("stall") ||
        lowerCategoryName.includes("stall");

      var mentionsTack =
        categoryName.includes("ציוד") ||
        productName.includes("ציוד") ||
        lowerProductName.includes("tack") ||
        lowerCategoryName.includes("tack");

      if (isTackBooking && mentionsTack) {
        result.push(normalized);
      }

      if (!isTackBooking && mentionsStall && !mentionsTack) {
        result.push(normalized);
      }
    });
  });

  return result;
}

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

function formatPriceCatalogLabel(item) {
  if (!item) {
    return "";
  }

  var parts = [];

  if (item.productName) {
    parts.push(item.productName);
  }

  parts.push(formatPrice(item.itemPrice));

  return parts.join(" • ");
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

  var [loading, setLoading] = useState(false);
  var [isSaving, setIsSaving] = useState(false);
  var [screenError, setScreenError] = useState("");

  var [priceCatalogItems, setPriceCatalogItems] = useState([]);
  var [selectedPriceCatalog, setSelectedPriceCatalog] = useState(null);
  var [startDate, setStartDate] = useState("");
  var [endDate, setEndDate] = useState("");
  var [notes, setNotes] = useState("");

  var isTackBooking = item && item.isTackBooking === true;

  useEffect(
    function () {
      if (!props.visible || !item) {
        return;
      }

      setStartDate(normalizeDateForInput(item.startDate));
      setEndDate(normalizeDateForInput(item.endDate));
      setNotes(item.notes || "");
      setSelectedPriceCatalog(null);
      setPriceCatalogItems([]);
      setScreenError("");
    },
    [props.visible, item],
  );

  useEffect(
    function () {
      async function loadPrices() {
        if (!props.visible || !item || !activeRole || !activeRole.ranchId) {
          return;
        }

        if (!props.competitionId) {
          setScreenError("לא נמצאה תחרות פעילה");
          return;
        }

        try {
          setLoading(true);
          setScreenError("");

          var response = await getCompetitionInvitationDetails(
            props.competitionId,
            activeRole.roleId,
            activeRole.ranchId,
          );

          var prices = extractStallPriceItems(response, isTackBooking);

          setPriceCatalogItems(prices);

          var currentPrice = prices.find(function (priceItem) {
            return (
              Number(priceItem.priceCatalogId) === Number(item.priceCatalogId)
            );
          });

          if (currentPrice) {
            setSelectedPriceCatalog(currentPrice);
          } else if (prices.length === 1) {
            setSelectedPriceCatalog(prices[0]);
          }
        } catch (error) {
          setScreenError(
            String(error?.response?.data || "אירעה שגיאה בטעינת סוגי התאים"),
          );
        } finally {
          setLoading(false);
        }
      }

      loadPrices();
    },
    [props.visible, props.competitionId, item, activeRole, isTackBooking],
  );

  var numberOfDays = useMemo(
    function () {
      return calculateNumberOfDays(startDate, endDate);
    },
    [startDate, endDate],
  );

  var estimatedAmount = useMemo(
    function () {
      return numberOfDays * Number(selectedPriceCatalog?.itemPrice || 0);
    },
    [numberOfDays, selectedPriceCatalog],
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

    if (!selectedPriceCatalog || !selectedPriceCatalog.priceCatalogId) {
      return "יש לבחור סוג תא";
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

      await createStallBookingChangeRequest({
        originalStallBookingId: item.stallBookingId,
        ranchId: activeRole.ranchId,
        newPriceCatalogId: selectedPriceCatalog.priceCatalogId,
        newStartDate: startDate,
        newEndDate: endDate,
        notes: notes ? notes.trim() : null,
      });

      if (typeof props.onUpdated === "function") {
        await props.onUpdated();
      }

      Alert.alert("נשלח", "בקשת שינוי התא נשלחה בהצלחה");

      if (typeof props.onClose === "function") {
        props.onClose();
      }
    } catch (error) {
      Alert.alert(
        "שגיאה",
        String(error?.response?.data || "אירעה שגיאה בשליחת בקשת שינוי התא"),
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

            <Text style={styles.editFormSubtitle}>
              השינוי יישלח לאישור מזכירת התחרות ולא יחייב את המשלמים עד אישור.
            </Text>

            {loading ? (
              <View style={styles.editLoadingWrap}>
                <ActivityIndicator size="small" color="#7B5A4D" />

                <Text style={styles.editHelperText}>טוען סוגי תאים...</Text>
              </View>
            ) : null}

            {screenError ? (
              <View style={styles.editErrorBox}>
                <Text style={styles.editErrorText}>{screenError}</Text>
              </View>
            ) : null}

            <View style={styles.editFieldBlock}>
              <Text style={styles.editFieldLabel}>סוג תא</Text>

              {priceCatalogItems.length === 0 && !loading ? (
                <Text style={styles.editHelperText}>
                  לא נמצאו סוגי תאים פעילים
                </Text>
              ) : null}

              {priceCatalogItems.map(function (priceItem) {
                var active =
                  selectedPriceCatalog &&
                  Number(selectedPriceCatalog.priceCatalogId) ===
                    Number(priceItem.priceCatalogId);

                return (
                  <Pressable
                    key={String(priceItem.priceCatalogId)}
                    style={[
                      styles.editOptionRow,
                      active ? styles.editOptionRowActive : null,
                    ]}
                    onPress={function () {
                      setSelectedPriceCatalog(priceItem);
                    }}
                  >
                    <Text
                      style={[
                        styles.editOptionText,
                        active ? styles.editOptionTextActive : null,
                      ]}
                    >
                      {active ? "✓ " : ""}
                      {formatPriceCatalogLabel(priceItem)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

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
                placeholder="הערות לבקשת השינוי"
                textAlign="right"
              />
            </View>

            <View style={styles.editSummaryBox}>
              <Text style={styles.editSummaryText}>
                מספר ימים: {numberOfDays}
              </Text>

              <Text style={styles.editSummaryText}>
                עלות משוערת: {formatPrice(estimatedAmount)}
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
                {isSaving ? "שולח..." : "שליחת בקשת שינוי"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}