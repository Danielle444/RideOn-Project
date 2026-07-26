import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import workerStyles from "../../../../styles/workerStyles";

// The stored deliveryStatus carries only {Pending, Delivered} (backward-compat model).
// "Seen" is DERIVED, never stored: a claimed order stays stored-Pending, so branching on
// the raw token alone would never reach Seen. Derived state:
//   Delivered  if arrivalTime set (or the stored token is already 'Delivered')
//   Seen       else if the order is claimed (workerSystemUserId set, or it is my order)
//   Pending    otherwise
function deriveState(props) {
  if (props.deliveryStatus === "Delivered" || props.arrivalTime) {
    return "Delivered";
  }

  const claimed =
    (props.workerSystemUserId !== null &&
      props.workerSystemUserId !== undefined) ||
    props.isMyOrder === true;

  if (claimed) {
    return "Seen";
  }

  return "Pending";
}

function getStatusLabel(state) {
  if (state === "Pending") return "ממתין לאספקה";
  if (state === "Seen") return "בטיפול";
  if (state === "Delivered") return "סופק";
  return state;
}

export default function WorkerShavingsOrderCard(props) {
  const state = deriveState(props);
  const statusLabel = getStatusLabel(state);
  const busy = props.uploading || props.marking;

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

      {/* Pending + unclaimed — show claim button */}
      {state === "Pending" && props.isUnclaimed && props.onClaim && (
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
                <Text style={roleSharedStyles.primaryButtonText}>קח טיפול</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {/* Seen + mine — deliver: photo primary, no-photo fallback after an upload failure */}
      {state === "Seen" && props.isMyOrder && (
        <View style={{ gap: 8 }}>
          <View style={roleSharedStyles.buttonsRow}>
            <Pressable
              style={[
                roleSharedStyles.primaryButton,
                { opacity: busy ? 0.6 : 1 },
              ]}
              onPress={props.onCapturePhoto}
              disabled={busy}
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

          {props.showNoPhotoFallback && (
            <View style={roleSharedStyles.buttonsRow}>
              <Pressable
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#B08D7E",
                  backgroundColor: "#F7F1ED",
                  opacity: busy ? 0.6 : 1,
                  flex: 1,
                }}
                onPress={props.onMarkDelivered}
                disabled={busy}
              >
                {props.marking ? (
                  <ActivityIndicator color="#5D4037" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-done-outline"
                      size={18}
                      color="#5D4037"
                    />
                    <Text style={{ color: "#5D4037", fontWeight: "600" }}>
                      סמן כסופק ללא תמונה
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Claimed by another worker (derived Seen, not mine) */}
      {state === "Seen" && props.isTakenByOther && (
        <View
          style={[roleSharedStyles.buttonsRow, { justifyContent: "center" }]}
        >
          <Ionicons name="person-outline" size={16} color="#8B6352" />
          <Text style={[workerStyles.orderDetailLabel, { marginRight: 4 }]}>
            בטיפול: {props.workerFirstName} {props.workerLastName}
          </Text>
        </View>
      )}

      {/* Delivered — terminal confirmation */}
      {state === "Delivered" && (
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
            סופק
          </Text>
        </View>
      )}
    </View>
  );
}
