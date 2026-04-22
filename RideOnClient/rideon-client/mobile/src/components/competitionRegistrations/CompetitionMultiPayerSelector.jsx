import React from "react";
import { Pressable, Text, View } from "react-native";
import styles from "../../styles/adminCompetitionPaidTimesStyles";

export default function CompetitionMultiPayerSelector(props) {
  var items = props.items || [];
  var selectedItems = props.selectedItems || [];
  var onToggleItem = props.onToggleItem;
  var getItemLabel = props.getItemLabel;

  function isSelected(item) {
    return selectedItems.some(function (selected) {
      return selected.paidByPersonId === item.paidByPersonId;
    });
  }

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>משלמים</Text>

      <View style={styles.helperCard}>
        {items.length === 0 ? (
          <Text style={styles.helperText}>
            אין משלמים זמינים עבור הסוס שנבחר
          </Text>
        ) : (
          items.map(function (item, index) {
            var selected = isSelected(item);

            return (
              <Pressable
                key={String(item.paidByPersonId) + "_" + index}
                onPress={function () {
                  onToggleItem(item);
                }}
                style={{
                  paddingVertical: 10,
                  flexDirection: "row-reverse",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottomWidth: index === items.length - 1 ? 0 : 1,
                  borderBottomColor: "#F0E4DC",
                }}
              >
                <Text style={styles.helperText}>{getItemLabel(item)}</Text>
                <Text style={styles.helperText}>{selected ? "✓" : ""}</Text>
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}
