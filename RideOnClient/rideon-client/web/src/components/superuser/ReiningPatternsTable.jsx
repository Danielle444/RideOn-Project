import { Pencil, Trash2 } from "lucide-react";

export default function ReiningPatternsTable(props) {
  var items = Array.isArray(props.items) ? props.items : [];

  if (props.loading) {
    return (
      <div className="px-6 py-10 text-right text-[#6D4C41]">
        טוען מסלולים...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="px-6 py-10 text-right text-[#8B6A5A]">
        אין עדיין מסלולי ריינינג להצגה.
      </div>
    );
  }

  var maxManeuverCount = items.reduce(function (maxValue, item) {
    var currentCount = Array.isArray(item.maneuvers) ? item.maneuvers.length : 0;
    return currentCount > maxValue ? currentCount : maxValue;
  }, 0);

  return (
    <div className="overflow-x-auto">
      <div
        className="min-w-[900px]"
        style={{
          direction: "rtl",
        }}
      >
        <div
          className="grid gap-3 border-b border-[#EFE5DF] bg-[#FAF7F5] px-6 py-4 text-center text-sm font-bold text-[#4E342E]"
          style={{
            gridTemplateColumns:
              "140px " +
              "repeat(" +
              Math.max(maxManeuverCount, 1) +
              ", minmax(110px, 1fr)) " +
              "140px",
          }}
        >
          <div>מספר מסלול</div>

          {Array.from({ length: Math.max(maxManeuverCount, 1) }).map(function (_, index) {
            return <div key={index}>מנברה {index + 1}</div>;
          })}

          <div>פעולות</div>
        </div>

        {items.map(function (item, rowIndex) {
          var maneuvers = Array.isArray(item.maneuvers) ? item.maneuvers : [];

          return (
            <div
              key={item.patternNumber}
              className={
                "grid items-center gap-3 border-b border-[#F1E8E3] px-6 py-4 text-center text-[#3F312B] " +
                (rowIndex % 2 === 0 ? "bg-white" : "bg-[#FFFEFD]")
              }
              style={{
                gridTemplateColumns:
                  "140px " +
                  "repeat(" +
                  Math.max(maxManeuverCount, 1) +
                  ", minmax(110px, 1fr)) " +
                  "140px",
              }}
            >
              <div className="font-bold">{item.patternNumber}</div>

              {Array.from({ length: Math.max(maxManeuverCount, 1) }).map(function (_, index) {
                var maneuver = maneuvers[index];

                return (
                  <div
                    key={index}
                    className="rounded-xl border border-[#EEE4DE] bg-[#FCFAF8] px-3 py-2 text-sm"
                    title={maneuver?.maneuverDescription || ""}
                  >
                    {maneuver ? maneuver.maneuverName : "-"}
                  </div>
                );
              })}

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