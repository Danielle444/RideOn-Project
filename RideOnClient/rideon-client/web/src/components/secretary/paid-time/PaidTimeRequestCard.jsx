import DraggableItem from "../../common/dnd/DraggableItem";

export default function PaidTimeRequestCard({ request, disabled }) {
  var id = request.paidTimeRequestId || request.PaidTimeRequestId;
  var horseName = request.barnName || request.BarnName || request.horseName || request.HorseName;
  var riderName = request.riderName || request.RiderName;
  var coachName = request.coachName || request.CoachName;
  var payerName = request.payerName || request.PayerName;
  var productName = request.productName || request.ProductName;
  var duration = request.effectiveDurationMinutes || request.EffectiveDurationMinutes;
  var notes = request.notes || request.Notes;

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

        <span className="rounded-full bg-[#F5EDE8] px-2 py-1 text-[11px] font-semibold text-[#7B5A4D]">
          {duration} דק׳
        </span>
      </div>

      <div className="mt-2 space-y-1 text-xs text-[#7A655C]">
        <p>מאמן/ת: {coachName || "לא צוין"}</p>
        <p>משלם: {payerName}</p>
        <p>סוג: {productName}</p>
      </div>

      {notes ? (
        <div className="mt-2 rounded-xl bg-[#FAF5F1] px-2 py-1 text-xs text-[#6B574F]">
          {notes}
        </div>
      ) : null}
    </DraggableItem>
  );
}