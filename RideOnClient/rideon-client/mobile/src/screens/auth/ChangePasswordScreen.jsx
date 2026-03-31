import {  View, Text, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "../../styles/authStyles";

export default function ChangePasswordScreen(props) {
  return (
    <SafeAreaView style={styles.screenWrapper}>
      <View style={styles.centeredContainer}>
        <View style={styles.basicCard}>
          <Image
            source={require("../../../../shared/assets/logo.png")}
            style={styles.logoMedium}
            resizeMode="contain"
          />

          <Text style={styles.titleCenter}>החלפת סיסמה</Text>

          <Text style={styles.subtitleCenter}>
            מסך החלפת הסיסמה במובייל יתחבר כאן בהמשך.
          </Text>

          <Pressable
            onPress={props.onLogout}
            style={styles.primaryButtonLarge}
          >
            <Text style={styles.primaryButtonTextLarge}>התנתקות</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}