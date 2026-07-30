import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import styles from "../../../styles/adminCompetitionPaidTimesStyles";

// בחירת אופן ההזמנה של פייד טיים - מחליף את ה-Alert שהיה משמש כניתוב.
// שתי האפשרויות מוצגות יחד ככרטיסי פעולה, כך שרואים את שתיהן ואת ההסבר
// שלהן בלי לפתוח דיאלוג מערכת.
//
// המסלולים עצמם לא השתנו: שניהם מנווטים ל-AdminCompetitionRegistrations
// בטאב פייד טיים, וההזמנה המרוכזת ממשיכה לפתוח את הצ'אטבוט הקיים דרך
// הפרמטר openSmartBooking.
//
// props:
//   visible        (boolean)
//   onClose        (function)
//   onSelectSingle (function) - "הזמנה אחת"
//   onSelectBulk   (function) - "כמה הזמנות יחד" (הזרימה החכמה/המרוכזת)
export default function PaidTimeBookingModeModal(props) {
  return (
    <Modal
      visible={!!props.visible}
      transparent={true}
      animationType="fade"
      onRequestClose={props.onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>הוספת פייד טיים</Text>
          <Text style={styles.modalSubtitle}>באיזה אופן תרצי ליצור את הבקשה?</Text>

          <Pressable
            style={styles.modeCard}
            onPress={props.onSelectSingle}
            accessibilityRole="button"
            accessibilityLabel="הזמנה אחת"
          >
            <View style={styles.modeCardIconWrap}>
              <Ionicons name="add-circle-outline" size={22} color="#7B5A4D" />
            </View>

            <View style={styles.modeCardTextWrap}>
              <Text style={styles.modeCardTitle}>הזמנה אחת</Text>
              <Text style={styles.modeCardText}>
                יצירת בקשת פייד־טיים עבור סוס אחד
              </Text>
            </View>

            <Ionicons name="chevron-back-outline" size={18} color="#9E8A7F" />
          </Pressable>

          <Pressable
            style={[styles.modeCard, styles.modeCardBulk]}
            onPress={props.onSelectBulk}
            accessibilityRole="button"
            accessibilityLabel="כמה הזמנות יחד"
          >
            <View style={styles.modeCardIconWrap}>
              <Ionicons name="sparkles" size={22} color="#7B5A4D" />
            </View>

            <View style={styles.modeCardTextWrap}>
              <Text style={styles.modeCardTitle}>כמה הזמנות יחד</Text>
              <Text style={styles.modeCardText}>
                בחירת מאמן וכמה סוסים ושליחת בקשות מרוכזת
              </Text>
            </View>

            <Ionicons name="chevron-back-outline" size={18} color="#9E8A7F" />
          </Pressable>

          <Pressable
            style={styles.modalSecondaryButton}
            onPress={props.onClose}
            accessibilityRole="button"
          >
            <Text style={styles.modalSecondaryText}>ביטול</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
