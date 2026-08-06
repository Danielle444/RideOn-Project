import { useState } from "react";
import { View } from "react-native";

import Button from "../../ui/Button";
import PaidTimeBookingModeModal from "./PaidTimeBookingModeModal";

import { BULK_PAID_TIME_ENTRY_ENABLED } from "../../../utils/paidTimeBulkEntryFlag";

// כפתור "הוסף פייד טיים" במסך הפייד טיימים של אדמין.
// בלחיצה נפתח PaidTimeBookingModeModal עם שתי אפשרויות גלויות:
// "הזמנה אחת" ו-"כמה הזמנות יחד". קודם זה היה Alert של המערכת.
//
// הניווט לא השתנה: שניהם מובילים למסך AdminCompetitionRegistrations בטאב
// פייד טיים, ו-"כמה הזמנות יחד" ממשיך להעביר openSmartBooking=true - המסך
// עצמו פותח את הצ'אטבוט (הזרימה החכמה/המרוכזת) אוטומטית, בדיוק כמו קודם.
export default function AddPaidTimeButton(props) {
  var navigation = props.navigation;
  var competitionId = props.competitionId;

  var [isModeModalOpen, setIsModeModalOpen] = useState(false);

  function navigateToRegistration(openSmart) {
    setIsModeModalOpen(false);

    if (!navigation) return;
    navigation.navigate("AdminCompetitionRegistrations", {
      competitionId: competitionId,
      initialTab: "paidTimes",
      openSmartBooking: !!openSmart,
    });
  }

  function handlePress() {
    // הזמנה מרוכזת (bulk) מושבתת כרגע מאחורי BULK_PAID_TIME_ENTRY_ENABLED
    // (CAP-8). כל עוד היא כבויה, מדלגים על בורר האחת/מרוכזת לגמרי ועוברים ישר
    // לזרימת ההזמנה הבודדת - כדי שלא תוצג אפשרות "כמה הזמנות יחד" מתה. כשהדגל
    // יידלק מחדש, הבורר יחזור.
    if (!BULK_PAID_TIME_ENTRY_ENABLED) {
      navigateToRegistration(false);
      return;
    }

    setIsModeModalOpen(true);
  }

  function handleCloseModeModal() {
    setIsModeModalOpen(false);
  }

  function handleSelectSingle() {
    navigateToRegistration(false);
  }

  function handleSelectBulk() {
    navigateToRegistration(true);
  }

  return (
    <View style={{ marginBottom: 12 }}>
      <Button
        variant="solid"
        icon="add-circle"
        label="הוסף פייד טיים"
        onPress={handlePress}
      />

      <PaidTimeBookingModeModal
        visible={isModeModalOpen}
        onClose={handleCloseModeModal}
        onSelectSingle={handleSelectSingle}
        onSelectBulk={handleSelectBulk}
      />
    </View>
  );
}
