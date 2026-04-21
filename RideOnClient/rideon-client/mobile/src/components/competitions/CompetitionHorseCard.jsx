import { Pressable, Text, View } from "react-native";
import horsesStyles from "../../styles/horsesStyles";

export default function CompetitionHorseCard(props) {
  var horse = props.horse;
  var onEditBarnName = props.onEditBarnName;

  return (
    <View style={horsesStyles.horseCard}>
      <Text style={horsesStyles.horseTitle}>
        {horse.horseName || "ללא שם סוס"}
      </Text>

      <Text style={horsesStyles.horseMeta}>
        כינוי: {horse.barnName || "-"}
      </Text>

      <Text style={horsesStyles.horseMeta}>
        מספר התאחדות: {horse.federationNumber || "-"}
      </Text>

      <View style={horsesStyles.rowWrap}>
        <Pressable
          style={horsesStyles.secondaryButton}
          onPress={function () {
            onEditBarnName(horse);
          }}
        >
          <Text style={horsesStyles.secondaryButtonText}>עריכת כינוי</Text>
        </Pressable>
      </View>
    </View>
  );
}