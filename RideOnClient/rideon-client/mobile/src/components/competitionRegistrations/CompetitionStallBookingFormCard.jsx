import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import CompetitionRegistrationDropdown from "../competitions/CompetitionRegistrationDropdown";
import CompetitionHorsePayersEditor from "./CompetitionHorsePayersEditor";
import CompetitionDateField from "./CompetitionDateField";
import styles from "../../styles/adminCompetitionPaidTimesStyles";

export default function CompetitionStallBookingFormCard(props) {
  var hasSingleHorseStallType =
    Array.isArray(props.horseStallTypeOptions) &&
    props.horseStallTypeOptions.length === 1;

  var isDateRangeInvalid =
    !!props.startDate && !!props.endDate && props.endDate < props.startDate;

  function handleSubmitPress() {
    if (isDateRangeInvalid) {
      return;
    }

    props.onSubmit();
  }

  return (
    <View style={styles.formCard}>
      <Text style={styles.cardTitle}>הזמנת תאי סוסים</Text>

      <View style={styles.helperCard}>
        <Text style={styles.helperText}>
          לפי המשלמים המוגדרים לכל סוס בשלב המקצים, במידת הצורך ניתן לערוך את
          המשלמים על כל תא.
        </Text>
      </View>

      {hasSingleHorseStallType ? (
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>סוג תא</Text>
          <View style={styles.textInput}>
            <Text
              style={{
                textAlign: "right",
                color: "#4F3B31",
                fontSize: 14,
              }}
            >
              {props.formatStallTypeLabel(props.horseStallTypeOptions[0])}
            </Text>
          </View>
        </View>
      ) : (
        <CompetitionRegistrationDropdown
          label="סוג תא"
          placeholder="בחירת סוג תא"
          searchPlaceholder="חיפוש סוג תא"
          items={props.horseStallTypeOptions}
          selectedItem={props.selectedHorseStallType}
          getItemId={function (item) {
            return item.priceCatalogId;
          }}
          getItemLabel={props.formatStallTypeLabel}
          onSelect={props.setSelectedHorseStallType}
        />
      )}

      <CompetitionDateField
        label="תאריך כניסה"
        value={props.startDate}
        onChange={props.setstartDate}
        minimumDate={props.minCompetitionDate}
        maximumDate={props.maxCompetitionDate}
        highlightedRange={props.highlightedCompetitionRange}
      />

      <CompetitionDateField
        label="תאריך יציאה"
        value={props.endDate}
        onChange={props.setendDate}
        minimumDate={props.minCompetitionDate}
        maximumDate={props.maxCompetitionDate}
        highlightedRange={props.highlightedCompetitionRange}
      />

      {isDateRangeInvalid ? (
        <Text style={styles.errorText}>
          תאריך יציאה לא יכול להיות לפני תאריך כניסה
        </Text>
      ) : null}

      {props.allEligibleHorsesAlreadyBooked ? (
        <View style={styles.helperCard}>
          <Text style={styles.helperText}>
            לכל הסוסים שרשומים למקצים כבר הוזמן תא בתחרות הזו.
          </Text>
        </View>
      ) : (
        <CompetitionRegistrationDropdown
          label="הוספת סוס"
          placeholder="בחירת סוס"
          searchPlaceholder="חיפוש סוס"
          items={props.availableHorseOptions}
          selectedItem={props.selectedHorseToAdd}
          getItemId={function (item) {
            return item.horseId;
          }}
          getItemLabel={props.formatHorseLabel}
          onSelect={props.setSelectedHorseToAdd}
        />
      )}

      <View style={styles.fieldBlock}>
        {props.selectedHorseBookings.length > 0 ? (
          props.selectedHorseBookings.map(function (booking) {
            return (
              <CompetitionHorsePayersEditor
                key={String(booking.horse.horseId)}
                horse={booking.horse}
                payers={props.getAvailablePayersForHorse(booking.horse.horseId)}
                selectedPayers={booking.payers}
                onTogglePayer={props.toggleHorsePayerSelection}
                onRemoveHorse={props.handleRemoveHorseBooking}
                onToggleEditor={props.toggleHorseEditor}
                isExpanded={
                  props.expandedHorseEditorId === booking.horse.horseId
                }
                formatHorseLabel={props.formatHorseLabel}
                formatPayerLabel={props.formatPayerLabel}
              />
            );
          })
        ) : props.allEligibleHorsesAlreadyBooked ? null : (
          <View style={styles.helperCard}>
            <Text style={styles.helperText}>עדיין לא נוספו סוסים</Text>
          </View>
        )}
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>הערות</Text>
        <TextInput
          value={props.notes}
          onChangeText={props.setNotes}
          placeholder="הערות להזמנה"
          style={[styles.textInput, styles.notesInput]}
          multiline
          textAlign="right"
        />
      </View>

      {props.bookedHorseNamesSummary ? (
        <View style={styles.helperCard}>
          <Text style={styles.helperText}>
            הוזמנו תאים ל: {props.bookedHorseNamesSummary}
          </Text>
        </View>
      ) : null}

      <Pressable
        style={[
          styles.primaryButton,
          props.isSaving || isDateRangeInvalid
            ? styles.primaryButtonDisabled
            : null,
        ]}
        onPress={handleSubmitPress}
        disabled={props.isSaving || isDateRangeInvalid}
      >
        {props.isSaving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>שמירת תאי סוסים</Text>
        )}
      </Pressable>

      {props.hasAnyHorseStallBookingsForCompetition ? (
        <Pressable
          style={[
            styles.primaryButton,
            { backgroundColor: "#5E7A74" },
            props.isSaving ? styles.primaryButtonDisabled : null,
          ]}
          onPress={props.onOpenTackMode}
          disabled={props.isSaving}
        >
          <Text style={styles.primaryButtonText}>מעבר להזמנת תאי ציוד</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
