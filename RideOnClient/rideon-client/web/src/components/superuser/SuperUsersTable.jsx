import DataTableShell from "../common/table/DataTableShell";
import DataTableEmptyState from "../common/table/DataTableEmptyState";
import DataTableLoadingState from "../common/table/DataTableLoadingState";
import StatusPill from "../common/table/StatusPill";

function formatDate(value) {
  if (!value) {
    return "-";
  }

  try {
    return new Date(value).toLocaleString("he-IL");
  } catch {
    return "-";
  }
}

export default function SuperUsersTable(props) {
  const rows = Array.isArray(props.rows) ? props.rows : [];

  return (
    <DataTableShell tableClassName="w-full min-w-[920px] text-right">
      <thead>
        <tr className="border-b border-[#E8DDD6] bg-[#FAF7F5] text-sm text-[#6A5248]">
          <th className="px-5 py-4 font-bold">אימייל</th>
          <th className="px-5 py-4 font-bold">סטטוס</th>
          <th className="px-5 py-4 font-bold">סיסמה</th>
          <th className="px-5 py-4 font-bold">תאריך יצירה</th>
          <th className="px-5 py-4 font-bold">כניסה אחרונה</th>
        </tr>
      </thead>

      <tbody>
        {props.loading && <DataTableLoadingState colSpan={5} />}

        {!props.loading && rows.length === 0 && (
          <DataTableEmptyState
            colSpan={5}
            message="עדיין לא קיימים משתמשי מערכת להצגה"
          />
        )}

        {!props.loading &&
          rows.map(function (item, index) {
            return (
              <tr
                key={item.superUserId}
                className={
                  "border-b border-[#F1E8E3] text-[#3F312B] transition-colors hover:bg-[#FCFAF8] " +
                  (index % 2 === 0 ? "bg-white" : "bg-[#FFFEFD]")
                }
              >
                <td className="px-5 py-5 font-medium">{item.email}</td>
                <td className="px-5 py-5">
                  <StatusPill value={item.isActive} type="active" />
                </td>
                <td className="px-5 py-5">
                  <StatusPill value={item.mustChangePassword} type="password" />
                </td>
                <td className="px-5 py-5">{formatDate(item.createdDate)}</td>
                <td className="px-5 py-5">{formatDate(item.lastLoginDate)}</td>
              </tr>
            );
          })}
      </tbody>
    </DataTableShell>
  );
}