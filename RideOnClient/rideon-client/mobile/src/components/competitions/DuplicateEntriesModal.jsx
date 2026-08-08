import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { getApiErrorMessage } from "../../../../shared/auth/utils/authApiErrors";

import {
  getMyPastCompetitionsWithEntries,
  getDuplicatableEntriesFromCompetition,
  bulkDuplicateEntries,
} from "../../services/entriesService";
import {
  getVisibleDuplicateEntries,
  isDuplicateEntryEligible,
  getDuplicateEntryCounts,
} from "../../utils/duplicateEntriesVisibility";
import AppDialog from "../common/AppDialog";
import { showToast } from "../../services/toastService";

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

// Consolidated onto the shared, hardened extractor (RideOn notification
// audit, 2026-08-07, Slice 2) - the local version used to JSON.stringify an
// unrecognized object body as a last resort, which could leak raw backend
// shape to the user. Name/signature kept so every call site below is
// untouched.
function extractErrorMessage(err) {
  return getApiErrorMessage(err, "אירעה שגיאה");
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

  var [confirmDuplicateOpen, setConfirmDuplicateOpen] = useState(false);

  // Post-duplicate summary stays a single-button AppDialog (not a toast) -
  // its acknowledgement gates onDuplicated()+onClose(), same as the native
  // Alert it replaces.
  var [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  var [summaryMessage, setSummaryMessage] = useState("");

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
    setConfirmDuplicateOpen(false);
    setSummaryDialogOpen(false);
    setSummaryMessage("");
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
          if (isDuplicateEntryEligible(item)) {
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

  // CAP-4: derived from the same visible set the list itself renders, so a
  // now-hidden (no target class) row can never contribute to the selected
  // count even if it was checked before the fetch that hid it.
  var visibleEntries = useMemo(
    function () {
      return getVisibleDuplicateEntries(entries);
    },
    [entries],
  );

  var selectedItems = useMemo(
    function () {
      return visibleEntries.filter(function (item) {
        return checked[item.sourceEntryId] === true && isDuplicateEntryEligible(item);
      });
    },
    [visibleEntries, checked],
  );

  function handleSubmit() {
    if (selectedItems.length === 0) {
      showToast("סמן לפחות הרשמה אחת לשכפול", "warning");
      return;
    }

    setConfirmDuplicateOpen(true);
  }

  function handleConfirmDuplicateCancel() {
    setConfirmDuplicateOpen(false);
  }

  function handleConfirmDuplicateConfirm() {
    setConfirmDuplicateOpen(false);
    doSubmit();
  }

  function handleSummaryDialogAcknowledge() {
    setSummaryDialogOpen(false);
    onDuplicated();
    onClose();
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

        setSummaryMessage(message);
        setSummaryDialogOpen(true);
      })
      .catch(function (err) {
        showToast(extractErrorMessage(err), "error");
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
    // Every row reaching this function already has a targetClassInCompId -
    // rows without one are excluded upstream by visibleEntries (CAP-4) - so
    // "no matching class" is no longer a reachable status here.
    var eligible = isDuplicateEntryEligible(item);

    var isChecked = checked[item.sourceEntryId] === true && eligible;

    var statusText = "";
    var statusColor = "#6D564A";

    if (item.alreadyExists) {
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

    if (visibleEntries.length === 0) {
      return (
        <View style={{ padding: 18 }}>
          <Text style={{ color: "#5A4036", textAlign: "right" }}>
            אין הרשמות לשכפול בתחרות הזו
          </Text>
        </View>
      );
    }

    var counts = getDuplicateEntryCounts(visibleEntries);

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
            סה״כ הרשמות: {counts.total} · ניתנות לשכפול: {counts.eligible} · נבחרו:{" "}
            {selectedItems.length}
          </Text>
        </View>

        {visibleEntries.map(renderEntryRow)}
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

      <AppDialog
        visible={confirmDuplicateOpen}
        title="שכפול הרשמות"
        message={"האם לשכפל " + selectedItems.length + " הרשמות לתחרות הפעילה?"}
        confirmLabel="כן"
        cancelLabel="לא"
        onConfirm={handleConfirmDuplicateConfirm}
        onCancel={handleConfirmDuplicateCancel}
      />

      <AppDialog
        visible={summaryDialogOpen}
        type="success"
        title="הסתיים"
        message={summaryMessage}
        confirmLabel="אישור"
        onConfirm={handleSummaryDialogAcknowledge}
      />
    </Modal>
  );
}
