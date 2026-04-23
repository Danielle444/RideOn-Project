import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import styles from "../../styles/adminCompetitionPaidTimesStyles";

function buildPayersSummary(selectedPayers, formatPayerLabel) {
  if (!selectedPayers || selectedPayers.length === 0) {
    return "לא נבחרו עדיין משלמים";
  }

  if (selectedPayers.length <= 2) {
    return selectedPayers
      .map(function (payer) {
        return formatPayerLabel(payer);
      })
      .join(", ");
  }

  var firstTwo = selectedPayers.slice(0, 2).map(function (payer) {
    return formatPayerLabel(payer);
  });

  var remainingCount = selectedPayers.length - 2;

  return firstTwo.join(", ") + " ועוד " + remainingCount;
}

export default function CompetitionHorsePayersEditor(props) {
  var horse = props.horse;
  var payers = props.payers || [];
  var selectedPayers = props.selectedPayers || [];
  var onTogglePayer = props.onTogglePayer;
  var onRemoveHorse = props.onRemoveHorse;
  var onToggleEditor = props.onToggleEditor;
  var isExpanded = props.isExpanded;
  var formatHorseLabel = props.formatHorseLabel;
  var formatPayerLabel = props.formatPayerLabel;

  var summaryText = buildPayersSummary(selectedPayers, formatPayerLabel);

  function isSelected(payerItem) {
    return selectedPayers.some(function (selected) {
      return selected.paidByPersonId === payerItem.paidByPersonId;
    });
  }

  return (
    <View style={styles.helperCard}>
      <View
        style={{
          flexDirection: "row-reverse",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Text style={styles.fieldLabel}>{formatHorseLabel(horse)}</Text>

        <View
          style={{
            flexDirection: "row-reverse",
            gap: 12,
            alignItems: "center",
          }}
        >
          <Pressable
            onPress={function () {
              onToggleEditor(horse.horseId);
            }}
          >
            <Text style={styles.clearText}>
              {isExpanded ? "סגירה" : "עריכה"}
            </Text>
          </Pressable>

          <Pressable
            onPress={function () {
              onRemoveHorse(horse.horseId);
            }}
          >
            <Text style={styles.clearText}>הסר</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.helperText}>{summaryText}</Text>

      {isExpanded ? (
        <View style={{ marginTop: 8 }}>
          {payers.length === 0 ? (
            <Text style={styles.helperText}>
              אין משלמים זמינים עבור הסוס הזה
            </Text>
          ) : (
            <ScrollView
              style={{
                maxHeight: 220,
                borderRadius: 12,
              }}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {payers.map(function (payer, index) {
                var selected = isSelected(payer);

                return (
                  <Pressable
                    key={String(payer.paidByPersonId) + "_" + index}
                    onPress={function () {
                      onTogglePayer(horse.horseId, payer);
                    }}
                    style={{
                      paddingVertical: 10,
                      flexDirection: "row-reverse",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottomWidth: index === payers.length - 1 ? 0 : 1,
                      borderBottomColor: "#F0E4DC",
                    }}
                  >
                    <Text style={styles.helperText}>
                      {formatPayerLabel(payer)}
                    </Text>
                    <Text style={styles.helperText}>{selected ? "✓" : ""}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      ) : null}
    </View>
  );
}
