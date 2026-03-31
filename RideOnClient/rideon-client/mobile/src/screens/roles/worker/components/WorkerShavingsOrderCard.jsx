import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import workerStyles from "../../../../styles/workerStyles";

export default function WorkerShavingsOrderCard(props) {
  return (
    <View style={roleSharedStyles.card}>
      <View style={roleSharedStyles.cardTopRow}>
        <View style={workerStyles.orderIconBox}>
          <Ionicons name="cube-outline" size={30} color="#8B6352" />
        </View>

        <View style={roleSharedStyles.cardTextWrap}>
          <Text style={roleSharedStyles.cardTitle}>{props.orderTitle}</Text>

          <View style={workerStyles.orderStatusBadge}>
            <Text style={workerStyles.orderStatusText}>{props.orderStatus}</Text>
          </View>
        </View>
      </View>

      <View style={workerStyles.orderDetailsWrap}>
        <View style={workerStyles.orderDetailRow}>
          <Text style={workerStyles.orderDetailLabel}>שם חווה:</Text>
          <Text style={workerStyles.orderDetailValue}>{props.ranchName}</Text>
        </View>

        <View style={workerStyles.orderDetailRow}>
          <Text style={workerStyles.orderDetailLabel}>מספר תא/ים:</Text>
          <Text style={workerStyles.orderDetailValue}>{props.stallNumber}</Text>
        </View>

        <View style={workerStyles.orderDetailRow}>
          <Text style={workerStyles.orderDetailLabel}>כמות שקי נסורת:</Text>
          <Text style={workerStyles.orderDetailValue}>{props.bagsAmount}</Text>
        </View>
      </View>

      <View style={roleSharedStyles.buttonsRow}>
        <Pressable
          style={[roleSharedStyles.primaryButton, workerStyles.doneButton]}
          onPress={props.onDonePress}
        >
          <Text style={roleSharedStyles.primaryButtonText}>סופק</Text>
        </Pressable>

        <Pressable
          style={roleSharedStyles.primaryButton}
          onPress={props.onInTreatmentPress}
        >
          <Text style={roleSharedStyles.primaryButtonText}>בטיפול</Text>
        </Pressable>
      </View>
    </View>
  );
}