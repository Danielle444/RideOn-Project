import { useRef } from "react";
import * as XLSX from "xlsx";
import { Upload } from "lucide-react";

function cellAddressToRowCol(address) {
  const match = address.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  const col =
    match[1].split("").reduce((acc, c) => acc * 26 + c.charCodeAt(0) - 64, 0) -
    1;
  const row = parseInt(match[2], 10) - 1;
  return { row, col };
}

export default function StallMapUploader({
  compound,
  onLayoutParsed,
  buttonLabel,
}) {
  const inputRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const cells = [];
        let maxRow = 0;
        let maxCol = 0;

        Object.entries(sheet).forEach(function ([address, cell]) {
          if (address.startsWith("!")) return;
          const pos = cellAddressToRowCol(address);
          if (!pos) return;

          const value = cell.v != null ? String(cell.v).trim() : "";
          if (!value) return;

          const isEntrance =
            value === "X" || value === "כניסה" || value === "entrance";
          const isStall = !isEntrance && value !== "";

          cells.push({
            row: pos.row,
            col: pos.col,
            stallNumber: isStall ? value : null,
            stallId: null,
            isEntrance: isEntrance,
          });

          if (pos.row > maxRow) maxRow = pos.row;
          if (pos.col > maxCol) maxCol = pos.col;
        });

        const layout = {
          rows: maxRow + 1,
          cols: maxCol + 1,
          cells,
        };

        onLayoutParsed(layout);
        e.target.value = "";
      } catch (err) {
        alert("שגיאה בקריאת קובץ ה-Excel. וודא שהקובץ תקין.");
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div dir="rtl">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={function () {
          inputRef.current.click();
        }}
        className="inline-flex items-center gap-2 rounded-2xl border border-[#D7CCC8] bg-white px-4 py-2 text-sm font-semibold text-[#5D4037] hover:bg-[#FAF5F1] transition-colors"
      >
        <Upload size={15} />
        {buttonLabel || "העלאת פריסת Excel"}
      </button>
    </div>
  );
}
