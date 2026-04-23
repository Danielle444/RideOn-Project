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
import CompetitionDateField from "./CompetitionDateField";
import styles from "../../styles/adminCompetitionPaidTimesStyles";

export default function CompetitionEquipmentStallFormCard(props) {
  var splitModeItems = [
    { id: "equal", name: "חלוקה שווה בין כל המשלמים של תאי הסוסים" },
    { id: "specific", name: "בחירת משלמים מסוימים" },
  ];

  var selectedSplitModeItem = splitModeItems.find(function (item) {
    return item.id === props.equipmentSplitMode;
  }) || null;

  return (
    <View style={styles.formCard}>
      <Text style={styles.cardTitle}>הזמנת תאי ציוד</Text>

      <View style={styles.helperCard}>
        <Text style={styles.helperText}>
          תאריכי ברירת המחדל נלקחים מטווח התאריכים של תאי הסוסים, אבל אפשר לערוך אותם.
        </Text>
      </View>

      <CompetitionRegistrationDropdown
        label="סוג תא ציוד"
        placeholder="בחרי סוג תא ציוד"
        searchPlaceholder="חיפוש סוג תא ציוד"
        items={props.equipmentStallTypeOptions}
        selectedItem={props.selectedEquipmentStallType}
        getItemId={function (item) {
          return item.priceCatalogId;
        }}
        getItemLabel={props.formatStallTypeLabel}
        onSelect={props.setSelectedEquipmentStallType}
        disabled={props.allHorseStallTypes.length === 1}
      />

      <CompetitionDateField
        label="תאריך כניסה"
        value={props.equipmentStartDate}
        onChange={props.setEquipmentStartDate}
        minimumDate={props.minCompetitionDate}
        maximumDate={props.maxCompetitionDate}
      />

      <CompetitionDateField
        label="תאריך יציאה"
        value={props.equipmentEndDate}
        onChange={props.setEquipmentEndDate}
        minimumDate={props.minCompetitionDate}
        maximumDate={props.maxCompetitionDate}
      />

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>כמות תאי ציוד</Text>

        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
            borderWidth: 1,
            borderColor: "#D8C7BC",
            borderRadius: 18,
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: "#FFFFFF",
          }}
        >
          <Pressable
            onPress={function () {
              var nextValue = Math.max(1, Number(props.equipmentQuantity || 1) - 1);
              props.setEquipmentQuantity(String(nextValue));
            }}
          >
            <Text style={{ fontSize: 26, color: "#7B5A4D", fontWeight: "700" }}>−</Text>
          </Pressable>

          <Text style={{ fontSize: 20, color: "#4F3B31", fontWeight: "700" }}>
            {props.equipmentQuantity || "1"}
          </Text>

          <Pressable
            onPress={function () {
              var nextValue = Number(props.equipmentQuantity || 1) + 1;
              props.setEquipmentQuantity(String(nextValue));
            }}
          >
            <Text style={{ fontSize: 26, color: "#7B5A4D", fontWeight: "700" }}>+</Text>
          </Pressable>
        </View>
      </View>

      <CompetitionRegistrationDropdown
        label="אופן חלוקת תשלום"
        placeholder="בחרי אופן חלוקה"
        searchPlaceholder="חיפוש אופן חלוקה"
        items={splitModeItems}
        selectedItem={selectedSplitModeItem}
        getItemId={function (item) {
          return item.id;
        }}
        getItemLabel={function (item) {
          return item.name;
        }}
        onSelect={function (item) {
          props.setEquipmentSplitMode(item.id);
        }}
      />

      {props.equipmentSplitMode === "specific" ? (
        <CompetitionMultiPayerSelector
          items={props.allSelectedHorsePayers}
          selectedItems={props.selectedEquipmentPayers}
          onToggleItem={props.toggleEquipmentPayerSelection}
          getItemLabel={props.formatPayerLabel}
        />
      ) : null}

      <View style={styles.helperCard}>
        <Text style={styles.helperText}>
          עלות כוללת: {props.equipmentPricingSummary.totalPrice} ₪
        </Text>
        <Text style={styles.helperText}>
          מספר משלמים: {props.equipmentPricingSummary.payerCount}
        </Text>
        <Text style={styles.helperText}>
          לכל משלם: {props.equipmentPricingSummary.amountPerPayer} ₪
        </Text>
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>הערות</Text>
        <TextInput
          value={props.equipmentNotes}
          onChangeText={props.setEquipmentNotes}
          placeholder="הערות לתאי ציוד"
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
            <Text style={styles.primaryButtonText}>שמרי תאי ציוד</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}