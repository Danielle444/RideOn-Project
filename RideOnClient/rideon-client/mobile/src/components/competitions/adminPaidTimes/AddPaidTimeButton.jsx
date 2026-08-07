import { useState } from "react";
import { View } from "react-native";

import Button from "../../ui/Button";
import PaidTimeCreateModal from "../PaidTimeCreateModal";

// כפתור "הוסף פייד טיים" במסך הפייד טיימים של אדמין.
//
// CAP-4: בעבר הכפתור ניווט למסך ההרשמות (טאב פייד טיים), עם בורר אחת/
// מרוכזת שהוביל לאותו ניווט משתי אפשרויות. עכשיו הלחיצה פותחת ישירות את
// הטופס העשיר (PaidTimeCreateModal) במקום - אין ניווט החוצה ואין בורר
// מצב. payerSource="managed" נותן משלם רחב יותר
// (usp_getmanagedpayersbysystemuser) ולא מוגבל ל-lockedPayerPersonId - ראו
// useAdminCompetitionPaidTimes. הזרימה המרוכזת (bulk/chatbot) עצמה לא
// נגעה בה - היא עדיין נגישה דרך טאב הפייד טיים במסך ההרשמות, בלי קשר
// לכפתור הזה.
export default function AddPaidTimeButton(props) {
  var [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  function handlePress() {
    setIsCreateModalOpen(true);
  }

  function handleClose() {
    setIsCreateModalOpen(false);
  }

  return (
    <View style={{ marginBottom: 12 }}>
      <Button
        variant="solid"
        icon="add-circle"
        label="הוסף פייד טיים"
        onPress={handlePress}
      />

      <PaidTimeCreateModal
        visible={isCreateModalOpen}
        payerSource="managed"
        paidTimesStepAvailability={props.paidTimesStepAvailability}
        isRegistrationStatusLoading={props.isRegistrationStatusLoading}
        onClose={handleClose}
        onCreated={props.onCreated}
      />
    </View>
  );
}
