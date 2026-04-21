import React from "react";
import { Text, View } from "react-native";
import CompetitionRegistrationDropdown from "./CompetitionRegistrationDropdown";
import styles from "../../styles/adminCompetitionRegistrationsStyles";

export default function CompetitionRegistrationFormCard(props) {
  return (
    <View style={styles.formCard}>
      <Text style={styles.cardTitle}>פרטי הרשמה</Text>

      <CompetitionRegistrationDropdown
        label="מקצה"
        placeholder="בחרי מקצה"
        searchPlaceholder="חיפוש מקצה"
        items={props.classes}
        selectedItem={props.selectedClass}
        getItemId={function (item) {
          return item.classInCompId;
        }}
        getItemLabel={props.formatClassLabel}
        onSelect={props.setSelectedClass}
        isLocked={props.locks.class}
        onToggleLock={function () {
          props.onToggleLock("class");
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
    </View>
  );
}