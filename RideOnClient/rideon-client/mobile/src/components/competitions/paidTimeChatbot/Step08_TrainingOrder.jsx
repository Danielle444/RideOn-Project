import React from "react";
import { Text, View } from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";
import { Ionicons } from "@expo/vector-icons";
import StepLayout from "./StepLayout";
import styles, { COLORS } from "../../../styles/paidTimeChatbotStyles";

function formatHorseLabel(horse) {
  const name = horse.horseName || "סוס";
  const barn = horse.barnName || "";
  return barn ? name + " (" + barn + ")" : name;
}

export default function Step08_TrainingOrder(props) {
  const chatbot = props.chatbot;
  const ctx = chatbot.state.context || {};
  const coachesWithHorses = ctx.coachesWithHorses || [];
  const selectedCoachIds = chatbot.state.answers.selectedCoachIds || [];
  const horsesPerCoach = chatbot.state.answers.horsesPerCoach || {};
  const trainingOrder = chatbot.state.answers.trainingOrder || {};

  const selectedCoaches = coachesWithHorses.filter(function (c) {
    return selectedCoachIds
      .map(String)
      .includes(String(c.coachFederationMemberId));
  });

  function getHorsesForCoach(coach) {
    const coachId = coach.coachFederationMemberId;
    const allHorses = coach.horses || [];
    const selectedIds = horsesPerCoach[coachId] || [];
    const orderForCoach = trainingOrder[coachId];

    const selectedHorses = allHorses.filter(function (h) {
      return selectedIds.map(String).includes(String(h.horseId));
    });

    if (Array.isArray(orderForCoach) && orderForCoach.length === selectedHorses.length) {
      const byId = {};
      for (const h of selectedHorses) byId[h.horseId] = h;
      return orderForCoach
        .map(function (id) {
          return byId[id];
        })
        .filter(Boolean);
    }

    return selectedHorses;
  }

  function handleReorder(coachId, newData) {
    const newOrder = newData.map(function (h) {
      return h.horseId;
    });
    chatbot.setAnswer("trainingOrder", {
      ...trainingOrder,
      [coachId]: newOrder,
    });
  }

  return (
    <StepLayout
      bubbles={[
        "סדר אימון מועדף - גרור את הסוסים לסדר שתרצה לכל מאמן.",
        "אם לא תזיז כלום - המערכת תקבע סדר חכם לבד. זו העדפה, לא חובה.",
      ]}
      onNext={chatbot.next}
      onBack={chatbot.prev}
      canAdvance={true}
    >
      {selectedCoaches.length === 0 ? (
        <Text style={styles.bubbleTextBot}>לא נבחרו מאמנים.</Text>
      ) : (
        <View>
          {selectedCoaches.map(function (coach, idx) {
            const coachId = coach.coachFederationMemberId;
            const horses = getHorsesForCoach(coach);

            if (horses.length === 0) return null;

            return (
              <View
                key={"order-" + coachId}
                style={{
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottomWidth: idx < selectedCoaches.length - 1 ? 1 : 0,
                  borderBottomColor: COLORS.border,
                }}
              >
                <Text
                  style={[
                    styles.bubbleTextBot,
                    { fontWeight: "700", marginBottom: 8 },
                  ]}
                >
                  מאמן: {coach.coachName}
                </Text>

                <DraggableFlatList
                  data={horses}
                  keyExtractor={function (item) {
                    return "h-" + coachId + "-" + item.horseId;
                  }}
                  onDragEnd={function (info) {
                    handleReorder(coachId, info.data);
                  }}
                  scrollEnabled={false}
                  renderItem={function (params) {
                    const isActive = params.isActive;
                    const drag = params.drag;
                    const item = params.item;
                    const index = params.getIndex ? params.getIndex() : 0;

                    return (
                      <View
                        style={[
                          styles.optionRow,
                          {
                            opacity: isActive ? 0.7 : 1,
                            backgroundColor: isActive
                              ? COLORS.primaryLight
                              : "#FFFFFF",
                          },
                        ]}
                      >
                        <View
                          onTouchStart={drag}
                          style={{
                            paddingRight: 4,
                            paddingLeft: 8,
                          }}
                        >
                          <Ionicons
                            name="reorder-three"
                            size={22}
                            color={COLORS.textMuted}
                          />
                        </View>
                        <Text
                          style={[
                            styles.optionLabel,
                            { fontWeight: "600", color: COLORS.primary },
                          ]}
                        >
                          {(index || 0) + 1}.
                        </Text>
                        <Text style={[styles.optionLabel, { flex: 5 }]}>
                          {formatHorseLabel(item)}
                        </Text>
                      </View>
                    );
                  }}
                />
              </View>
            );
          })}

          <Text
            style={[
              styles.bubbleTextBot,
              { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
            ]}
          >
            טיפ: לחץ ארוך על האייקון השמאלי וגרור למעלה/למטה.
          </Text>
        </View>
      )}
    </StepLayout>
  );
}
