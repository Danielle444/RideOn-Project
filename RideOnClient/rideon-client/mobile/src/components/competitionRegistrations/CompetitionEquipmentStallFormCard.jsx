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

export default function CompetitionEquipmentStallFormCard(props) {
  return (
    <View style={styles.formCard}>
      <Text style={styles.cardTitle}>הזמנת תאי Tack</Text>

      <View style={styles.helperCard}>
        <Text style={styles.helperText}>
          תאריכי ה־Tack נגזרים מתאי הסוסים שכבר הוזנו.
        </Text>
        <Text style={styles.helperText}>
          כניסה: {props.derivedTackDates.startDate || "-"}
        </Text>
        <Text style={styles.helperText}>
          יציאה: {props.derivedTackDates.endDate || "-"}
        </Text>
      </View>

      <CompetitionRegistrationDropdown
        label="סוג תא Tack"
        placeholder="בחרי סוג תא Tack"
        searchPlaceholder="חיפוש סוג תא Tack"
        items={props.tackStallTypeOptions}
        selectedItem={props.selectedTackStallType}
        getItemId={function (item) {
          return item.priceCatalogId;
        }}
        getItemLabel={props.formatStallTypeLabel}
        onSelect={props.setSelectedTackStallType}
      />

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>כמות תאי Tack</Text>
        <TextInput
          value={props.tackQuantity}
          onChangeText={props.setTackQuantity}
          placeholder="למשל 2"
          style={styles.textInput}
          keyboardType="numeric"
          textAlign="right"
        />
      </View>

      <CompetitionRegistrationDropdown
        label="אופן חלוקת תשלום"
        placeholder="בחרי אופן חלוקה"
        searchPlaceholder="חיפוש אופן חלוקה"
        items={[
          { id: "equal", name: "חלוקה שווה בין כל המשלמים של תאי הסוסים" },
          { id: "specific", name: "בחירת משלמים מסוימים" },
        ]}
        selectedItem={
          props.tackSplitMode === "equal"
            ? { id: "equal", name: "חלוקה שווה בין כל המשלמים של תאי הסוסים" }
            : { id: "specific", name: "בחירת משלמים מסוימים" }
        }
        getItemId={function (item) {
          return item.id;
        }}
        getItemLabel={function (item) {
          return item.name;
        }}
        onSelect={function (item) {
          props.setTackSplitMode(item.id);
        }}
      />

      {props.tackSplitMode === "specific" ? (
        <CompetitionMultiPayerSelector
          items={props.allSelectedHorsePayers}
          selectedItems={props.selectedTackPayers}
          onToggleItem={props.toggleTackPayerSelection}
          getItemLabel={props.formatPayerLabel}
        />
      ) : null}

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>הערות</Text>
        <TextInput
          value={props.tackNotes}
          onChangeText={props.setTackNotes}
          placeholder="הערות לתאי Tack"
          style={[styles.textInput, styles.notesInput]}
          multiline
          textAlign="right"
        />
      </View>

      <View
        style={{
          flexDirection: "row-reverse",
          gap: 10,
        }}
      >
        <Pressable
          style={[styles.primaryButton, { flex: 1, backgroundColor: "#A79185" }]}
          onPress={props.onBack}
        >
          <Text style={styles.primaryButtonText}>חזרה לתאי סוסים</Text>
        </Pressable>

        <Pressable
          style={[
            styles.primaryButton,
            { flex: 1 },
            props.isSaving ? styles.primaryButtonDisabled : null,
          ]}
          onPress={props.onSubmit}
          disabled={props.isSaving}
        >
          {props.isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>שמרי Tack</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}