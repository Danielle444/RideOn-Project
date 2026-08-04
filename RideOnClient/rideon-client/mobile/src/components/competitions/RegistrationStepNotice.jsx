import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

// Generic "step unavailable" notice, shared by the standalone management
// screens (Classes / Stalls-Shavings / Paid Times). PaidTimeSetupNotice.jsx
// is not reused here: its title is hardcoded to Paid Time specifically, with
// no prop for a different title, so it would show a wrong caption on the
// other screens. Takes its container/text styles as props instead of
// importing a style module directly, so each screen keeps using its OWN
// existing error-card style tokens rather than a new shared style.
//
// CAP-4: optional, backward-compatible CTA. Callers that pass no ctaLabel/
// onCtaPress get exactly the previous render (message only) - only screens
// that explicitly wire a CTA for NEEDS_RELEVANT_ENTRY/
// NEEDS_RELEVANT_STALL_BOOKING pass these. ctaContainerStyle/ctaTextStyle are
// optional overrides on top of the built-in default look, following the same
// "styles as props" pattern as containerStyle/textStyle above.
export default function RegistrationStepNotice(props) {
  var hasCta = !!(props.ctaLabel && typeof props.onCtaPress === "function");

  return (
    <View style={props.containerStyle}>
      <Text style={props.textStyle}>{props.message}</Text>

      {hasCta ? (
        <Pressable
          onPress={props.onCtaPress}
          style={[defaultStyles.ctaButton, props.ctaContainerStyle]}
        >
          <Text style={[defaultStyles.ctaText, props.ctaTextStyle]}>
            {props.ctaLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

var defaultStyles = StyleSheet.create({
  ctaButton: {
    marginTop: 8,
    alignSelf: "flex-end",
  },

  ctaText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7B5A4D",
    textDecorationLine: "underline",
  },
});
