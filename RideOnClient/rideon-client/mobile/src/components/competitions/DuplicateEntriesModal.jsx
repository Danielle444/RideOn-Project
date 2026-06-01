import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  getMyPastCompetitionsWithEntries,
  getDuplicatableEntriesFromCompetition,
  bulkDuplicateEntries,
} from "../../services/entriesService";

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

function formatDateRange(start, end) {
  return formatDate(start) + " - " + formatDate(end);
}

function extractErrorMessage(err) {
  if (!err) return "אירעה שגיאה";
  if (typeof err === "string") return err;
  var data = err.response && err.response.data;
  if (data) {
    if (typeof data === "string") return data;
    if (data.message) return String(data.message);
    if (data.error) return String(data.error);
    try {
      return JSON.stringify(data);
    } catch {
      return "אירעה שגיאה";
    }
  }
  if (err.message) return err.message;
  return "אירעה שגיאה";
}

export default function DuplicateEntriesModal(props) {
  var isOpen = props.isOpen === true;

  var activeCompetitionId = props.activeCompetitionId || null;

  var ranchId = props.ranchId || null;

  var onClose = props.onClose || function () {};

  var onDuplicated = props.onDuplicated || function () {};

  var [step, setStep] = useState("pick-comp");

  var [loading, setLoading] = useState(false);

  var [screenError, setScreenError] = useState("");

  var [pastComps, setPastComps] = useState([]);

  var [selectedComp, setSelectedComp] = useState(null);

  var [entries, setEntries] = useState([]);

  var [checked, setChecked] = useState({});

  var [submitting, setSubmitting] = useState(false);

  useEffect(
    function () {
      if (!isOpen) return;
      resetState();
      loadPastComps();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOpen, activeCompetitionId, ranchId],
  );

  function resetState() {
    setStep("pick-comp");
    setPastComps([]);
    setSelectedComp(null);
    setEntries([]);
    setChecked({});
    setScreenError("");
    setSubmitting(false);
  }

  function loadPastComps() {
    if (!activeCompetitionId || !ranchId) return;

    setLoading(true);
    setScreenError("");

    getMyPastCompetitionsWithEntries(activeCompetitionId, ranchId)
      .then(function (response) {
        setPastComps(Array.isArray(response.data) ? response.data : []);
      })
      .catch(function (err) {
        setScreenError(extractErrorMessage(err));
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function handlePickComp(comp) {
    setSelectedComp(comp);
    setStep("pick-entries");
    setLoading(true);
    setScreenError("");
    setEntries([]);
    setChecked({});

    getDuplicatableEntriesFromCompetition(
      comp.competitionId,
      activeCompetitionId,
      ranchId,
    )
      .then(function (response) {
        var list = Array.isArray(response.data) ? response.data : [];
        setEntries(list);

        var initial = {};
        list.forEach(function (item) {
          var canDuplicate =
            item.targetClassInCompId && !item.alreadyExists;
          if (canDuplicate) {
            initial[item.sourceEntryId] = true;
          }
        });
        setChecked(initial);
      })
      .catch(function (err) {
        setScreenError(extractErrorMessage(err));
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function handleBackToCompPick() {
    setStep("pick-comp");
    setSelectedComp(null);
    setEntries([]);
    setChecked({});
    setScreenError("");
  }

  function toggleEntry(sourceEntryId, eligible) {
    if (!eligible) return;
    setChecked(function (prev) {
      var next = Object.assign({}, prev);
      if (next[sourceEntryId]) {
        delete next[sourceEntryId];
      } else {
        next[sourceEntryId] = true;
      }
      return next;
    });
  }

  var selectedItems = useMemo(
    function () {
      return entries.filter(function (item) {
        return (
          checked[item.sourceEntryId] === true &&
          item.targetClassInCompId &&
          !item.alreadyExists
        );
      });
    },
    [entries, checked],
  );

  function handleSubmit() {
    if (selectedItems.length === 0) {
      Alert.alert("בחירה ריקה", "סמן לפחות הרשמה אחת לשכפול");
      return;
    }

    Alert.alert(
      "שכפול הרשמות",
      "האם לשכפל " + selectedItems.length + " הרשמות לתחרות הפעילה?",
      [
        { text: "לא", style: "cancel" },
        {
          text: "כן",
          onPress: doSubmit,
        },
      ],
    );
  }

  function doSubmit() {
    setSubmitting(true);

    var payload = {
      sourceCompetitionId: selectedComp.competitionId,
      targetCompetitionId: activeCompetitionId,
      ranchId: ranchId,
      entries: selectedItems.map(function (item) {
        return {
          sourceEntryId: item.sourceEntryId,
          targetClassInCompId: item.targetClassInCompId,
        };
      }),
    };

    bulkDuplicateEntries(payload)
      .then(function (response) {
        var data = response.data || {};
        var successCount = data.successCount || 0;
        var failureCount = data.failureCount || 0;

        var message =
          "שכפול הסתיים. הצליחו: " +
          successCount +
          (failureCount > 0 ? " · נכשלו: " + failureCount : "");

        Alert.alert("הסתיים", message, [
          {
            text: "אישור",
            onPress: function () {
              onDuplicated();
              onClose();
            },
          },
        ]);
      })
      .catch(function (err) {
        Alert.alert("שגיאה", extractErrorMessage(err));
      })
      .finally(function () {
        setSubmitting(false);
      });
  }

  function renderHeader() {
    return (
      <View
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: "#E7D6CA",
          backgroundColor: "#FFFFFF",
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#4F3B31" }}>
          {step === "pick-comp"
            ? "שכפול מתחרות קודמת"
            : "בחירת הרשמות לשכפול"}
        </Text>

        <Pressable hitSlop={8} onPress={onClose}>
          <Ionicons name="close" size={26} color="#5A4036" />
        </Pressable>
      </View>
    );
  }

  function renderCompList() {
    if (loading) {
      return (
        <View style={{ padding: 30, alignItems: "center" }}>
          <ActivityIndicator color="#7B5A4D" />
          <Text style={{ marginTop: 10, color: "#5A4036" }}>טוען תחרויות...</Text>
        </View>
      );
    }

    if (screenError) {
      return (
        <View style={{ padding: 18 }}>
          <Text style={{ color: "#A0522D", textAlign: "right" }}>
            {screenError}
          </Text>
        </View>
      );
    }

    if (pastComps.length === 0) {
      return (
        <View style={{ padding: 18 }}>
          <Text style={{ color: "#5A4036", textAlign: "right" }}>
            אין תחרויות קודמות עם הרשמות שלך לשכפול
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={pastComps}
        keyExtractor={function (item) {
          return String(item.competitionId);
        }}
        contentContainerStyle={{ padding: 12 }}
        renderItem={function ({ item }) {
          return (
            <Pressable
              onPress={function () {
                handlePickComp(item);
              }}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#E7D6CA",
                padding: 14,
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "800",
                  color: "#4F3B31",
                  textAlign: "right",
                  marginBottom: 4,
                }}
              >
                {item.competitionName}
              </Text>

              <Text
                style={{
                  fontSize: 13,
                  color: "#6D564A",
                  textAlign: "right",
                  marginBottom: 2,
                }}
              >
                {formatDateRange(
                  item.competitionStartDate,
                  item.competitionEndDate,
                )}
              </Text>

              <Text
                style={{
                  fontSize: 13,
                  color: "#6D564A",
                  textAlign: "right",
                  marginBottom: 6,
                }}
              >
                חווה מארחת: {item.hostRanchName}
              </Text>

              <View
                style={{
                  alignSelf: "flex-end",
                  backgroundColor: "#7B5A4D",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}
                >
                  {item.entryCount} הרשמות
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    );
  }

  function renderEntryRow(item) {
    var eligible = !!item.targetClassInCompId && !item.alreadyExists;

    var isChecked = checked[item.sourceEntryId] === true && eligible;

    var statusText = "";
    var statusColor = "#6D564A";

    if (!item.targetClassInCompId) {
      statusText = "אין מקצה תואם בתחרות הפעילה";
      statusColor = "#A0522D";
    } else if (item.alreadyExists) {
      statusText = "כבר רשום במקצה הזה בתחרות הפעילה";
      statusColor = "#A0522D";
    } else {
      statusText = "ניתן לשכפל";
      statusColor = "#3F7A4B";
    }

    return (
      <Pressable
        key={String(item.sourceEntryId)}
        onPress={function () {
          toggleEntry(item.sourceEntryId, eligible);
        }}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: isChecked ? "#7B5A4D" : "#E7D6CA",
          padding: 14,
          marginBottom: 10,
          opacity: eligible ? 1 : 0.6,
        }}
      >
        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 10,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: isChecked ? "#7B5A4D" : "#C9B7AC",
              backgroundColor: isChecked ? "#7B5A4D" : "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isChecked ? (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            ) : null}
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "800",
                color: "#4F3B31",
                textAlign: "right",
                marginBottom: 2,
              }}
            >
              {item.sourceClassName}
            </Text>

            <Text
              style={{
                fontSize: 13,
                color: "#6D564A",
                textAlign: "right",
                marginBottom: 2,
              }}
            >
              {item.riderName} • {item.horseName}
              {item.barnName ? " (" + item.barnName + ")" : ""}
            </Text>

            <Text
              style={{
                fontSize: 12,
                color: "#6D564A",
                textAlign: "right",
                marginBottom: 4,
              }}
            >
              משלם: {item.payerName}
              {item.coachName ? " · מאמן: " + item.coachName : ""}
            </Text>

            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: statusColor,
                textAlign: "right",
              }}
            >
              {statusText}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  function renderEntriesList() {
    if (loading) {
      return (
        <View style={{ padding: 30, alignItems: "center" }}>
          <ActivityIndicator color="#7B5A4D" />
          <Text style={{ marginTop: 10, color: "#5A4036" }}>טוען הרשמות...</Text>
        </View>
      );
    }

    if (screenError) {
      return (
        <View style={{ padding: 18 }}>
          <Text style={{ color: "#A0522D", textAlign: "right" }}>
            {screenError}
          </Text>
        </View>
      );
    }

    if (entries.length === 0) {
      return (
        <View style={{ padding: 18 }}>
          <Text style={{ color: "#5A4036", textAlign: "right" }}>
            אין הרשמות לשכפול בתחרות הזו
          </Text>
        </View>
      );
    }

    var eligibleCount = entries.filter(function (item) {
      return item.targetClassInCompId && !item.alreadyExists;
    }).length;

    return (
      <ScrollView
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      >
        <View
          style={{
            backgroundColor: "#F2E4D9",
            borderRadius: 10,
            padding: 10,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: "#5A4036",
              textAlign: "right",
            }}
          >
            תחרות מקור: {selectedComp ? selectedComp.competitionName : ""}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: "#6D564A",
              textAlign: "right",
              marginTop: 4,
            }}
          >
            סה״כ הרשמות: {entries.length} · ניתנות לשכפול: {eligibleCount} · נבחרו:{" "}
            {selectedItems.length}
          </Text>
        </View>

        {entries.map(renderEntryRow)}
      </ScrollView>
    );
  }

  function renderFooter() {
    if (step !== "pick-entries") return null;

    return (
      <View
        style={{
          flexDirection: "row-reverse",
          gap: 10,
          padding: 12,
          borderTopWidth: 1,
          borderTopColor: "#E7D6CA",
          backgroundColor: "#FFFFFF",
        }}
      >
        <Pressable
          onPress={handleBackToCompPick}
          style={{
            flex: 1,
            backgroundColor: "#F0E5DC",
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: "center",
          }}
          disabled={submitting}
        >
          <Text style={{ color: "#5A4036", fontWeight: "800" }}>חזרה</Text>
        </Pressable>

        <Pressable
          onPress={handleSubmit}
          disabled={submitting || selectedItems.length === 0}
          style={{
            flex: 2,
            backgroundColor:
              submitting || selectedItems.length === 0 ? "#B8A496" : "#7B5A4D",
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
            {submitting
              ? "משכפל..."
              : "שכפל " + selectedItems.length + " הרשמות"}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={{ flex: 1, backgroundColor: "#F8F4F1" }}>
        {renderHeader()}

        <View style={{ flex: 1 }}>
          {step === "pick-comp" ? renderCompList() : renderEntriesList()}
        </View>

        {renderFooter()}
      </View>
    </Modal>
  );
}
