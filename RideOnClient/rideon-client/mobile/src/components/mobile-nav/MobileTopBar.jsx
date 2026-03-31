import { View, Text, Image } from "react-native";
import mobileNavStyles from "../../styles/mobileNavStyles";

export default function MobileTopBar(props) {
  return (
    <View style={mobileNavStyles.topBarWrapper}>
      <Image
        source={require("../../../../shared/assets/logo.png")}
        style={mobileNavStyles.topBarLogo}
        resizeMode="contain"
      />

      <View style={mobileNavStyles.topBarTextWrap}>
        <Text style={mobileNavStyles.topBarTitle}>{props.title}</Text>

        {!!props.subtitle && (
          <Text style={mobileNavStyles.topBarSubtitle}>{props.subtitle}</Text>
        )}
      </View>
    </View>
  );
}