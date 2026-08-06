import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CompetitionRegistrationDropdown from "./CompetitionRegistrationDropdown";
import {
  buildSlotSummary,
  buildTypeSummary,
  getFieldSection,
  getHebrewDateLabel,
  formatDisplayTime,
} from "../../utils/paidTimeRequestForm";
import {
  getUniqueOrderedValues,
  getBucketLabel,
} from "../../utils/paidTimeSlotCascade";
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

  // זוכר את מזהה הסלוט שהרזולוציה האוטומטית (האפקט שלמטה) בחרה לאחרונה, כדי
  // להבחין בין "המשתמשת מנקה את המדרג" לבין "הסלוט אופס מבחוץ" - ראו ההסבר
  // המלא ליד אותו אפקט (הגנת ה-החייאה שמונעת את לולאת ה-Maximum update depth).
  var lastAutoResolvedSlotIdRef = useRef(null);

  var fieldErrors = props.fieldErrors || {};
  var scrollRequest = props.scrollRequest || null;
  var onScrollToOffset = props.onScrollToOffset;

  var slotSummary = buildSlotSummary(props.selectedRequestedSlot);
  var typeSummary = buildTypeSummary(props.selectedPriceCatalog);
  var priceCatalogItems = Array.isArray(props.priceCatalogItems)
    ? props.priceCatalogItems
    : [];

  var requestableSlots = Array.isArray(props.requestableSlots)
    ? props.requestableSlots
    : [];

  var [cascadeDate, setCascadeDate] = useState(null);
  var [cascadeTimeOfDay, setCascadeTimeOfDay] = useState(null);
  var [cascadeArenaName, setCascadeArenaName] = useState(null);

  // מיישרים את שלבי המדרג עם הסלוט שנבחר בפועל - כשנפתחת נעילה משלב קודם,
  // כשמתחילים בקשה נוספת (איפוס), וכשמגיעים לטופס עם ערך כבר קיים.
  useEffect(
    function () {
      var selected = props.selectedRequestedSlot;

      setCascadeDate(selected ? selected.slotDate || null : null);
      setCascadeTimeOfDay(selected ? selected.timeOfDay || null : null);
      setCascadeArenaName(
        selected && selected.arenaName !== undefined
          ? selected.arenaName
          : null,
      );
    },
    [props.selectedRequestedSlot],
  );

  var slotDateOptions = useMemo(
    function () {
      return getUniqueOrderedValues(requestableSlots, function (item) {
        return item.slotDate;
      });
    },
    [requestableSlots],
  );

  var slotsForSelectedDate = useMemo(
    function () {
      if (cascadeDate === null) {
        return [];
      }

      return requestableSlots.filter(function (item) {
        return item.slotDate === cascadeDate;
      });
    },
    [requestableSlots, cascadeDate],
  );

  var timeOfDayOptionsForDate = useMemo(
    function () {
      return getUniqueOrderedValues(slotsForSelectedDate, function (item) {
        return item.timeOfDay;
      });
    },
    [slotsForSelectedDate],
  );

  var needsTimeOfDayStep = !(
    timeOfDayOptionsForDate.length === 0 ||
    (timeOfDayOptionsForDate.length === 1 && timeOfDayOptionsForDate[0] === "")
  );

  var isTimeOfDayResolved = !needsTimeOfDayStep || cascadeTimeOfDay !== null;

  var slotsForSelectedDateAndTime = useMemo(
    function () {
      if (!isTimeOfDayResolved) {
        return [];
      }

      if (!needsTimeOfDayStep) {
        return slotsForSelectedDate;
      }

      return slotsForSelectedDate.filter(function (item) {
        return (item.timeOfDay || "") === cascadeTimeOfDay;
      });
    },
    [
      slotsForSelectedDate,
      needsTimeOfDayStep,
      isTimeOfDayResolved,
      cascadeTimeOfDay,
    ],
  );

  var arenaNameOptions = useMemo(
    function () {
      return getUniqueOrderedValues(
        slotsForSelectedDateAndTime,
        function (item) {
          return item.arenaName;
        },
      );
    },
    [slotsForSelectedDateAndTime],
  );

  var slotsForFullSelection = useMemo(
    function () {
      if (cascadeArenaName === null) {
        return [];
      }

      return slotsForSelectedDateAndTime.filter(function (item) {
        return (item.arenaName || "") === cascadeArenaName;
      });
    },
    [slotsForSelectedDateAndTime, cascadeArenaName],
  );

  var needsFinalDisambiguation = slotsForFullSelection.length > 1;

  // רזולוציה אוטומטית: ברגע שהמדרג מוביל לסלוט יחיד, זה הסלוט שנבחר בפועל.
  // אם המדרג עדיין לא חד-משמעי (0 או יותר מ-1 אחרי הבחירה המלאה), לא נשלח
  // סלוט לא ודאי - השדה נשאר ריק עד לבחירה נוספת בשלב הניקוי הסופי.
  //
  // הגנת "החייאה" (lastAutoResolvedSlotIdRef): האפקט הזה (מדרג ← סלוט) והאפקט
  // שלמעלה (סלוט ← מדרג) יוצרים טבעת דו-כיוונית עם פיגור של commit אחד. כשהסלוט
  // מתאפס מבחוץ - האיפוס של השדות הלא-נעולים אחרי שליחה מוצלחת - בזמן שהמדרג
  // עדיין מצביע על אותו סלוט (למשל המגרש עדיין "B2W"), שני האפקטים קופצים אחד
  // מעל השני בכל רינדור: האפקט הזה "מחייה" את הסלוט מ-null חזרה ל-S כי הוא קורא
  // מדרג ישן, והאפקט שלמעלה מנקה את המדרג ל-null כי הסלוט התאפס - וחוזר חלילה,
  // עד ש-React זורק "Maximum update depth exceeded". לכן: אם המדרג עדיין מוביל
  // בדיוק לסלוט שהאפקט הזה בחר לאחרונה אבל הסלוט כרגע ריק, זו הייתה נקייה
  // מכוונת מבחוץ - לא מחזירים אותו, ונותנים לאפקט המדרג לסיים את הניקוי.
  useEffect(
    function () {
      if (needsFinalDisambiguation) {
        return;
      }

      var resolvedSlot =
        slotsForFullSelection.length === 1 ? slotsForFullSelection[0] : null;

      var currentSlotId = props.selectedRequestedSlot
        ? props.selectedRequestedSlot.paidTimeSlotInCompId
        : null;

      var resolvedSlotId = resolvedSlot
        ? resolvedSlot.paidTimeSlotInCompId
        : null;

      if (currentSlotId === resolvedSlotId) {
        // כבר מסונכרן (כולל שניהם ריקים) - מעדכנים את הזיכרון ולא כותבים שוב.
        lastAutoResolvedSlotIdRef.current = resolvedSlotId;
        return;
      }

      if (
        currentSlotId === null &&
        resolvedSlotId !== null &&
        resolvedSlotId === lastAutoResolvedSlotIdRef.current
      ) {
        // הסלוט נוקה מבחוץ (איפוס אחרי שליחה) והמדרג עדיין תקוע על הערך הישן -
        // לא מחייים אותו, אחרת נכנסים ללולאה אינסופית מול אפקט המדרג שלמעלה.
        return;
      }

      props.setSelectedRequestedSlot(resolvedSlot);
      lastAutoResolvedSlotIdRef.current = resolvedSlotId;
    },
    [slotsForFullSelection, needsFinalDisambiguation, props.selectedRequestedSlot],
  );

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
          label="תאריך מבוקש"
          placeholder="בחירת תאריך מבוקש"
          searchPlaceholder="חיפוש תאריך"
          items={slotDateOptions}
          selectedItem={cascadeDate}
          getItemId={function (item) {
            return item;
          }}
          getItemLabel={function (item) {
            return getHebrewDateLabel(item);
          }}
          onSelect={function (item) {
            setCascadeDate(item);
            setCascadeTimeOfDay(null);
            setCascadeArenaName(null);
          }}
          isLocked={props.locks.requestedSlot}
          onToggleLock={function () {
            props.onToggleLock("requestedSlot");
          }}
        />

        {cascadeDate !== null && needsTimeOfDayStep ? (
          <CompetitionRegistrationDropdown
            label="חלק יום"
            placeholder="בחירת חלק יום"
            searchPlaceholder="חיפוש חלק יום"
            items={timeOfDayOptionsForDate}
            selectedItem={cascadeTimeOfDay}
            getItemId={function (item) {
              return item;
            }}
            getItemLabel={function (item) {
              return getBucketLabel(item, "ללא הגדרת חלק יום");
            }}
            onSelect={function (item) {
              setCascadeTimeOfDay(item);
              setCascadeArenaName(null);
            }}
            isLocked={props.locks.requestedSlot}
            onToggleLock={function () {
              props.onToggleLock("requestedSlot");
            }}
          />
        ) : null}

        {cascadeDate !== null && isTimeOfDayResolved ? (
          <CompetitionRegistrationDropdown
            label="מגרש"
            placeholder="בחירת מגרש"
            searchPlaceholder="חיפוש מגרש"
            items={arenaNameOptions}
            selectedItem={cascadeArenaName}
            getItemId={function (item) {
              return item;
            }}
            getItemLabel={function (item) {
              return getBucketLabel(item, "ללא מגרש מוגדר");
            }}
            onSelect={function (item) {
              setCascadeArenaName(item);
            }}
            isLocked={props.locks.requestedSlot}
            onToggleLock={function () {
              props.onToggleLock("requestedSlot");
            }}
          />
        ) : null}

        {needsFinalDisambiguation ? (
          <CompetitionRegistrationDropdown
            label="שעת התחלה מדויקת"
            placeholder="בחירת שעה"
            searchPlaceholder="חיפוש שעה"
            items={slotsForFullSelection}
            selectedItem={props.selectedRequestedSlot}
            getItemId={function (item) {
              return item.paidTimeSlotInCompId;
            }}
            getItemLabel={function (item) {
              return [
                formatDisplayTime(item.startTime),
                formatDisplayTime(item.endTime),
              ]
                .filter(Boolean)
                .join(" - ");
            }}
            onSelect={props.setSelectedRequestedSlot}
            isLocked={props.locks.requestedSlot}
            onToggleLock={function () {
              props.onToggleLock("requestedSlot");
            }}
          />
        ) : null}

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
            disabled={props.payerFieldDisabled}
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
