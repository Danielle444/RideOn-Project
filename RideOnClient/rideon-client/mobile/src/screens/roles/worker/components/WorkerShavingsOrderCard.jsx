import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import workerStyles from "../../../../styles/workerStyles";

function getStatusLabel(status) {
  if (status === "Pending") return "ממתין לאספקה";
  if (status === "WaitingApproval") return "ממתין לאישור מזכירה";
  if (status === "Closed") return "סגורה";
  return status;
}

export default function WorkerShavingsOrderCard(props) {
  const statusLabel = getStatusLabel(props.deliveryStatus);

  return (
    <View style={roleSharedStyles.card}>
      <View style={roleSharedStyles.cardTopRow}>
        <View style={workerStyles.orderIconBox}>
          <Ionicons name="cube-outline" size={30} color="#8B6352" />
        </View>

        <View style={roleSharedStyles.cardTextWrap}>
          <Text style={roleSharedStyles.cardTitle}>{props.orderTitle}</Text>

          <View style={workerStyles.orderStatusBadge}>
            <Text style={workerStyles.orderStatusText}>{statusLabel}</Text>
          </View>
        </View>
      </View>

      <View style={workerStyles.orderDetailsWrap}>
        <View style={workerStyles.orderDetailRow}>
          <Text style={workerStyles.orderDetailLabel}>תא:</Text>
          <Text style={workerStyles.orderDetailValue}>
            {props.stallNumber || "-"}
          </Text>
        </View>

        <View style={workerStyles.orderDetailRow}>
          <Text style={workerStyles.orderDetailLabel}>כמות שקים:</Text>
          <Text style={workerStyles.orderDetailValue}>
            {props.bagQuantity} שקים
          </Text>
        </View>

        <View style={workerStyles.orderDetailRow}>
          <Text style={workerStyles.orderDetailLabel}>משלם:</Text>
          <Text style={workerStyles.orderDetailValue}>
            {props.payerFirstName} {props.payerLastName}
          </Text>
        </View>
      </View>

      {/* Unclaimed — show claim button */}
      {props.isUnclaimed && props.deliveryStatus === "Pending" && (
        <View style={roleSharedStyles.buttonsRow}>
          <Pressable
            style={[
              roleSharedStyles.primaryButton,
              { opacity: props.claiming ? 0.6 : 1, backgroundColor: "#5D4037" },
            ]}
            onPress={props.onClaim}
            disabled={props.claiming}
          >
            {props.claiming ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons
                  name="hand-left-outline"
                  size={18}
                  color="#fff"
                  style={{ marginLeft: 6 }}
                />
                <Text style={roleSharedStyles.primaryButtonText}>
                  קח טיפול
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {/* My order + Pending — show camera button */}
      {props.isMyOrder && props.deliveryStatus === "Pending" && (
        <View style={roleSharedStyles.buttonsRow}>
          <Pressable
            style={[
              roleSharedStyles.primaryButton,
              { opacity: props.uploading ? 0.6 : 1 },
            ]}
            onPress={props.onCapturePhoto}
            disabled={props.uploading}
          >
            {props.uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons
                  name="camera-outline"
                  size={18}
                  color="#fff"
                  style={{ marginLeft: 6 }}
                />
                <Text style={roleSharedStyles.primaryButtonText}>
                  צלם ואשר אספקה
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {/* Taken by another worker */}
      {props.isTakenByOther && props.deliveryStatus === "Pending" && (
        <View
          style={[roleSharedStyles.buttonsRow, { justifyContent: "center" }]}
        >
          <Ionicons name="person-outline" size={16} color="#8B6352" />
          <Text style={[workerStyles.orderDetailLabel, { marginRight: 4 }]}>
            בטיפול: {props.workerFirstName} {props.workerLastName}
          </Text>
        </View>
      )}

      {props.deliveryStatus === "WaitingApproval" && (
        <View
          style={[roleSharedStyles.buttonsRow, { justifyContent: "center" }]}
        >
          <Ionicons name="time-outline" size={16} color="#8B6352" />
          <Text style={[workerStyles.orderDetailLabel, { marginRight: 4 }]}>
            ממתין לאישור מזכירה
          </Text>
        </View>
      )}

      {props.deliveryStatus === "Closed" && (
        <View
          style={[roleSharedStyles.buttonsRow, { justifyContent: "center" }]}
        >
          <Ionicons name="checkmark-circle-outline" size={16} color="#4CAF50" />
          <Text
            style={[
              workerStyles.orderDetailLabel,
              { marginRight: 4, color: "#4CAF50" },
            ]}
          >
            הזמנה סגורה
          </Text>
        </View>
      )}
    </View>
  );
}
