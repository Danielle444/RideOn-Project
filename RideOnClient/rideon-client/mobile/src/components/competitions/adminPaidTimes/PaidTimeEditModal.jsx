import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { getCompetitionInvitationDetails } from "../../../services/competitionService";
import { updatePaidTimeRequestNotes } from "../../../services/paidTimeRequestsService";

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function normalizePriceItem(item) {
  return {
    priceCatalogId: item.priceCatalogId || item.PriceCatalogId,
    productName: item.productName || item.ProductName || "",
    durationMinutes: item.durationMinutes || item.DurationMinutes || 0,
    itemPrice: item.itemPrice || item.ItemPrice || 0,
  };
}

function normalizeSlot(slot) {
  return {
    paidTimeSlotInCompId:
      slot.paidTimeSlotInCompId || slot.PaidTimeSlotInCompId,
    slotDate: slot.slotDate || slot.SlotDate,
    startTime: slot.startTime || slot.StartTime,
    endTime: slot.endTime || slot.EndTime,
    arenaName: slot.arenaName || slot.ArenaName || "",
  };
}

function fmtDate(value) {
  if (!value) return "";
  var d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("he-IL");
}

function fmtTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

// Modal עריכת בקשת פייד טיים - תומך בעריכת notes / סוג / סלוט מבוקש.
// כללי גישה:
//   - notes + סלוט: זמינים כל עוד canCancel (לא שולם + לא בוטל)
//   - סוג פייד טיים: רק אם canModify (>24h + לא שולם + לא בוטל)
// מקבל item + competitionId + roleId + ranchId + onClose + onSaved.
export default function PaidTimeEditModal(props) {
  var item = props.item;
  var competitionId = props.competitionId;
  var ranchId = props.ranchId;
  var roleId = props.roleId;

  var [notes, setNotes] = useState("");
  var [priceCatalogId, setPriceCatalogId] = useState(null);
  var [requestedSlotId, setRequestedSlotId] = useState(null);
  var [priceOptions, setPriceOptions] = useState([]);
  var [slotOptions, setSlotOptions] = useState([]);
  var [loading, setLoading] = useState(false);
  var [saving, setSaving] = useState(false);
  var [error, setError] = useState(null);

  var canEditProduct = !!item?.canModify;
  var canEditCommon = !!item?.canCancel;

  useEffect(
    function () {
      if (!item) return;

      setNotes(item.notes || "");
      setPriceCatalogId(null);
      setRequestedSlotId(null);
      setError(null);

      var cancelled = false;
      setLoading(true);

      async function load() {
        try {
          var res = await getCompetitionInvitationDetails(
            competitionId,
            roleId,
            ranchId
          );
          if (cancelled) return;
          var data = res?.data || {};

          var sections = safeArray(data.servicePriceSections);
          var ptSection = sections.find(function (s) {
            var name = String(s?.categoryName || "").trim();
            return name === "פייד טיים" || Number(s?.categoryId) === 1;
          });
          var items = safeArray(ptSection?.items).map(normalizePriceItem);
          setPriceOptions(items);

          var slots = safeArray(data.paidTimeSlots).map(normalizeSlot);
          setSlotOptions(slots);
        } catch (err) {
          if (!cancelled) {
            setError(String(err?.response?.data || err?.message || "טעינה נכשלה"));
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
    [item, competitionId, roleId, ranchId]
  );

  async function handleSave() {
    if (!item) return;

    var payload = {
      paidTimeRequestId: item.paidTimeRequestId,
      ranchId: ranchId,
    };

    // notes - תמיד נשלח אם נערך (כולל ניקוי)
    if (notes !== (item.notes || "")) {
      payload.notes = notes;
    }

    if (canEditProduct && priceCatalogId && priceCatalogId !== item.priceCatalogId) {
      payload.priceCatalogId = priceCatalogId;
    }

    if (
      canEditCommon &&
      requestedSlotId &&
      requestedSlotId !== item.requestedCompSlotId
    ) {
      payload.requestedCompSlotId = requestedSlotId;
    }

    if (
      payload.notes === undefined &&
      payload.priceCatalogId === undefined &&
      payload.requestedCompSlotId === undefined
    ) {
      props.onClose();
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await updatePaidTimeRequestNotes(payload);
      props.onSaved && props.onSaved();
      props.onClose();
    } catch (err) {
      setError(String(err?.response?.data || err?.message || "אירעה שגיאה"));
    } finally {
      setSaving(false);
    }
  }

  if (!item) return null;

  return (
    <Modal
      visible={true}
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
              marginBottom: 4,
            }}
          >
            עריכת פייד טיים
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: "#8D6E63",
              textAlign: "right",
              marginBottom: 10,
            }}
          >
            {item.horseName}
            {item.barnName ? " (" + item.barnName + ")" : ""}
          </Text>

          {loading ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <ActivityIndicator size="large" color="#7B5A4D" />
              <Text style={{ marginTop: 8, color: "#8D6E63" }}>
                טוען אפשרויות...
              </Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 520 }}>
              <FieldNotes notes={notes} setNotes={setNotes} />

              <FieldSelector
                label="סלוט מבוקש"
                helper="ניתן להחליף סלוט עד מועד הפייד טיים. שינוי סלוט מאפס שיבוץ קיים והאלגוריתם ירוץ שוב."
                options={slotOptions}
                getKey={function (o) {
                  return o.paidTimeSlotInCompId;
                }}
                getLabel={function (o) {
                  return (
                    fmtDate(o.slotDate) +
                    " | " +
                    fmtTime(o.startTime) +
                    "-" +
                    fmtTime(o.endTime) +
                    " | " +
                    (o.arenaName || "—")
                  );
                }}
                currentId={item.requestedCompSlotId}
                selectedId={requestedSlotId}
                onChange={setRequestedSlotId}
                disabled={!canEditCommon}
                lockedReason={
                  item.isPaid
                    ? "הבקשה שולמה - לא ניתן לשנות סלוט"
                    : item.status === "Cancelled"
                      ? "הבקשה בוטלה"
                      : null
                }
              />

              <FieldSelector
                label="סוג פייד טיים"
                helper="ניתן לשנות רק עד 24 שעות לפני המועד (משפיע על מחיר)."
                options={priceOptions}
                getKey={function (o) {
                  return o.priceCatalogId;
                }}
                getLabel={function (o) {
                  return (
                    o.productName +
                    " (" +
                    o.durationMinutes +
                    " דק') • " +
                    o.itemPrice +
                    " ₪"
                  );
                }}
                currentId={item.priceCatalogId}
                selectedId={priceCatalogId}
                onChange={setPriceCatalogId}
                disabled={!canEditProduct}
                lockedReason={
                  item.isPaid
                    ? "הבקשה שולמה - לא ניתן לשנות סוג"
                    : item.status === "Cancelled"
                      ? "הבקשה בוטלה"
                      : "נותרו <24h - שינוי סוג חסום"
                }
              />
            </ScrollView>
          )}

          {error ? (
            <Text
              style={{
                color: "#B45454",
                fontSize: 13,
                textAlign: "right",
                marginTop: 8,
              }}
            >
              {error}
            </Text>
          ) : null}

          <View
            style={{
              flexDirection: "row-reverse",
              gap: 8,
              marginTop: 12,
            }}
          >
            <Pressable
              onPress={handleSave}
              disabled={saving || loading}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: saving || loading ? "#C4B5AA" : "#7B5A4D",
                alignItems: "center",
              }}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                  שמור
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={props.onClose}
              disabled={saving}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#7B5A4D",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#7B5A4D", fontWeight: "600" }}>
                ביטול
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FieldNotes(props) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: "#3F312B",
          textAlign: "right",
          marginBottom: 4,
        }}
      >
        הערות
      </Text>
      <TextInput
        value={props.notes}
        onChangeText={props.setNotes}
        placeholder="הערות לבקשה"
        placeholderTextColor="#9E8A7F"
        multiline
        style={{
          borderWidth: 1,
          borderColor: "#D9CFC2",
          borderRadius: 8,
          padding: 10,
          minHeight: 80,
          textAlign: "right",
          color: "#3F312B",
        }}
      />
    </View>
  );
}

function FieldSelector(props) {
  var disabled = !!props.disabled;
  var current = props.currentId;
  var selected = props.selectedId;
  var options = props.options || [];

  return (
    <View style={{ marginBottom: 14, opacity: disabled ? 0.5 : 1 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: "#3F312B",
          textAlign: "right",
          marginBottom: 4,
        }}
      >
        {props.label}
      </Text>
      {props.helper ? (
        <Text
          style={{
            fontSize: 11,
            color: "#8D6E63",
            textAlign: "right",
            marginBottom: 6,
          }}
        >
          {props.helper}
        </Text>
      ) : null}

      {disabled && props.lockedReason ? (
        <Text
          style={{
            fontSize: 12,
            color: "#B45454",
            textAlign: "right",
            marginBottom: 6,
          }}
        >
          {props.lockedReason}
        </Text>
      ) : null}

      {options.map(function (o) {
        var key = props.getKey(o);
        var isCurrent = key === current;
        var isSelected = key === selected || (selected == null && isCurrent);
        return (
          <Pressable
            key={"opt-" + key}
            disabled={disabled}
            onPress={function () {
              props.onChange(key);
            }}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: isSelected ? "#7B5A4D" : "#D9CFC2",
              backgroundColor: isSelected ? "#E8DCD0" : "#FFFFFF",
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: "#3F312B",
                textAlign: "right",
                fontWeight: isSelected ? "700" : "400",
              }}
            >
              {props.getLabel(o)}
              {isCurrent ? "  (נוכחי)" : ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
