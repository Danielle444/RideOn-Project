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

export default function CompetitionTackStallFormCard(props) {
  var splitModeItems = [
    { id: "equal", name: "חלוקה שווה בין כל המשלמים של תאי הסוסים" },
    { id: "specific", name: "בחירת משלמים מסוימים" },
  ];

  var selectedSplitModeItem =
    splitModeItems.find(function (item) {
      return item.id === props.tackSplitMode;
    }) || null;

  var hasSingleTackType =
    Array.isArray(props.allTackTypes) && props.allTackTypes.length === 1;

  var pricingSummary = props.tackPricingSummary || {
    totalPrice: 0,
    payerCount: 0,
    amountPerPayer: 0,
  };

  return (
    <View style={styles.formCard}>
      <Text style={styles.cardTitle}>הזמנת תאי ציוד</Text>

      <View style={styles.helperCard}>
        <Text style={styles.helperText}>
          תאריכי ברירת המחדל נלקחים מטווח התאריכים של תאי הסוסים, אבל אפשר לערוך
          אותם.
        </Text>
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>סוג תא ציוד</Text>

        {hasSingleTackType ? (
          <View style={styles.textInput}>
            <Text
              style={{
                textAlign: "right",
                color: "#4F3B31",
                fontSize: 14,
              }}
            >
              {props.formatStallTypeLabel(props.allTackTypes[0])}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {(Array.isArray(props.allTackTypes) && props.allTackTypes.length > 0
              ? props.allTackTypes
              : props.horseStallTypeOptions || []
            ).map(function (item) {
              var isSelected =
                props.selectedTackStallType &&
                props.selectedTackStallType.priceCatalogId ===
                  item.priceCatalogId;

              return (
                <Pressable
                  key={String(item.priceCatalogId)}
                  onPress={function () {
                    props.setSelectedTackStallType(item);
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: isSelected ? "#7B5A4D" : "#D8C7BC",
                    backgroundColor: isSelected ? "#F3E7DF" : "#FFFFFF",
                    borderRadius: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                >
                  <Text
                    style={{
                      textAlign: "right",
                      color: "#4F3B31",
                      fontSize: 14,
                      fontWeight: isSelected ? "700" : "400",
                    }}
                  >
                    {props.formatStallTypeLabel(item)}
                  </Text>
                </Pressable>
              );
            })}

            {(!Array.isArray(props.allTackTypes) ||
              props.allTackTypes.length === 0) &&
            (!Array.isArray(props.horseStallTypeOptions) ||
              props.horseStallTypeOptions.length === 0) ? (
              <View style={styles.helperCard}>
                <Text style={styles.helperText}>לא נמצאו סוגי תאים לבחירה</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      <CompetitionDateField
        label="תאריך כניסה"
        value={props.tackStartDate}
        onChange={props.setTackStartDate}
        minimumDate={props.minCompetitionDate}
        maximumDate={props.maxCompetitionDate}
      />

      <CompetitionDateField
        label="תאריך יציאה"
        value={props.tackEndDate}
        onChange={props.setTackEndDate}
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
              var nextValue = Math.max(1, Number(props.tackQuantity || 1) - 1);
              props.setTackQuantity(String(nextValue));
            }}
          >
            <Text style={{ fontSize: 26, color: "#7B5A4D", fontWeight: "700" }}>
              −
            </Text>
          </Pressable>

          <Text style={{ fontSize: 20, color: "#4F3B31", fontWeight: "700" }}>
            {props.tackQuantity || "1"}
          </Text>

          <Pressable
            onPress={function () {
              var nextValue = Number(props.tackQuantity || 1) + 1;
              props.setTackQuantity(String(nextValue));
            }}
          >
            <Text style={{ fontSize: 26, color: "#7B5A4D", fontWeight: "700" }}>
              +
            </Text>
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

      <View style={styles.helperCard}>
        <Text style={styles.helperText}>
          עלות כוללת: {pricingSummary.totalPrice} ₪
        </Text>
        <Text style={styles.helperText}>
          מספר משלמים: {pricingSummary.payerCount}
        </Text>
        <Text style={styles.helperText}>
          לכל משלם: {pricingSummary.amountPerPayer} ₪
        </Text>
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>הערות</Text>
        <TextInput
          value={props.tackNotes}
          onChangeText={props.setTackNotes}
          placeholder="הערות לתאי ציוד"
          style={[styles.textInput, styles.notesInput]}
          multiline
          textAlign="right"
        />
      </View>

      <View style={styles.helperCard}>
        <Text style={styles.helperText}>
          הוזמנו {props.existingTackBookingsCount} תאי ציוד
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row-reverse",
          gap: 10,
        }}
      >
        <Pressable
          style={[
            styles.primaryButton,
            { flex: 1, backgroundColor: "#A79185" },
          ]}
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
