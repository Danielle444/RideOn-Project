import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CompetitionRegistrationDropdown from "./CompetitionRegistrationDropdown";
import styles from "../../styles/adminCompetitionPaidTimesStyles";

export default function CompetitionPaidTimeFormCard(props) {
  return (
    <View style={styles.formCard}>
      <Text style={styles.cardTitle}>פרטי בקשת פייד טיים</Text>

      <CompetitionRegistrationDropdown
        label="סוג פייד טיים"
        placeholder="בחרי סוג פייד טיים"
        searchPlaceholder="חיפוש סוג פייד טיים"
        items={props.priceCatalogItems}
        selectedItem={props.selectedPriceCatalog}
        getItemId={function (item) {
          return item.priceCatalogId;
        }}
        getItemLabel={props.formatPriceCatalogLabel}
        onSelect={props.setSelectedPriceCatalog}
        isLocked={props.locks.priceCatalog}
        onToggleLock={function () {
          props.onToggleLock("priceCatalog");
        }}
      />

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

      <View style={styles.fieldBlock}>
        <View style={styles.fieldHeaderRow}>
          <Text style={styles.fieldLabel}>הערות / אילוצים</Text>

          <Pressable
            onPress={function () {
              props.onToggleLock("notes");
            }}
            hitSlop={8}
            style={styles.inlineLockIconButton}
          >
            <Ionicons
              name={
                props.locks.notes
                  ? "lock-closed-outline"
                  : "lock-open-outline"
              }
              size={18}
              color="#7B5A4D"
            />
          </Pressable>
        </View>

        <TextInput
          value={props.notes}
          onChangeText={props.setNotes}
          placeholder="אפשר להוסיף בקשות מיוחדות או אילוצים"
          placeholderTextColor="#9E8A7F"
          style={[styles.textInput, styles.notesInput]}
          textAlign="right"
          multiline={true}
        />
      </View>
    </View>
  );
}