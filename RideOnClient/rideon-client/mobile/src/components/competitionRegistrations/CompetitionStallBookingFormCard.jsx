import React from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import CompetitionRegistrationDropdown from "../competitions/CompetitionRegistrationDropdown";
import CompetitionHorsePayersEditor from "./CompetitionHorsePayersEditor";
import CompetitionDateField from "./CompetitionDateField";
import styles from "../../styles/adminCompetitionPaidTimesStyles";

export default function CompetitionStallBookingFormCard(props) {
  return (
    <View style={styles.formCard}>
      <Text style={styles.cardTitle}>הזמנת תאי סוסים</Text>

      <View style={styles.helperCard}>
        <Text style={styles.helperText}>
          בחרי סוג תא, תאריכים וסוסים. המשלמים ייבחרו אוטומטית לפי המיקצים של כל סוס, ותוכלי לערוך אותם אם צריך.
        </Text>
      </View>

      <CompetitionRegistrationDropdown
        label="סוג תא"
        placeholder="בחרי סוג תא"
        searchPlaceholder="חיפוש סוג תא"
        items={props.horseStallTypeOptions}
        selectedItem={props.selectedHorseStallType}
        getItemId={function (item) {
          return item.priceCatalogId;
        }}
        getItemLabel={props.formatStallTypeLabel}
        onSelect={props.setSelectedHorseStallType}
      />

      <CompetitionDateField
        label="תאריך כניסה"
        value={props.checkInDate}
        onChange={props.setCheckInDate}
        minimumDate={props.minCompetitionDate}
        maximumDate={props.maxCompetitionDate}
      />

      <CompetitionDateField
        label="תאריך יציאה"
        value={props.checkOutDate}
        onChange={props.setCheckOutDate}
        minimumDate={props.minCompetitionDate}
        maximumDate={props.maxCompetitionDate}
      />

      <CompetitionRegistrationDropdown
        label="הוספת סוס"
        placeholder="בחרי סוס"
        searchPlaceholder="חיפוש סוס"
        items={props.availableHorseOptions}
        selectedItem={props.selectedHorseToAdd}
        getItemId={function (item) {
          return item.horseId;
        }}
        getItemLabel={props.formatHorseLabel}
        onSelect={props.setSelectedHorseToAdd}
      />

      <View style={styles.fieldBlock}>
        {props.selectedHorseBookings.length === 0 ? (
          <View style={styles.helperCard}>
            <Text style={styles.helperText}>עדיין לא נוספו סוסים</Text>
          </View>
        ) : (
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
                isExpanded={props.expandedHorseEditorId === booking.horse.horseId}
                formatHorseLabel={props.formatHorseLabel}
                formatPayerLabel={props.formatPayerLabel}
              />
            );
          })
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

      <Pressable
        style={[
          styles.primaryButton,
          props.isSaving ? styles.primaryButtonDisabled : null,
        ]}
        onPress={props.onSubmit}
        disabled={props.isSaving}
      >
        {props.isSaving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>שמרי תאי סוסים</Text>
        )}
      </Pressable>

      {props.selectedHorseBookings.length > 0 ? (
        <Pressable
          style={[
            styles.primaryButton,
            { backgroundColor: "#5E7A74" },
          ]}
          onPress={props.onOpenTackMode}
        >
          <Text style={styles.primaryButtonText}>המשך להזמנת תאי Tack</Text>
        </Pressable>
      ) : null}
    </View>
  );
}