import { Pressable, Text, View } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

import styles from "../../styles/adminCompetitionClassesStyles";

export default function CompetitionEntryCard(props) {
  var item = props.item;

  var [expanded, setExpanded] = useState(false);

  function renderPaymentBadge() {
    return (
      <View
        style={[
          styles.paymentBadge,
          item.isPaid ? styles.paymentPaid : styles.paymentUnpaid,
        ]}
      >
        <Text style={styles.paymentBadgeText}>
          {item.isPaid ? "שולם" : "לא שולם"}
        </Text>
      </View>
    );
  }

  function renderFineBadge() {
    if (!item.fineAmount || Number(item.fineAmount) <= 0) {
      return null;
    }

    return (
      <View style={styles.fineBadge}>
        <Text style={styles.fineBadgeText}>כולל קנס ₪{item.fineAmount}</Text>
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
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Text style={styles.className}>{item.className}</Text>

            {typeof props.onViewEntries === "function" &&
            item.classInCompId ? (
              <Pressable
                onPress={function (e) {
                  if (e && e.stopPropagation) e.stopPropagation();
                  props.onViewEntries(item);
                }}
                hitSlop={8}
                style={{ padding: 2 }}
              >
                <Ionicons name="eye-outline" size={18} color="#5A4036" />
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.classDate}>
            {props.formatDate(item.classDate)}
          </Text>
        </View>

        <Text style={styles.amountText}>₪{item.amountToPay}</Text>
      </View>

      <Text style={styles.mainLine}>
        {item.riderName} • {item.horseName}
      </Text>

      <View style={styles.badgesRow}>
        {renderPaymentBadge()}
        {renderFineBadge()}
      </View>

      {expanded ? (
        <View style={styles.detailsBlock}>
          <Text style={styles.detailText}>מאמן: {item.coachName || "-"}</Text>

          <Text style={styles.detailText}>משלם: {item.payerName || "-"}</Text>

          <Text style={styles.detailText}>
            מקבל פרס: {item.prizeRecipientName || "-"}
          </Text>

          {item.drawOrder ? (
            <Text style={styles.detailText}>סדר כניסה: {item.drawOrder}</Text>
          ) : null}

          {!item.isPaid ? (
            <View style={styles.actionsRow}>
              <Pressable
                style={styles.secondaryActionButton}
                onPress={function () {
                  if (props.onEdit) {
                    props.onEdit(item);
                  }
                }}
              >
                <Text style={styles.secondaryActionButtonText}>ערוך הרשמה</Text>
              </Pressable>

              <Pressable
                style={styles.dangerActionButton}
                onPress={function () {
                  if (props.onCancel) {
                    props.onCancel(item);
                  }
                }}
              >
                <Text style={styles.dangerActionButtonText}>בטל הרשמה</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.detailText}>
              הרשמה זו כבר שולמה ולכן לא ניתן לערוך או לבטל אותה.
            </Text>
          )}
        </View>
      ) : null}
    </Pressable>
  );
}
