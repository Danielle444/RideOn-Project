import { Pencil, Trash2 } from "lucide-react";

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return "₪" + value;
}

function formatPattern(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return "מסלול " + value;
}

export default function ClassesInCompetitionSection(props) {
  var items = Array.isArray(props.items) ? props.items : [];

  if (!props.competitionId) {
    return (
      <div className="text-right text-[#6D4C41]">
        יש לשמור קודם את פרטי התחרות כדי להוסיף מקצים.
      </div>
    );
  }

  if (props.loading) {
    return (
      <div className="rounded-[24px] border border-[#E8DDD7] bg-white px-6 py-10 text-right text-[#6D4C41]">
        טוען מקצים...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[24px] border border-[#E8DDD7] bg-white px-6 py-16 text-center">
        <div className="mb-4 text-[3rem] text-[#D7CCC8]">☰</div>
        <div className="text-[1.8rem] font-bold text-[#6D4C41]">
          אין מקצים ליום זה
        </div>
        <div className="mt-2 text-[1.1rem] text-[#8A6F64]">
          לחצי על "הוספת מקצה" כדי להתחיל
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[24px] border border-[#E8DDD7] bg-white">
      <div className="min-w-[1500px]">
        <div className="grid grid-cols-[0.55fr_1.4fr_1fr_1fr_1.3fr_1fr_1fr_1fr_0.9fr] gap-3 bg-[#FAF7F5] px-6 py-4 text-center text-sm font-bold text-[#4E342E]">
          <div>מס׳</div>
          <div>שם מקצה</div>
          <div>מגרש</div>
          <div>מסלול</div>
          <div>שופטים</div>
          <div>סוג פרס</div>
          <div>סכום פרס</div>
          <div>עלות מארגן</div>
          <div>פעולות</div>
        </div>

        {items.map(function (item, index) {
          return (
            <div
              key={item.classInCompId}
              className={
                "grid grid-cols-[0.55fr_1.4fr_1fr_1fr_1.3fr_1fr_1fr_1fr_0.9fr] items-center gap-3 border-t border-[#F1E8E3] px-6 py-5 text-center text-[#3F312B] " +
                (index % 2 === 0 ? "bg-white" : "bg-[#FFFEFD]")
              }
            >
              <div className="font-semibold">
                {item.orderInDay ?? index + 1}
              </div>

              <div className="font-semibold">{item.className || "-"}</div>

              <div>{item.arenaName || "-"}</div>

              <div>{formatPattern(item.patternNumber)}</div>

              <div className="whitespace-pre-line">
                {item.judgesDisplay || "-"}
              </div>

              <div>{item.prizeTypeName || "-"}</div>

              <div>{formatMoney(item.prizeAmount)}</div>

              <div>{formatMoney(item.organizerCost)}</div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={function () {
                    props.onDelete(item);
                  }}
                  className="text-red-600 transition-colors hover:text-red-700"
                  title="מחיקה"
                >
                  <Trash2 size={18} />
                </button>

                <button
                  type="button"
                  onClick={function () {
                    props.onEdit(item);
                  }}
                  className="text-[#7B5A4E] transition-colors hover:text-[#5D4037]"
                  title="עריכה"
                >
                  <Pencil size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}