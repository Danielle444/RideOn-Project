import React, { useEffect, useRef } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CompetitionRegistrationDropdown from "./CompetitionRegistrationDropdown";
import {
  buildSlotSummary,
  buildTypeSummary,
  getFieldSection,
} from "../../utils/paidTimeRequestForm";
import styles from "../../styles/adminCompetitionPaidTimesStyles";

var SLOT_EXPLANATION =
  "הסלוט שנבחר הוא הסלוט המבוקש. השעה המדויקת תיקבע לאחר השיבוץ.";

var LOCK_EXPLANATION = "שמירת בחירה לבקשה הבאה - הנעילה שומרת את הערך גם אחרי שליחה.";

function LockButton(props) {
  return (
    <Pressable
      onPress={props.onPress}
      hitSlop={8}
      style={styles.inlineLockIconButton}
      accessibilityRole="button"
      accessibilityLabel={
        props.isLocked ? "ביטול שמירת הבחירה" : "שמירת הבחירה לבקשה הבאה"
      }
    >
      <Ionicons
        name={props.isLocked ? "lock-closed-outline" : "lock-open-outline"}
        size={18}
        color="#7B5A4D"
      />
    </Pressable>
  );
}

function FieldError(props) {
  if (!props.message) {
    return null;
  }

  return <Text style={styles.fieldErrorText}>{props.message}</Text>;
}

function SummaryRow(props) {
  if (!props.value) {
    return null;
  }

  return (
    <View style={styles.selectionSummaryRow}>
      <Text style={styles.selectionSummaryLabel}>{props.label}</Text>
      <Text style={styles.selectionSummaryValue}>{props.value}</Text>
    </View>
  );
}

// טופס בקשת פייד טיים בודדת - מסך אחד, מחולק לסקשנים: מתי / סוג פייד־טיים /
// פרטי הבקשה / הערות. כל השדות, מקורות הנתונים והתנהגות הנעילה נשארו כפי
// שהיו; רק הסידור, ההסברים והצגת השגיאות השתנו.
export default function CompetitionPaidTimeFormCard(props) {
  var cardOffsetRef = useRef(0);
  var sectionOffsetsRef = useRef({});

  var fieldErrors = props.fieldErrors || {};
  var scrollRequest = props.scrollRequest || null;
  var onScrollToOffset = props.onScrollToOffset;

  var slotSummary = buildSlotSummary(props.selectedRequestedSlot);
  var typeSummary = buildTypeSummary(props.selectedPriceCatalog);
  var priceCatalogItems = Array.isArray(props.priceCatalogItems)
    ? props.priceCatalogItems
    : [];

  // גלילה לסקשן הראשון שנכשל בוולידציה. המדידה נעשית עם onLayout הרגיל של
  // React Native - בלי ספרייה נוספת. אם משום מה אין מידע מדידה, פשוט לא
  // גוללים, והשגיאות עדיין מוצגות מתחת לשדות.
  useEffect(
    function () {
      if (!scrollRequest || !scrollRequest.fieldKey) {
        return;
      }

      if (typeof onScrollToOffset !== "function") {
        return;
      }

      var sectionKey = getFieldSection(scrollRequest.fieldKey);
      var sectionOffset = sectionOffsetsRef.current[sectionKey];

      if (typeof sectionOffset !== "number") {
        return;
      }

      onScrollToOffset(cardOffsetRef.current + sectionOffset - 12);
    },
    // token משתנה בכל ניסיון שליחה כושל, כך שגם אותו שדה פעמיים ברצף גולל שוב.
    [scrollRequest ? scrollRequest.token : null],
  );

  function handleCardLayout(event) {
    cardOffsetRef.current = event.nativeEvent.layout.y;
  }

  function buildSectionLayoutHandler(sectionKey) {
    return function (event) {
      sectionOffsetsRef.current[sectionKey] = event.nativeEvent.layout.y;
    };
  }

  function handleSelectPriceCatalog(item) {
    props.setSelectedPriceCatalog(item);
  }

  return (
    <View style={styles.formCard} onLayout={handleCardLayout}>
      <Text style={styles.cardTitle}>פרטי בקשת פייד טיים</Text>

      <View style={styles.lockHintRow}>
        <Ionicons name="lock-closed-outline" size={16} color="#7B5A4D" />
        <Text style={styles.lockHintText}>{LOCK_EXPLANATION}</Text>
      </View>

      {/* ------------------------------- מתי ------------------------------- */}
      <View
        style={[styles.formSection, styles.formSectionFirst]}
        onLayout={buildSectionLayoutHandler("when")}
      >
        <View style={styles.formSectionHeaderRow}>
          <Text style={styles.formSectionTitle}>מתי</Text>
        </View>

        <CompetitionRegistrationDropdown
          label="סלוט מבוקש"
          placeholder="בחרי סלוט מבוקש"
          searchPlaceholder="חיפוש סלוט"
          items={props.requestableSlots}
          selectedItem={props.selectedRequestedSlot}
          getItemId={function (item) {
            return item.paidTimeSlotInCompId;
          }}
          getItemLabel={props.formatRequestedSlotLabel}
          onSelect={props.setSelectedRequestedSlot}
          isLocked={props.locks.requestedSlot}
          onToggleLock={function () {
            props.onToggleLock("requestedSlot");
          }}
        />

        <FieldError message={fieldErrors.requestedSlot} />

        {slotSummary ? (
          <View style={styles.selectionSummaryCard}>
            <SummaryRow label="תאריך" value={slotSummary.dateLabel} />
            <SummaryRow label="שעות" value={slotSummary.timeLabel} />
            <SummaryRow label="מגרש" value={slotSummary.arenaName} />
          </View>
        ) : null}

        <View style={styles.infoNote}>
          <Text style={styles.infoNoteText}>{SLOT_EXPLANATION}</Text>
        </View>
      </View>

      {/* --------------------------- סוג פייד־טיים -------------------------- */}
      <View
        style={styles.formSection}
        onLayout={buildSectionLayoutHandler("type")}
      >
        <View style={styles.formSectionHeaderRow}>
          <Text style={styles.formSectionTitle}>סוג פייד־טיים</Text>

          <LockButton
            isLocked={props.locks.priceCatalog}
            onPress={function () {
              props.onToggleLock("priceCatalog");
            }}
          />
        </View>

        {priceCatalogItems.length === 0 ? (
          <Text style={styles.formSectionHint}>
            לא הוגדרו סוגי פייד טיים לתחרות הזו.
          </Text>
        ) : (
          <View style={styles.typeCardsWrap}>
            {priceCatalogItems.map(function (item, index) {
              var summary = buildTypeSummary(item);
              var isSelected =
                !!props.selectedPriceCatalog &&
                props.selectedPriceCatalog.priceCatalogId === item.priceCatalogId;

              return (
                <Pressable
                  key={"price-" + String(item.priceCatalogId || index)}
                  style={[
                    styles.typeCard,
                    isSelected ? styles.typeCardActive : null,
                  ]}
                  onPress={function () {
                    handleSelectPriceCatalog(item);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={summary.productName}
                >
                  <Ionicons
                    name={isSelected ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={isSelected ? "#7B5A4D" : "#B9A396"}
                  />

                  <View style={styles.typeCardTextWrap}>
                    <Text style={styles.typeCardName}>
                      {summary.productName}
                    </Text>

                    {summary.durationLabel ? (
                      <Text style={styles.typeCardMeta}>
                        {summary.durationLabel}
                      </Text>
                    ) : null}
                  </View>

                  {summary.priceLabel ? (
                    <Text style={styles.typeCardPrice}>
                      {summary.priceLabel}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}

        <FieldError message={fieldErrors.priceCatalog} />

        {typeSummary && typeSummary.priceLabel ? (
          <View style={styles.infoNote}>
            <Text style={styles.infoNoteStrong}>
              מחיר לבקשה: {typeSummary.priceLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {/* --------------------------- פרטי הבקשה ---------------------------- */}
      <View
        style={styles.formSection}
        onLayout={buildSectionLayoutHandler("details")}
      >
        <View style={styles.formSectionHeaderRow}>
          <Text style={styles.formSectionTitle}>פרטי הבקשה</Text>
        </View>

        <View style={styles.fieldBlock}>
          <CompetitionRegistrationDropdown
            label="סוס"
            placeholder="בחרי סוס"
            searchPlaceholder="חיפוש סוס"
            items={props.horses}
            selectedItem={props.selectedHorse}
            getItemId={function (item) {
              return item.horseId;
            }}
            getItemLabel={props.formatHorseLabel}
            onSelect={props.setSelectedHorse}
            isLocked={props.locks.horse}
            onToggleLock={function () {
              props.onToggleLock("horse");
            }}
          />

          <FieldError message={fieldErrors.horse} />
        </View>

        <View style={styles.fieldBlock}>
          <CompetitionRegistrationDropdown
            label="רוכב"
            placeholder="בחרי רוכב"
            searchPlaceholder="חיפוש רוכב"
            items={props.riders}
            selectedItem={props.selectedRider}
            getItemId={function (item) {
              return item.federationMemberId;
            }}
            getItemLabel={props.formatMemberLabel}
            onSelect={props.setSelectedRider}
            isLocked={props.locks.rider}
            onToggleLock={function () {
              props.onToggleLock("rider");
            }}
          />

          <FieldError message={fieldErrors.rider} />
        </View>

        <View style={styles.fieldBlock}>
          <CompetitionRegistrationDropdown
            label="מאמן"
            placeholder="בחרי מאמן"
            searchPlaceholder="חיפוש מאמן"
            items={props.trainers}
            selectedItem={props.selectedTrainer}
            getItemId={function (item) {
              return item.federationMemberId;
            }}
            getItemLabel={props.formatMemberLabel}
            onSelect={props.setSelectedTrainer}
            isLocked={props.locks.coach}
            onToggleLock={function () {
              props.onToggleLock("coach");
            }}
          />

          <FieldError message={fieldErrors.coach} />
        </View>

        <View style={styles.fieldBlock}>
          <CompetitionRegistrationDropdown
            label="משלם"
            placeholder="בחרי משלם"
            searchPlaceholder="חיפוש משלם"
            items={props.payers}
            selectedItem={props.selectedPayer}
            getItemId={function (item) {
              return item.personId;
            }}
            getItemLabel={props.formatPayerLabel}
            onSelect={props.setSelectedPayer}
            isLocked={props.locks.payer}
            onToggleLock={function () {
              props.onToggleLock("payer");
            }}
          />

          <FieldError message={fieldErrors.payer} />
        </View>
      </View>

      {/* ------------------------------ הערות ------------------------------ */}
      <View
        style={styles.formSection}
        onLayout={buildSectionLayoutHandler("notes")}
      >
        <View style={styles.formSectionHeaderRow}>
          <Text style={styles.formSectionTitle}>הערות</Text>

          <LockButton
            isLocked={props.locks.notes}
            onPress={function () {
              props.onToggleLock("notes");
            }}
          />
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>הערות / אילוצים</Text>

          <TextInput
            value={props.notes}
            onChangeText={props.setNotes}
            placeholder="אפשר להוסיף בקשות מיוחדות או אילוצים"
            placeholderTextColor="#9E8A7F"
            style={[styles.textInput, styles.notesInput]}
            textAlign="right"
            multiline={true}
          />

          <Text style={styles.formSectionHint}>שדה רשות.</Text>
        </View>
      </View>
    </View>
  );
}
