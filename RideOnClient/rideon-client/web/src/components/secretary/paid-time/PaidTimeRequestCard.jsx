import DraggableItem from "../../common/dnd/DraggableItem";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("he-IL");
}

function formatTime(value) {
  if (!value) return "-";
  return String(value).substring(0, 5);
}

function getPaidTimeType(productName) {
  if (!productName) return "פייד־טיים";

  if (productName.includes("ארוך")) {
    return "ארוך";
  }

  if (productName.includes("קצר")) {
    return "קצר";
  }

  return productName;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function fmtMinutesAsTime(min) {
  if (min == null) return null;
  return pad2(Math.floor(min / 60)) + ":" + pad2(min % 60);
}

function safeParseBatch(payload) {
  if (!payload) return null;
  if (typeof payload === "object") return payload;
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function describeTimeRange(obj) {
  if (!obj) return null;
  var e = fmtMinutesAsTime(obj.earliestMinutes);
  var l = fmtMinutesAsTime(obj.latestMinutes);
  if (e && l) return e + " – " + l;
  if (e) return "מ-" + e + " והלאה";
  if (l) return "עד " + l;
  return null;
}

function extractBatchInfo(payload, horseId, coachId) {
  if (!payload) return null;

  var coachLevelPref = payload.timePreferences?.coachLevel?.[coachId];
  var coachLevelCon = payload.timeConstraints?.coachLevel?.[coachId];

  var prefText = describeTimeRange(coachLevelPref);
  var conText = describeTimeRange(coachLevelCon);

  var orderForCoach = payload.trainingOrder?.[coachId];
  var orderIdx = null;
  var orderTotal = null;
  if (Array.isArray(orderForCoach)) {
    var idx = orderForCoach.findIndex(function (id) {
      return String(id) === String(horseId);
    });
    if (idx >= 0) {
      orderIdx = idx + 1;
      orderTotal = orderForCoach.length;
    }
  }

  var length = payload.shortLong?.[horseId] || null;

  var adjacency = Array.isArray(payload.spacing?.adjacency)
    ? payload.spacing.adjacency
    : [];
  var minSpacing = Array.isArray(payload.spacing?.minSpacing)
    ? payload.spacing.minSpacing
    : [];

  var adjacentWith = [];
  for (var i = 0; i < adjacency.length; i++) {
    var p = adjacency[i];
    if (String(p.horseA) === String(horseId)) adjacentWith.push(p.horseB);
    else if (String(p.horseB) === String(horseId)) adjacentWith.push(p.horseA);
  }

  var spacingNotes = [];
  for (var j = 0; j < minSpacing.length; j++) {
    var s = minSpacing[j];
    if (
      String(s.horseA) === String(horseId) ||
      String(s.horseB) === String(horseId)
    ) {
      spacingNotes.push({
        otherHorseId:
          String(s.horseA) === String(horseId) ? s.horseB : s.horseA,
        minutes: s.minutes,
      });
    }
  }

  return {
    prefText: prefText,
    conText: conText,
    orderIdx: orderIdx,
    orderTotal: orderTotal,
    length: length,
    adjacentWith: adjacentWith,
    spacingNotes: spacingNotes,
  };
}

export default function PaidTimeRequestCard({ request, disabled }) {
  var id = request.paidTimeRequestId || request.PaidTimeRequestId;
  var horseId = request.horseId || request.HorseId;
  var coachId =
    request.coachFederationMemberId || request.CoachFederationMemberId;
  var horseName =
    request.barnName || request.BarnName || request.horseName || request.HorseName;
  var riderName = request.riderName || request.RiderName;
  var coachName = request.coachName || request.CoachName;
  var payerName = request.payerName || request.PayerName;
  var productName = request.productName || request.ProductName;
  var notes = request.notes || request.Notes;

  var requestedDate = request.requestedSlotDate || request.RequestedSlotDate;
  var requestedStart = request.requestedStartTime || request.RequestedStartTime;
  var requestedEnd = request.requestedEndTime || request.RequestedEndTime;
  var requestedArena = request.requestedArenaName || request.RequestedArenaName;

  var batchId = request.batchId || request.BatchId || null;
  var batchPayload = safeParseBatch(
    request.batchPayload || request.BatchPayload
  );
  var batchInfo = extractBatchInfo(batchPayload, horseId, coachId);

  return (
    <DraggableItem
      id={"paid-time-request-" + id}
      data={{ request: request }}
      disabled={disabled}
      className={[
        "rounded-2xl border bg-white p-3 text-right shadow-sm transition-all",
        disabled
          ? "cursor-default border-[#E0D0C8] opacity-60"
          : "cursor-grab border-[#D7CCC8] hover:border-[#A5836A] hover:shadow-md",
      ].join(" ")}
      draggingClassName="border-[#795548] bg-[#F5EDE8] shadow-xl opacity-90 z-50"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-[#3F312B]">{horseName}</p>
          <p className="text-xs text-[#7A655C]">רוכב/ת: {riderName}</p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-[#F5EDE8] px-2 py-1 text-[11px] font-semibold text-[#7B5A4D]">
            {getPaidTimeType(productName)}
          </span>
          {batchId ? (
            <span className="rounded-full bg-[#EFE3F0] px-2 py-0.5 text-[10px] font-semibold text-[#6E3F75]">
              הזמנה חכמה #{batchId}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-2 space-y-1 text-xs text-[#7A655C]">
        <p>מאמן/ת: {coachName || "לא צוין"}</p>
        <p>משלם: {payerName}</p>
      </div>

      <div className="mt-2 rounded-xl bg-[#F8F5F2] px-2 py-1.5 text-xs text-[#6B574F]">
        <p className="font-semibold text-[#3F312B]">סשן מבוקש:</p>
        <p>
          {formatDate(requestedDate)} | {formatTime(requestedStart)}–
          {formatTime(requestedEnd)}
        </p>
        <p>{requestedArena}</p>
      </div>

      {batchInfo &&
      (batchInfo.prefText ||
        batchInfo.conText ||
        batchInfo.orderIdx ||
        batchInfo.adjacentWith.length > 0 ||
        batchInfo.spacingNotes.length > 0) ? (
        <div className="mt-2 rounded-xl border border-[#E0CDE3] bg-[#FCF7FE] px-2 py-1.5 text-xs text-[#5C2A66]">
          <p className="mb-1 font-semibold text-[#6E3F75]">
            פרטי הזמנה חכמה:
          </p>

          {batchInfo.prefText ? (
            <p>העדפת זמן למאמן: {batchInfo.prefText}</p>
          ) : null}

          {batchInfo.conText ? (
            <p className="text-[#A33B3B]">
              אילוץ זמן (חובה): {batchInfo.conText}
            </p>
          ) : null}

          {batchInfo.orderIdx ? (
            <p>
              סדר אימון: סוס {batchInfo.orderIdx} מתוך {batchInfo.orderTotal}{" "}
              של המאמן
            </p>
          ) : null}

          {batchInfo.adjacentWith.length > 0 ? (
            <p>צמוד ל: סוס #{batchInfo.adjacentWith.join(", #")}</p>
          ) : null}

          {batchInfo.spacingNotes.length > 0
            ? batchInfo.spacingNotes.map(function (n, i) {
                return (
                  <p key={"sp-" + i}>
                    מרווח לפחות {n.minutes} דק' מסוס #{n.otherHorseId}
                  </p>
                );
              })
            : null}
        </div>
      ) : null}

      {notes ? (
        <div className="mt-2 rounded-xl bg-[#FAF5F1] px-2 py-1 text-xs text-[#6B574F]">
          {notes}
        </div>
      ) : null}
    </DraggableItem>
  );
}
