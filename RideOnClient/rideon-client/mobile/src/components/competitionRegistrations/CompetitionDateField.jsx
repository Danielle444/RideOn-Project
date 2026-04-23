import React, { useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import styles from "../../styles/adminCompetitionPaidTimesStyles";

var HEBREW_MONTHS = [
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
];

var HEBREW_DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function parseDateString(dateString) {
  if (!dateString) {
    return null;
  }

  var parts = String(dateString).split("-");
  if (parts.length !== 3) {
    return null;
  }

  var year = Number(parts[0]);
  var month = Number(parts[1]) - 1;
  var day = Number(parts[2]);

  var date = new Date(year, month, day);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDateForInput(date) {
  if (!date) {
    return "";
  }

  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, "0");
  var day = String(date.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

function formatDateForDisplay(dateString) {
  var date = parseDateString(dateString);
  if (!date) {
    return "";
  }

  return date.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isSameDay(a, b) {
  if (!a || !b) {
    return false;
  }

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isDateBefore(a, b) {
  if (!a || !b) {
    return false;
  }

  return (
    new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime() <
    new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
  );
}

function isDateAfter(a, b) {
  if (!a || !b) {
    return false;
  }

  return (
    new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime() >
    new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
  );
}

function buildCalendarCells(monthDate) {
  var year = monthDate.getFullYear();
  var month = monthDate.getMonth();

  var firstDayOfMonth = new Date(year, month, 1);
  var lastDayOfMonth = new Date(year, month + 1, 0);

  // JS: Sunday=0 ... Saturday=6
  var firstDayIndex = firstDayOfMonth.getDay();
  var daysInMonth = lastDayOfMonth.getDate();

  var cells = [];

  for (var i = 0; i < firstDayIndex; i++) {
    cells.push(null);
  }

  for (var day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export default function CompetitionDateField(props) {
  var label = props.label;
  var value = props.value;
  var onChange = props.onChange;
  var minimumDate = props.minimumDate;
  var maximumDate = props.maximumDate;

  var [visible, setVisible] = useState(false);

  var selectedDate = useMemo(
    function () {
      return parseDateString(value) || new Date();
    },
    [value],
  );

  var minDateObj = useMemo(
    function () {
      return parseDateString(minimumDate);
    },
    [minimumDate],
  );

  var maxDateObj = useMemo(
    function () {
      return parseDateString(maximumDate);
    },
    [maximumDate],
  );

  var [currentMonth, setCurrentMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );

  function openCalendar() {
    var baseDate =
      parseDateString(value) || parseDateString(minimumDate) || new Date();
    setCurrentMonth(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
    setVisible(true);
  }

  function goToPreviousMonth() {
    setCurrentMonth(function (prev) {
      return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
    });
  }

  function goToNextMonth() {
    setCurrentMonth(function (prev) {
      return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
    });
  }

  function handleSelectDate(date) {
    if (!date) {
      return;
    }

    if (minDateObj && isDateBefore(date, minDateObj)) {
      return;
    }

    if (maxDateObj && isDateAfter(date, maxDateObj)) {
      return;
    }

    onChange(formatDateForInput(date));
    setVisible(false);
  }

  var cells = useMemo(
    function () {
      return buildCalendarCells(currentMonth);
    },
    [currentMonth],
  );

  function isDisabled(date) {
    if (!date) {
      return true;
    }

    if (minDateObj && isDateBefore(date, minDateObj)) {
      return true;
    }

    if (maxDateObj && isDateAfter(date, maxDateObj)) {
      return true;
    }

    return false;
  }

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <Pressable style={styles.textInput} onPress={openCalendar}>
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

      <Modal visible={visible} transparent animationType="fade">
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
              borderRadius: 20,
              padding: 16,
            }}
          >
            <Text
              style={{
                textAlign: "right",
                fontSize: 16,
                fontWeight: "700",
                marginBottom: 14,
                color: "#4F3B31",
              }}
            >
              {label}
            </Text>

            <View
              style={{
                flexDirection: "row-reverse",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Pressable onPress={goToNextMonth}>
                <Text style={{ fontSize: 24, color: "#7B5A4D" }}>‹</Text>
              </Pressable>

              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#4F3B31",
                }}
              >
                {HEBREW_MONTHS[currentMonth.getMonth()] +
                  " " +
                  currentMonth.getFullYear()}
              </Text>

              <Pressable onPress={goToPreviousMonth}>
                <Text style={{ fontSize: 24, color: "#7B5A4D" }}>›</Text>
              </Pressable>
            </View>

            {/* כותרות ימים - יום א מימין */}
            <View
              style={{
                flexDirection: "row-reverse",
                marginBottom: 8,
              }}
            >
              {HEBREW_DAYS.map(function (dayName) {
                return (
                  <View
                    key={dayName}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#5B4438",
                        fontWeight: "600",
                      }}
                    >
                      {dayName}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* תאי החודש */}
            <View>
              {Array.from({ length: cells.length / 7 }).map(
                function (_, rowIndex) {
                  var row = cells.slice(rowIndex * 7, rowIndex * 7 + 7);

                  return (
                    <View
                      key={rowIndex}
                      style={{
                        flexDirection: "row-reverse",
                      }}
                    >
                      {row.map(function (date, colIndex) {
                        var disabled = isDisabled(date);
                        var selected = isSameDay(date, selectedDate);

                        return (
                          <Pressable
                            key={rowIndex + "_" + colIndex}
                            onPress={function () {
                              if (!disabled) {
                                handleSelectDate(date);
                              }
                            }}
                            style={{
                              flex: 1,
                              aspectRatio: 1,
                              justifyContent: "center",
                              alignItems: "center",
                              marginVertical: 2,
                            }}
                          >
                            <View
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                justifyContent: "center",
                                alignItems: "center",
                                backgroundColor: selected
                                  ? "#7B5A4D"
                                  : "transparent",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 16,
                                  color: !date
                                    ? "transparent"
                                    : disabled
                                      ? "#D0C7C1"
                                      : selected
                                        ? "#FFFFFF"
                                        : "#4F3B31",
                                  fontWeight: selected ? "700" : "400",
                                }}
                              >
                                {date ? date.getDate() : ""}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  );
                },
              )}
            </View>

            <Pressable
              style={[
                styles.primaryButton,
                { marginTop: 14, backgroundColor: "#A79185" },
              ]}
              onPress={function () {
                setVisible(false);
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
