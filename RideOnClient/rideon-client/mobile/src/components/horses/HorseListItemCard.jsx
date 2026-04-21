import { Pressable, Text, View } from "react-native";
import horsesStyles from "../../styles/horsesStyles";

export default function HorseListItemCard(props) {
  var item = props.item;

  return (
    <View style={horsesStyles.horseCard}>
      <Text style={horsesStyles.horseTitle}>{item.horseName || "ללא שם"}</Text>

      <Text style={horsesStyles.horseMeta}>
        כינוי: {item.barnName && item.barnName.trim() ? item.barnName : "—"}
      </Text>

      <Text style={horsesStyles.horseMeta}>
        מספר התאחדות: {item.federationNumber || "—"}
      </Text>

      <Text style={horsesStyles.horseMeta}>
        מספר שבב: {item.chipNumber || "—"}
      </Text>

      <Text style={horsesStyles.horseMeta}>
        שנת לידה: {item.birthYear || "—"}
      </Text>

      <Text style={horsesStyles.horseMeta}>מין: {item.gender || "—"}</Text>

      <View style={horsesStyles.rowWrap}>
        <View style={horsesStyles.badge}>
          <Text style={horsesStyles.badgeText}>
            {`חוות ${item.ranchName}` || `חווה #${item.ranchId}`}
          </Text>
        </View>

        <Pressable
          style={horsesStyles.primaryButton}
          onPress={function () {
            props.onEdit(item);
          }}
        >
          <Text style={horsesStyles.primaryButtonText}>עריכת כינוי</Text>
        </Pressable>
      </View>
    </View>
  );
}
