import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { canEditPaidTimeRow } from "../../../utils/paidTimeEditAvailability";

// שורת פעולות לכרטיס פייד טיים: עריכה + ביטול.
// עריכה זמינה לפי canEditPaidTimeRow (לא שולם, לא בוטל, ושלב הפייד טיים
// פעיל - אותו כלל בדיוק כמו ב-AdminCompetitionPayerAccountScreen). ביטול
// זמין לפי canCancel שמגיע מהשרת בלבד ואינו תלוי בזמינות השלב - נתיב עסקי
// שתמיד זמין (השרת עצמו אינו חוסם ביטול אחרי סיום התחרות).
// אם אף אחד מהם זמין - מציג טקסט סיבת נעילה.
export default function PaidTimeCardActions(props) {
  var item = props.item;
  var cancellingId = props.cancellingId;
  var isCancelling = cancellingId === item.paidTimeRequestId;
  var canEdit = canEditPaidTimeRow(item, props.paidTimesAvailability);
  var canCancel = !!item.canCancel;
  var isCancelled = item.status === "Cancelled";

  if (!canEdit && !canCancel) {
    var lockReason = "";
    if (isCancelled) {
      lockReason = "הבקשה בוטלה";
    } else if (item.isPaid) {
      lockReason = "הבקשה כבר שולמה - פעולות חסומות במסך זה";
    } else {
      lockReason = "לא ניתן לבצע פעולות על בקשה זו";
    }

    return (
      <View
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: "#EFE5DF",
        }}
      >
        <Text
          style={{
            textAlign: "right",
            fontSize: 12,
            color: "#8D6E63",
          }}
        >
          {lockReason}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: "row-reverse",
        gap: 8,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#EFE5DF",
      }}
    >
      {canEdit ? (
        <Pressable
          onPress={function () {
            if (props.onEdit) props.onEdit(item);
          }}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#7B5A4D",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#7B5A4D", fontWeight: "600" }}>ערוך</Text>
        </Pressable>
      ) : null}

      {canCancel ? (
        <Pressable
          onPress={function () {
            if (props.onCancel) props.onCancel(item);
          }}
          disabled={isCancelling}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: isCancelling ? "#C4B5AA" : "#B45454",
            alignItems: "center",
          }}
        >
          {isCancelling ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
              בטל פייד טיים
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}
