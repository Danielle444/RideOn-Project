import React from "react";
import { Text, View } from "react-native";

// Generic "step unavailable" notice, shared by the standalone management
// screens (Classes / Stalls-Shavings / Paid Times). PaidTimeSetupNotice.jsx
// is not reused here: its title is hardcoded to Paid Time specifically, with
// no prop for a different title, so it would show a wrong caption on the
// other screens. Takes its container/text styles as props instead of
// importing a style module directly, so each screen keeps using its OWN
// existing error-card style tokens rather than a new shared style.
export default function RegistrationStepNotice(props) {
  return (
    <View style={props.containerStyle}>
      <Text style={props.textStyle}>{props.message}</Text>
    </View>
  );
}
