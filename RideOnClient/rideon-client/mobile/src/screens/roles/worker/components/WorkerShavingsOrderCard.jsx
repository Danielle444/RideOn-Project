import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import workerStyles from "../../../../styles/workerStyles";
import { getDeliveryDestinationDisplay } from "../../../../../../shared/shavings/shavingsDestination.utils";

// House date format, mirroring PayerCompetitionAccountScreen's formatDate/
// formatTime (toLocaleDateString + manual HH:mm) - timestamp only, no
// "מיידי/עכשיו" label.
function formatRequestedDeliveryTime(value) {
  if (!value) return null;

  var date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  var datePart = date.toLocaleDateString("he-IL");
  var hours = String(date.getHours()).padStart(2, "0");
  var minutes = String(date.getMinutes()).padStart(2, "0");

  return datePart + " " + hours + ":" + minutes;
}

// The stored deliveryStatus carries only {Pending, Delivered} (backward-compat model).
// "Seen" is DERIVED, never stored: a claimed order stays stored-Pending, so branching on
// the raw token alone would never reach Seen. Derived state, in precedence order:
//   Cancelled           if isCancelled is true (own productchangerequest, Approved) - full
//                        stop, wins over Delivered too: the order is void regardless of
//                        whatever delivery progress happened before the cancellation was
//                        approved. Same precedence already locked for the payer account
//                        screens in payerAccountLifecycle.js's resolveShavingsLifecycleState.
//   PendingCancellation if hasPendingCancellation is true - full stop, wins over the normal
//                        Pending/Seen/Delivered derivation below (a claimed order stays
//                        PendingCancellation, not Seen, while the cancellation is pending).
//   Delivered           if arrivalTime set (or the stored token is already 'Delivered')
//   Seen                else if the order is claimed (workerSystemUserId set, or it is my order)
//   Pending              otherwise
// isCancelled/hasPendingCancellation come straight from the DB (usp_getshavingsordersfor-
// workerbycompetition / usp_getworkerhomeshavingsfeed), never inferred from Hebrew text or
// other UI state.
function deriveState(props) {
  if (props.isCancelled === true) {
    return "Cancelled";
  }

  if (props.hasPendingCancellation === true) {
    return "PendingCancellation";
  }

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
  if (state === "PendingCancellation") return "ממתין לביטול";
  if (state === "Cancelled") return "בוטל";
  return state;
}

export default function WorkerShavingsOrderCard(props) {
  const state = deriveState(props);
  const statusLabel = getStatusLabel(state);
  const busy = props.uploading || props.marking;

  const isDelivered = state === "Delivered";
  // Cancelled is resolved/non-actionable exactly like Delivered - collapsed by default,
  // reusing the same "isDelivered"-shaped chevron/expand affordance below rather than a
  // second, parallel collapse mechanism.
  const isResolved = isDelivered || state === "Cancelled";
  const [expanded, setExpanded] = useState(false);
  const showFullDetails = !isResolved || expanded;

  // Delivery destination replaces the legacy stallNumber title entirely — stallNumber is a
  // typed NULL from the proc since the DB-side destination-contract slice, never a real join
  // any more. Prominent by design (business rule: a worker must be able to physically deliver
  // without opening another screen), so it renders as the card's headline, not a detail row.
  const destination = getDeliveryDestinationDisplay(props);
  const requestedTimeText = formatRequestedDeliveryTime(
    props.requestedDeliveryTime,
  );

  const headerBlock = (
    <>
      <View style={roleSharedStyles.cardTopRow}>
        <View style={workerStyles.orderIconBox}>
          <Ionicons name="cube-outline" size={30} color="#8B6352" />
        </View>

        <View style={roleSharedStyles.cardTextWrap}>
          {destination.emptyText ? (
            <Text
              style={[roleSharedStyles.cardTitle, workerStyles.destinationUnassignedText]}
            >
              {destination.emptyText}
            </Text>
          ) : (
            <>
              {destination.lines.map(function (line, index) {
                return (
                  <Text key={index} style={roleSharedStyles.cardTitle}>
                    {line}
                  </Text>
                );
              })}
              {destination.warningText && (
                <Text style={workerStyles.destinationWarningText}>
                  {destination.warningText}
                </Text>
              )}
            </>
          )}

          <View style={workerStyles.orderStatusBadge}>
            <Text style={workerStyles.orderStatusText}>{statusLabel}</Text>
          </View>
        </View>

        {isResolved && (
          <Ionicons
            name={expanded ? "chevron-up-outline" : "chevron-down-outline"}
            size={20}
            color="#8B6352"
          />
        )}
      </View>

      {requestedTimeText && (
        <View style={workerStyles.orderDetailRow}>
          <Text style={workerStyles.orderDetailLabel}>מועד מבוקש:</Text>
          <Text style={workerStyles.orderDetailValue}>
            {requestedTimeText}
          </Text>
        </View>
      )}
    </>
  );

  return (
    <View style={roleSharedStyles.card}>
      {isResolved ? (
        <Pressable
          onPress={function () {
            setExpanded(!expanded);
          }}
        >
          {headerBlock}
        </Pressable>
      ) : (
        headerBlock
      )}

      {showFullDetails && (
        <View style={workerStyles.orderDetailsWrap}>
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
      )}

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
                    name={props.capturePhotoIcon || "camera-outline"}
                    size={18}
                    color="#fff"
                    style={{ marginLeft: 6 }}
                  />
                  <Text style={roleSharedStyles.primaryButtonText}>
                    {props.capturePhotoLabel || "צלם ואשר אספקה"}
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

      {/* Delivered — terminal confirmation, only when expanded (collapsed by default, CAP-6) */}
      {state === "Delivered" && showFullDetails && (
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

      {/* Pending cancellation — no claim/deliver/photo action renders for this state (see
          the button blocks above, each gated on a different state string). If the order was
          already claimed before the cancellation request, preserve that worker context here
          instead of silently dropping it (business rule: lock actions, don't hide who has it). */}
      {state === "PendingCancellation" &&
        (props.workerFirstName || props.workerLastName) && (
          <View
            style={[roleSharedStyles.buttonsRow, { justifyContent: "center" }]}
          >
            <Ionicons name="person-outline" size={16} color="#8B6352" />
            <Text style={[workerStyles.orderDetailLabel, { marginRight: 4 }]}>
              בטיפול: {props.workerFirstName} {props.workerLastName}
            </Text>
          </View>
        )}

      {/* Cancelled — terminal, non-actionable, only when expanded (collapsed by default,
          same convention as Delivered above). */}
      {state === "Cancelled" && showFullDetails && (
        <View
          style={[roleSharedStyles.buttonsRow, { justifyContent: "center" }]}
        >
          <Ionicons name="close-circle-outline" size={16} color="#B0453B" />
          <Text
            style={[
              workerStyles.orderDetailLabel,
              { marginRight: 4, color: "#B0453B" },
            ]}
          >
            בוטל
          </Text>
        </View>
      )}
    </View>
  );
}
