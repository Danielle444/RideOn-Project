import React, { useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import styles from "../../styles/adminCompetitionPaidTimesStyles";

LocaleConfig.locales["he"] = {
  monthNames: [
    "ינואר",
    "פברואר",
    "מרץ",
    "אפריל",
    "מאי",
    "יוני",
    "יולי",
    "אוגוסט",
    "ספטמבר",
    "אוקטובר",
    "נובמבר",
    "דצמבר",
  ],
  monthNamesShort: [
    "ינו׳",
    "פבר׳",
    "מרץ",
    "אפר׳",
    "מאי",
    "יוני",
    "יולי",
    "אוג׳",
    "ספט׳",
    "אוק׳",
    "נוב׳",
    "דצ׳",
  ],
  dayNames: [
    "יום ראשון",
    "יום שני",
    "יום שלישי",
    "יום רביעי",
    "יום חמישי",
    "יום שישי",
    "יום שבת",
  ],
  dayNamesShort: ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"],
  today: "היום",
};

LocaleConfig.defaultLocale = "he";

function parseInputDate(dateValue) {
  if (!dateValue) {
    return null;
  }

  var parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatDateForInput(dateValue) {
  if (!dateValue) {
    return "";
  }

  try {
    var date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
  } catch (error) {
    return "";
  }
}

function formatDateForDisplay(dateValue) {
  if (!dateValue) {
    return "";
  }

  try {
    var date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    return "";
  }
}

export default function CompetitionDateField(props) {
  var label = props.label;
  var value = props.value;
  var onChange = props.onChange;
  var minimumDate = props.minimumDate || "";
  var maximumDate = props.maximumDate || "";

  var [showCalendar, setShowCalendar] = useState(false);

  var selectedDateString = useMemo(
    function () {
      return value || formatDateForInput(new Date());
    },
    [value],
  );

  var markedDates = useMemo(
    function () {
      if (!selectedDateString) {
        return {};
      }

      return {
        [selectedDateString]: {
          selected: true,
          selectedColor: "#7B5A4D",
        },
      };
    },
    [selectedDateString],
  );

  function handleDayPress(day) {
    onChange(day.dateString);
    setShowCalendar(false);
  }

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <Pressable
        style={styles.textInput}
        onPress={function () {
          setShowCalendar(true);
        }}
      >
        <Text
          style={{
            textAlign: "right",
            color: value ? "#4F3B31" : "#9E8A7F",
            fontSize: 14,
          }}
        >
          {value ? formatDateForDisplay(value) : "בחרי תאריך"}
        </Text>
      </Pressable>

      <Modal transparent animationType="fade" visible={showCalendar}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.25)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 18,
              padding: 16,
            }}
          >
            <Text
              style={{
                textAlign: "right",
                fontSize: 16,
                fontWeight: "700",
                color: "#4F3B31",
                marginBottom: 12,
              }}
            >
              {label}
            </Text>

            <View style={{ direction: "ltr" }}>
              <Calendar
                current={selectedDateString}
                minDate={minimumDate || undefined}
                maxDate={maximumDate || undefined}
                onDayPress={handleDayPress}
                markedDates={markedDates}
                firstDay={0}
                enableSwipeMonths={true}
                theme={{
                  textSectionTitleColor: "#5B4438",
                  selectedDayBackgroundColor: "#7B5A4D",
                  selectedDayTextColor: "#FFFFFF",
                  todayTextColor: "#7B5A4D",
                  dayTextColor: "#4F3B31",
                  arrowColor: "#7B5A4D",
                  monthTextColor: "#4F3B31",
                  textDayFontSize: 16,
                  textMonthFontSize: 16,
                  textDayHeaderFontSize: 14,
                }}
              />
            </View>

            <Pressable
              style={[
                styles.primaryButton,
                { marginTop: 14, backgroundColor: "#A79185" },
              ]}
              onPress={function () {
                setShowCalendar(false);
              }}
            >
              <Text style={styles.primaryButtonText}>סגירה</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
