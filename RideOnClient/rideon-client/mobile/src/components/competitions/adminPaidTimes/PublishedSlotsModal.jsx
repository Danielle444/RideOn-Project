import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { getPublishedSlotsForCompetition } from "../../../services/paidTimeRequestsService";
import SlotScheduleModal from "./SlotScheduleModal";

function fmtTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function fmtDate(value) {
  if (!value) return "";
  var d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "numeric",
  });
}

// Modal לרשימת כל הסלוטים שפורסמו בתחרות.
// לחיצה על סלוט פותחת SlotScheduleModal של אותו סלוט.
export default function PublishedSlotsModal(props) {
  var isOpen = !!props.isOpen;
  var competitionId = props.competitionId;
  var ranchId = props.ranchId;

  var [slots, setSlots] = useState([]);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);
  var [selectedSlotId, setSelectedSlotId] = useState(null);

  useEffect(
    function () {
      if (!isOpen) return;

      var cancelled = false;
      setLoading(true);
      setError(null);

      async function load() {
        try {
          var res = await getPublishedSlotsForCompetition(competitionId, ranchId);
          if (cancelled) return;
          setSlots(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
          if (!cancelled) {
            setError(
              String(err?.response?.data || err?.message || "טעינה נכשלה")
            );
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      load();
      return function () {
        cancelled = true;
      };
    },
    [isOpen, competitionId, ranchId]
  );

  return (
    <>
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={props.onClose}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 16,
              maxHeight: "90%",
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: "#3F312B",
                textAlign: "right",
                marginBottom: 10,
              }}
            >
              סלוטים שפורסמו
            </Text>

            {loading ? (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <ActivityIndicator size="large" color="#7B5A4D" />
                <Text style={{ marginTop: 8, color: "#8D6E63" }}>
                  טוען סלוטים...
                </Text>
              </View>
            ) : error ? (
              <Text
                style={{
                  color: "#B45454",
                  fontSize: 13,
                  textAlign: "right",
                  marginVertical: 12,
                }}
              >
                {error}
              </Text>
            ) : slots.length === 0 ? (
              <Text
                style={{
                  color: "#8D6E63",
                  fontSize: 13,
                  textAlign: "right",
                  marginVertical: 12,
                }}
              >
                עדיין לא פורסמו סלוטים בתחרות זו.
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 480 }}>
                {slots.map(function (s) {
                  return (
                    <Pressable
                      key={"slot-" + s.paidTimeSlotInCompId}
                      onPress={function () {
                        setSelectedSlotId(s.paidTimeSlotInCompId);
                      }}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: "#D9CFC2",
                        backgroundColor: "#FFFDFB",
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: "#3F312B",
                          textAlign: "right",
                        }}
                      >
                        {fmtDate(s.slotDate)}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: "#5A4036",
                          textAlign: "right",
                          marginTop: 2,
                        }}
                      >
                        {fmtTime(s.startTime)} - {fmtTime(s.endTime)} •{" "}
                        {s.arenaName}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row-reverse",
                          gap: 8,
                          marginTop: 6,
                        }}
                      >
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 10,
                            backgroundColor: "#F5EDE8",
                          }}
                        >
                          <Text style={{ fontSize: 11, color: "#7B5A4D" }}>
                            סה"כ משובצים: {s.assignedCount}
                          </Text>
                        </View>
                        {s.myAssignedCount > 0 ? (
                          <View
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 10,
                              backgroundColor: "#7B5A4D",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                color: "#FFFFFF",
                                fontWeight: "700",
                              }}
                            >
                              שלי: {s.myAssignedCount}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <Pressable
              onPress={props.onClose}
              style={{
                marginTop: 12,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#7B5A4D",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#7B5A4D", fontWeight: "700" }}>סגור</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {selectedSlotId ? (
        <SlotScheduleModal
          slotId={selectedSlotId}
          competitionId={competitionId}
          ranchId={ranchId}
          onClose={function () {
            setSelectedSlotId(null);
          }}
        />
      ) : null}
    </>
  );
}
