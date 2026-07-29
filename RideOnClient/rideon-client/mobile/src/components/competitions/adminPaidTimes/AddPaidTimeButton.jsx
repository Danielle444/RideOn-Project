import { Alert, View } from "react-native";

import Button from "../../ui/Button";

// כפתור "הוסף פייד טיים" במסך הפייד טיימים של אדמין.
// בלחיצה - Alert עם 2 אופציות: הזמנה רגילה / הזמנה חכמה.
// שניהם מובילים למסך AdminCompetitionRegistrations בטאב פייד טיים.
// "חכמה" מועברת עם param openSmartBooking=true - המסך עצמו פותח את הצ'אטבוט אוטומטית.
//
// הצביעה בלבד עברה לכפתור המשותף (החום היה #5A4036 - החום השגוי - והוא
// עכשיו #7B5A4D דרך ה-Button). הלוגיקה של ההזמנה החכמה, ה-Alert והניווט
// לא נגעו בהם.
export default function AddPaidTimeButton(props) {
  var navigation = props.navigation;
  var competitionId = props.competitionId;

  function navigateToRegistration(openSmart) {
    if (!navigation) return;
    navigation.navigate("AdminCompetitionRegistrations", {
      competitionId: competitionId,
      initialTab: "paidTimes",
      openSmartBooking: !!openSmart,
    });
  }

  function handlePress() {
    Alert.alert(
      "הוספת פייד טיים",
      "באיזה אופן תרצה ליצור את הבקשה?",
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "הזמנה רגילה",
          onPress: function () {
            navigateToRegistration(false);
          },
        },
        {
          text: "הזמנה חכמה",
          onPress: function () {
            navigateToRegistration(true);
          },
        },
      ],
      { cancelable: true }
    );
  }

  return (
    <View style={{ marginBottom: 12 }}>
      <Button
        variant="solid"
        icon="add-circle"
        label="הוסף פייד טיים"
        onPress={handlePress}
      />
    </View>
  );
}
