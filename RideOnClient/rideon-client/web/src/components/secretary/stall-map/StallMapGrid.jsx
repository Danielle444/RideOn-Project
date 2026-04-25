import StallCell from "./StallCell";

export default function StallMapGrid({
  compound,
  assignments,
  onUnassign,
  readOnly,
}) {
  if (!compound.layout) {
    return (
      <div className="flex items-center justify-center h-32 rounded-2xl border border-dashed border-[#D7CCC8] bg-[#FAF5F1]">
        <p className="text-sm text-[#BCAAA4]">לא הועלתה פריסה עבור מתחם זה</p>
      </div>
    );
  }

  const layout = compound.layout;

  const cellMap = {};
  layout.cells.forEach(function (cell) {
    cellMap[`${cell.row}-${cell.col}`] = cell;
  });

  const assignmentMap = {};
  assignments.forEach(function (a) {
    assignmentMap[a.stallNumber] = a;
  });

  const rows = Array.from({ length: layout.rows }, function (_, r) {
    return r;
  });

  const cols = Array.from({ length: layout.cols }, function (_, c) {
    return c;
  });

  const occupiedCols = new Set();
  const occupiedRows = new Set();

  layout.cells.forEach(function (cell) {
    if (cell.stallNumber || cell.isEntrance) {
      occupiedCols.add(cell.col);
      occupiedRows.add(cell.row);
    }
  });

  const columnSizes = cols
    .map(function (c) {
      return occupiedCols.has(c) ? "1fr" : "0.2fr";
    })
    .join(" ");

  const rowSizes = rows
    .map(function (r) {
      return occupiedRows.has(r) ? "1fr" : "0.2fr";
    })
    .join(" ");

  return (
    <div className="max-w-full overflow-auto rounded-2xl border border-[#EFE5DF] bg-[#FAF5F1] p-3">
      <div
        className="grid gap-[2px]"
        style={{
          gridTemplateColumns: columnSizes,
          gridTemplateRows: rowSizes,
        }}
      >
        {rows.map(function (r) {
          return cols.map(function (c) {
            const cell = cellMap[`${r}-${c}`] || {
              row: r,
              col: c,
              stallNumber: null,
              stallId: null,
              isEntrance: false,
            };

            const assignment = cell.stallNumber
              ? assignmentMap[cell.stallNumber]
              : null;

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
    </div>
  );
}
