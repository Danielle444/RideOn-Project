import { Text, TextInput, View } from "react-native";
import horsesStyles from "../../styles/horsesStyles";

export default function HorseSearchCard(props) {
  return (
    <View style={horsesStyles.searchCard}>
      <Text style={horsesStyles.searchLabel}>חיפוש סוסים</Text>

      <TextInput
        value={props.searchText}
        onChangeText={props.onChangeSearchText}
        placeholder="חיפוש לפי שם סוס, כינוי, מספר התאחדות או שבב"
        placeholderTextColor="#B7AAA3"
        style={horsesStyles.searchInput}
      />

      <Text style={horsesStyles.helperText}>
        ניתן לחפש לפי שם הסוס, כינוי, מספר התאחדות או מספר שבב
      </Text>
    </View>
  );
}