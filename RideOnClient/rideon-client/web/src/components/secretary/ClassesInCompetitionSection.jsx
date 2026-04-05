import { Pencil, Plus, Trash2 } from "lucide-react";

function formatTime(value) {
  if (!value) {
    return "-";
  }

  return String(value).slice(0, 5);
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  var date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("he-IL");
}

export default function ClassesInCompetitionSection(props) {
  if (!props.competitionId) {
    return (
      <div className="text-right text-[#6D4C41]">
        יש לשמור קודם את פרטי התחרות כדי להוסיף מקצים.
      </div>
    );
  }

  return (
    <div className="space-y-5 text-right">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-[#6D4C41]">
          מקצים שנשמרו לתחרות: <span className="font-bold">{props.items.length}</span>
        </div>

        <button
          type="button"
          onClick={props.onAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-[#8B6352] px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#7A5547]"
        >
          <Plus size={18} />
          הוספת מקצה
        </button>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-[#E8DDD7] bg-white">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_0.9fr_0.9fr] bg-[#FAF7F5] px-5 py-4 text-sm font-bold text-[#4E342E]">
          <div>שם מקצה</div>
          <div>שעת התחלה</div>
          <div>תאריך ושעה</div>
          <div>סדר</div>
          <div>עלות מארגן</div>
          <div className="text-center">פעולות</div>
        </div>

        {props.loading ? (
          <div className="px-5 py-8 text-right text-[#6D4C41]">טוען מקצים...</div>
        ) : props.items.length === 0 ? (
          <div className="px-5 py-8 text-right text-[#6D4C41]">לא נוספו עדיין מקצים</div>
        ) : (
          props.items.map(function (item, index) {
            return (
              <div
                key={item.classInCompId}
                className={
                  "grid grid-cols-[1.5fr_1fr_1fr_0.8fr_0.9fr_0.9fr] items-center border-t border-[#F1E8E3] px-5 py-5 text-[#3F312B] " +
                  (index % 2 === 0 ? "bg-white" : "bg-[#FFFEFD]")
                }
              >
                <div className="font-semibold">{item.className || "-"}</div>
                <div>{formatTime(item.startTime)}</div>
                <div>{formatDateTime(item.classDateTime)}</div>
                <div>{item.orderInDay ?? "-"}</div>
                <div>{item.organizerCost ?? "-"}</div>

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