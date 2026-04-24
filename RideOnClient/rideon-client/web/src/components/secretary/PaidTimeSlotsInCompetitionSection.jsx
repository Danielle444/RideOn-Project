import { Pencil, Plus, Trash2 } from "lucide-react";

function formatTime(value) {
  if (!value) {
    return "-";
  }

  return String(value).slice(0, 5);
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  var date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("he-IL");
}

export default function PaidTimeSlotsInCompetitionSection(props) {
  if (!props.competitionId) {
    return (
      <div className="text-right text-[#6D4C41]">
        יש לשמור קודם את פרטי התחרות כדי להוסיף פייד־טיים.
      </div>
    );
  }

  return (
    <div className="space-y-5 text-right">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-[#6D4C41]">
          סלוטים שנשמרו לתחרות: <span className="font-bold">{props.items.length}</span>
        </div>

        <button
          type="button"
          onClick={props.onAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-[#8B6352] px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#7A5547]"
        >
          <Plus size={18} />
          הוספת סלוט
        </button>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-[#E8DDD7] bg-white">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_0.9fr] bg-[#FAF7F5] px-5 py-4 text-sm font-bold text-[#4E342E]">
          <div>תאריך</div>
          <div>טווח שעות</div>
          <div>חלק ביום</div>
          <div>מגרש</div>
          <div className="text-center">פעולות</div>
        </div>

        {props.loading ? (
          <div className="px-5 py-8 text-right text-[#6D4C41]">טוען סלוטים...</div>
        ) : props.items.length === 0 ? (
          <div className="px-5 py-8 text-right text-[#6D4C41]">לא נוספו עדיין סלוטים</div>
        ) : (
          props.items.map(function (item, index) {
            return (
              <div
                key={item.PaidTimeSlotInCompId}
                className={
                  "grid grid-cols-[1fr_1fr_1fr_1fr_0.9fr] items-center border-t border-[#F1E8E3] px-5 py-5 text-[#3F312B] " +
                  (index % 2 === 0 ? "bg-white" : "bg-[#FFFEFD]")
                }
              >
                <div>{formatDate(item.slotDate)}</div>
                <div>
                  {formatTime(item.startTime)} - {formatTime(item.endTime)}
                </div>
                <div>{item.timeOfDay || "-"}</div>
                <div>{item.arenaName || "-"}</div>

                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={function () {
                      props.onEdit(item);
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#D7CCC8] bg-white text-[#5D4037] transition-colors hover:bg-[#F8F5F2]"
                    title="עריכה"
                  >
                    <Pencil size={17} />
                  </button>

                  <button
                    type="button"
                    onClick={function () {
                      props.onDelete(item);
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 transition-colors hover:bg-red-50"
                    title="מחיקה"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}