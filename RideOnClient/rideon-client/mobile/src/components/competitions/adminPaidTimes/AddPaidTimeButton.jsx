import { Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// כפתור "הוסף פייד טיים" במסך הפייד טיימים של אדמין.
// בלחיצה - Alert עם 2 אופציות: הזמנה רגילה / הזמנה חכמה.
// שניהם מובילים למסך AdminCompetitionRegistrations בטאב פייד טיים.
// "חכמה" מועברת עם param openSmartBooking=true - המסך עצמו פותח את הצ'אטבוט אוטומטית.
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
      <Pressable
        onPress={handlePress}
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#5A4036",
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 10,
          gap: 8,
        }}
      >
        <Ionicons name="add-circle" size={20} color="#FFFFFF" />
        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>
          הוסף פייד טיים
        </Text>
      </Pressable>
    </View>
  );
}
