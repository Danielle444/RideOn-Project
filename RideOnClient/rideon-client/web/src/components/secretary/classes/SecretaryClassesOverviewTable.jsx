import { Eye, ListOrdered } from "lucide-react";
import DataTableShell from "../../common/table/DataTableShell";
import DataTableEmptyState from "../../common/table/DataTableEmptyState";
import DataTableLoadingState from "../../common/table/DataTableLoadingState";
import TableActionButton from "../../common/table/TableActionButton";

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return "₪" + Number(value).toLocaleString("he-IL");
}

function formatTime(value) {
  if (!value) {
    return "-";
  }

  return String(value).substring(0, 5);
}

function getClassId(item) {
  return item.classInCompId || item.ClassInCompId;
}

function getOrderInDay(item) {
  return item.orderInDay || item.OrderInDay;
}

function getClassName(item) {
  return item.className || item.ClassName || "-";
}

function getArenaName(item) {
  return item.arenaName || item.ArenaName || "-";
}

function getJudgesDisplay(item) {
  return item.judgesDisplay || item.JudgesDisplay || "-";
}

function getPatternNumber(item) {
  return item.patternNumber || item.PatternNumber;
}

function getPrizeTypeName(item) {
  return item.prizeTypeName || item.PrizeTypeName || "-";
}

function getPrizeAmount(item) {
  return item.prizeAmount || item.PrizeAmount;
}

function getOrganizerCost(item) {
  return item.organizerCost || item.OrganizerCost || 0;
}

function getFederationCost(item) {
  return item.federationCost || item.FederationCost || 0;
}

function getTotalCost(item) {
  return (
    Number(getOrganizerCost(item) || 0) + Number(getFederationCost(item) || 0)
  );
}

export default function SecretaryClassesOverviewTable(props) {
  var items = Array.isArray(props.items) ? props.items : [];

  return (
    <section className="rounded-3xl border border-[#EFE5DF] bg-[#FFFDFB] p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#3F312B]">מקצים בתחרות</h2>
          <p className="text-xs text-[#8D6E63]">
            לחצי על שם מקצה לצפייה בכניסות שלו, או על המס׳ לצפייה בכל המקצים
            באותו מספר.
          </p>
        </div>
      </div>

      <DataTableShell>
        <thead className="bg-[#FAF5F1] text-sm text-[#6B574F]">
          <tr>
            <th className="px-4 py-3">מס׳</th>
            <th className="px-4 py-3">שם מקצה</th>
            <th className="px-4 py-3">כניסות</th>
            <th className="px-4 py-3">מסלול</th>
            <th className="px-4 py-3">שופטים</th>
            <th className="px-4 py-3">מגרש</th>
            <th className="px-4 py-3">שעה</th>
            <th className="px-4 py-3">עלות מארגן</th>
            <th className="px-4 py-3">עלות התאחדות</th>
            <th className="px-4 py-3">סה״כ מחיר</th>
            <th className="px-4 py-3">סוג פרס</th>
            <th className="px-4 py-3">סכום פרס</th>
            <th className="px-4 py-3">פעולות</th>
          </tr>
        </thead>

        <tbody>
          {props.loading ? (
            <DataTableLoadingState colSpan={13} message="טוען מקצים..." />
          ) : null}

          {!props.loading && items.length === 0 ? (
            <DataTableEmptyState colSpan={13} message="לא נמצאו מקצים להצגה" />
          ) : null}

          {!props.loading
            ? items.map(function (item) {
                var orderInDay = getOrderInDay(item);
                var classEntriesCount = props.getEntriesCountForClass(item);
                var groupEntriesCount = props.getEntriesCountForGroup(item);

                return (
                  <tr
                    key={getClassId(item)}
                    className="border-t border-[#F1E7E1] text-sm text-[#4A3A34]"
                  >
                    <td className="px-4 py-3 font-bold">
                      <button
                        type="button"
                        onClick={function () {
                          props.onOpenGroupEntries(item);
                        }}
                        className="rounded-full px-3 py-1 font-bold text-[#7B5A4D] transition-colors hover:bg-[#F5EDE8]"
                        title="צפייה בכל הכניסות של אותו מספר מקצה ביום זה"
                      >
                        {orderInDay || "-"}
                      </button>
                    </td>

                    <td className="px-4 py-3 font-semibold">
                      <button
                        type="button"
                        onClick={function () {
                          props.onOpenClassEntries(item);
                        }}
                        className="font-bold text-[#3F312B] underline-offset-4 transition-colors hover:text-[#8B6352] hover:underline"
                      >
                        {getClassName(item)}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-[#3F312B]">
                          {classEntriesCount}
                        </span>
                        <span className="text-xs text-[#8D6E63]">
                          {groupEntriesCount} במס׳ זה
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {getPatternNumber(item)
                        ? "מסלול " + getPatternNumber(item)
                        : "-"}
                    </td>

                    <td className="px-4 py-3">{getJudgesDisplay(item)}</td>

                    <td className="px-4 py-3">{getArenaName(item)}</td>

                    <td className="px-4 py-3">
                      {formatTime(item.startTime || item.StartTime)}
                    </td>

                    <td className="px-4 py-3">
                      {formatMoney(getOrganizerCost(item))}
                    </td>

                    <td className="px-4 py-3">
                      {formatMoney(getFederationCost(item))}
                    </td>

                    <td className="px-4 py-3 font-bold">
                      {formatMoney(getTotalCost(item))}
                    </td>

                    <td className="px-4 py-3">{getPrizeTypeName(item)}</td>

                    <td className="px-4 py-3">
                      {formatMoney(getPrizeAmount(item))}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <TableActionButton
                          label="כניסות"
                          icon={<Eye size={15} />}
                          onClick={function () {
                            props.onOpenClassEntries(item);
                          }}
                        />

                        <TableActionButton
                          icon={<ListOrdered size={15} />}
                          iconOnly
                          title="כל הכניסות במספר זה"
                          onClick={function () {
                            props.onOpenGroupEntries(item);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            : null}
        </tbody>
      </DataTableShell>
    </section>
  );
}
