import StallCell from "./StallCell";

export default function StallMapGrid({ compound, assignments, onUnassign, readOnly }) {
  if (!compound.layout) {
    return (
      <div className="flex items-center justify-center h-32 rounded-2xl border border-dashed border-[#D7CCC8] bg-[#FAF5F1]">
        <p className="text-sm text-[#BCAAA4]">לא הועלתה פריסה עבור מתחם זה</p>
      </div>
    );
  }

  let layout;
  try {
    layout = typeof compound.layout === "string"
      ? JSON.parse(compound.layout)
      : compound.layout;
  } catch {
    return (
      <div className="flex items-center justify-center h-32 rounded-2xl border border-dashed border-red-200 bg-red-50">
        <p className="text-sm text-red-400">שגיאה בטעינת פריסת המתחם</p>
      </div>
    );
  }

  const cellMap = {};
  layout.cells.forEach(function (cell) {
    cellMap[`${cell.row}-${cell.col}`] = cell;
  });

  const assignmentMap = {};
  assignments.forEach(function (a) {
    assignmentMap[a.stallNumber] = a;
  });

  const rows = Array.from({ length: layout.rows }, function (_, r) { return r; });
  const cols = Array.from({ length: layout.cols }, function (_, c) { return c; });

  return (
    <div
      className="grid gap-1.5 p-3 rounded-2xl bg-[#FAF5F1] border border-[#EFE5DF]"
      style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(64px, 80px))` }}
    >
      {rows.map(function (r) {
        return cols.map(function (c) {
          const cell = cellMap[`${r}-${c}`] || { row: r, col: c, stallNumber: null, isEntrance: false };
          const assignment = cell.stallNumber ? assignmentMap[cell.stallNumber] : null;
          return (
            <StallCell
              key={`${r}-${c}`}
              cell={cell}
              assignment={assignment}
              onUnassign={readOnly ? function () {} : onUnassign}
            />
          );
        });
      })}
    </div>
  );
}
