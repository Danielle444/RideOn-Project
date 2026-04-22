import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import CompetitionRegistrationDropdown from "../competitions/CompetitionRegistrationDropdown";
import CompetitionMultiPayerSelector from "./CompetitionMultiPayerSelector";
import styles from "../../styles/adminCompetitionPaidTimesStyles";

export default function CompetitionStallBookingFormCard(props) {
  var horses = props.horses;
  var stallTypeOptions = props.stallTypeOptions;
  var availablePayersForSelectedHorse = props.availablePayersForSelectedHorse;

  var selectedHorse = props.selectedHorse;
  var selectedPayers = props.selectedPayers;
  var selectedStallType = props.selectedStallType;

  var checkInDate = props.checkInDate;
  var checkOutDate = props.checkOutDate;
  var notes = props.notes;

  var setSelectedHorse = props.setSelectedHorse;
  var setSelectedStallType = props.setSelectedStallType;
  var togglePayerSelection = props.togglePayerSelection;
  var setCheckInDate = props.setCheckInDate;
  var setCheckOutDate = props.setCheckOutDate;
  var setNotes = props.setNotes;

  var isSaving = props.isSaving;
  var onSubmit = props.onSubmit;

  var formatHorseLabel = props.formatHorseLabel;
  var formatPayerLabel = props.formatPayerLabel;
  var formatStallTypeLabel = props.formatStallTypeLabel;

  return (
    <View style={styles.formCard}>
      <Text style={styles.cardTitle}>הזמנת תאי סוסים</Text>

      <View style={styles.helperCard}>
        <Text style={styles.helperText}>
          בחרי סוס שרשום לתחרות, סוג תא, תאריכי שהות ומשלמים.
        </Text>
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>סוס</Text>
        <CompetitionRegistrationDropdown
          items={horses}
          selectedItem={selectedHorse}
          onSelectItem={setSelectedHorse}
          placeholder="בחרי סוס"
          getItemLabel={formatHorseLabel}
        />
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>סוג תא</Text>
        <CompetitionRegistrationDropdown
          items={stallTypeOptions}
          selectedItem={selectedStallType}
          onSelectItem={setSelectedStallType}
          placeholder="בחרי סוג תא"
          getItemLabel={formatStallTypeLabel}
        />
      </View>

      <CompetitionMultiPayerSelector
        items={availablePayersForSelectedHorse}
        selectedItems={selectedPayers}
        onToggleItem={togglePayerSelection}
        getItemLabel={formatPayerLabel}
      />

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>תאריך כניסה</Text>
        <TextInput
          value={checkInDate}
          onChangeText={setCheckInDate}
          placeholder="YYYY-MM-DD"
          style={styles.textInput}
          textAlign="right"
        />
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>תאריך יציאה</Text>
        <TextInput
          value={checkOutDate}
          onChangeText={setCheckOutDate}
          placeholder="YYYY-MM-DD"
          style={styles.textInput}
          textAlign="right"
        />
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>הערות</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="הערות להזמנה"
          style={[styles.textInput, styles.notesInput]}
          multiline
          textAlign="right"
        />
      </View>

      <Pressable
        style={[
          styles.primaryButton,
          isSaving ? styles.primaryButtonDisabled : null,
        ]}
        onPress={onSubmit}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>שמרי תא</Text>
        )}
      </Pressable>
    </View>
  );
}
