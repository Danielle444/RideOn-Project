import { Pressable, Text, View } from "react-native";
import { useState } from "react";

import styles from "../../styles/adminCompetitionClassesStyles";

export default function CompetitionEntryCard(
  props,
) {
  var item = props.item;

  var [expanded, setExpanded] =
    useState(false);

  function renderPaymentBadge() {
    return (
      <View
        style={[
          styles.paymentBadge,
          item.isPaid
            ? styles.paymentPaid
            : styles.paymentUnpaid,
        ]}
      >
        <Text style={styles.paymentBadgeText}>
          {item.isPaid
            ? "שולם"
            : "לא שולם"}
        </Text>
      </View>
    );
  }

  function renderFineBadge() {
    if (
      !item.fineAmount ||
      Number(item.fineAmount) <= 0
    ) {
      return null;
    }

    return (
      <View style={styles.fineBadge}>
        <Text style={styles.fineBadgeText}>
          כולל קנס ₪{item.fineAmount}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      style={styles.entryCard}
      onPress={function () {
        setExpanded(!expanded);
      }}
    >
      <View style={styles.topRow}>
        <View style={styles.classBlock}>
          <Text style={styles.className}>
            {item.className}
          </Text>

          <Text style={styles.classDate}>
            {props.formatDate(
              item.classDate,
            )}
          </Text>
        </View>

        <Text style={styles.amountText}>
          ₪{item.amountToPay}
        </Text>
      </View>

      <Text style={styles.mainLine}>
        {item.riderName} •{" "}
        {item.horseName}
      </Text>

      <View style={styles.badgesRow}>
        {renderPaymentBadge()}
        {renderFineBadge()}
      </View>

      {expanded ? (
        <View style={styles.detailsBlock}>
          <Text style={styles.detailText}>
            מאמן:{" "}
            {item.coachName || "-"}
          </Text>

          <Text style={styles.detailText}>
            משלם:{" "}
            {item.payerName || "-"}
          </Text>

          <Text style={styles.detailText}>
            מקבל פרס:{" "}
            {item.prizeRecipientName ||
              "-"}
          </Text>

          {item.drawOrder ? (
            <Text style={styles.detailText}>
              סדר כניסה:{" "}
              {item.drawOrder}
            </Text>
          ) : null}

          <View style={styles.actionsRow}>
            <Pressable
              style={[
                styles.secondaryActionButton,
                styles.secondaryActionButtonDisabled,
              ]}
              disabled={true}
            >
              <Text
                style={[
                  styles.secondaryActionButtonText,
                  styles.secondaryActionButtonTextDisabled,
                ]}
              >
                עריכת הרשמה בקרוב
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.dangerActionButton,
                styles.dangerActionButtonDisabled,
              ]}
              disabled={true}
            >
              <Text
                style={[
                  styles.dangerActionButtonText,
                  styles.dangerActionButtonTextDisabled,
                ]}
              >
                ביטול הרשמה בקרוב
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}