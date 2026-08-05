import { Pressable, Text, TextInput, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import styles from "../../styles/competitionsFilterBarStyles";
import CompetitionDateField from "../competitionRegistrations/CompetitionDateField";

// Mirrors the secretary web board's search + host-ranch + field + date-range +
// status filters (CompetitionsBoardPage.jsx / CompetitionsSearchBar.jsx), fully
// client-side over the already-fetched board list.
export default function CompetitionsFilterBar(props) {
  var hostRanchOptions = Array.isArray(props.hostRanchOptions)
    ? props.hostRanchOptions
    : [];
  var fieldOptions = Array.isArray(props.fieldOptions) ? props.fieldOptions : [];
  var statusOptions = Array.isArray(props.statusOptions)
    ? props.statusOptions
    : [];

  return (
    <View style={styles.card}>
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>חיפוש לפי שם תחרות</Text>
        <TextInput
          value={props.searchText}
          onChangeText={props.onSearchTextChange}
          placeholder="חיפוש לפי שם תחרות"
          placeholderTextColor="#BCAAA4"
          style={styles.textInput}
        />
      </View>

      {hostRanchOptions.length > 0 ? (
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>חווה מארחת</Text>
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={props.hostRanchFilter || ""}
              onValueChange={props.onHostRanchFilterChange}
            >
              <Picker.Item label="כל החוות" value="" />
              {hostRanchOptions.map(function (option) {
                return (
                  <Picker.Item
                    key={String(option.value)}
                    label={option.label}
                    value={String(option.value)}
                  />
                );
              })}
            </Picker>
          </View>
        </View>
      ) : null}

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>מתחם</Text>
        <View style={styles.pickerBox}>
          <Picker
            selectedValue={props.fieldFilter || ""}
            onValueChange={props.onFieldFilterChange}
          >
            <Picker.Item label="כל המתחמים" value="" />
            {fieldOptions.map(function (option) {
              return (
                <Picker.Item
                  key={String(option.value)}
                  label={option.label}
                  value={String(option.value)}
                />
              );
            })}
          </Picker>
        </View>
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>סטטוס</Text>
        <View style={styles.pickerBox}>
          <Picker
            selectedValue={props.statusFilter || ""}
            onValueChange={props.onStatusFilterChange}
          >
            <Picker.Item label="כל הסטטוסים" value="" />
            {statusOptions.map(function (option) {
              return (
                <Picker.Item
                  key={String(option.value)}
                  label={option.label}
                  value={String(option.value)}
                />
              );
            })}
          </Picker>
        </View>
      </View>

      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <CompetitionDateField
            label="מתאריך"
            value={props.dateFrom}
            onChange={props.onDateFromChange}
            maximumDate={props.dateTo}
          />
        </View>

        <View style={styles.dateField}>
          <CompetitionDateField
            label="עד תאריך"
            value={props.dateTo}
            onChange={props.onDateToChange}
            minimumDate={props.dateFrom}
          />
        </View>
      </View>

      <Pressable style={styles.resetButton} onPress={props.onReset}>
        <Text style={styles.resetButtonText}>איפוס</Text>
      </Pressable>
    </View>
  );
}
