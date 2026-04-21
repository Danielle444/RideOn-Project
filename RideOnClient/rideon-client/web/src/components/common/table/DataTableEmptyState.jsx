export default function DataTableEmptyState(props) {
  return (
    <tr>
      <td
        colSpan={props.colSpan}
        className="py-16 text-center text-[#7A655C]"
      >
        {props.message || "לא נמצאו נתונים להצגה"}
      </td>
    </tr>
  );
}