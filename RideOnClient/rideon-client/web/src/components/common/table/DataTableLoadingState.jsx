import { Loader2 } from "lucide-react";

export default function DataTableLoadingState(props) {
  return (
    <tr>
      <td
        colSpan={props.colSpan}
        className="py-16 text-center text-[#7A655C]"
      >
        <div className="flex items-center justify-center gap-3">
          <Loader2 size={20} className="animate-spin" />
          <span>{props.message || "טוען נתונים..."}</span>
        </div>
      </td>
    </tr>
  );
}