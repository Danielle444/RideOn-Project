export default function StatusBadge(props) {
  var status = props.status || "-";
  var className = "bg-[#F3ECE8] text-[#6D4C41]";

  if (status === "כעת") {
    className = "bg-green-100 text-green-700";
  } else if (status === "פעילה") {
    className = "bg-blue-100 text-blue-700";
  } else if (status === "עתידית") {
    className = "bg-sky-100 text-sky-700";
  } else if (status === "הסתיימה") {
    className = "bg-gray-100 text-gray-700";
  } else if (status === "טיוטה") {
    className = "bg-amber-100 text-amber-700";
  } else if (status === "בוטלה") {
    className = "bg-red-100 text-red-700";
  }

  return (
    <span
      className={
        "inline-flex rounded-full px-4 py-2 text-sm font-semibold " + className
      }
    >
      {status}
    </span>
  );
}