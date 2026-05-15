function getStatusLabel(status) {
  if (status === "Paid") {
    return "שולם";
  }

  if (status === "Partial") {
    return "חלקי";
  }

  if (status === "Unpaid") {
    return "לא שולם";
  }

  return "ללא חיובים";
}

function getStatusClass(status) {
  if (status === "Paid") {
    return "bg-[#EAF7EC] text-[#2E7D32]";
  }

  if (status === "Partial") {
    return "bg-[#FFF4E5] text-[#B26A00]";
  }

  if (status === "Unpaid") {
    return "bg-[#FDECEC] text-[#C62828]";
  }

  return "bg-[#F1ECE8] text-[#7A655C]";
}

export default function PaymentStatusBadge(props) {
  return (
    <span
      className={
        "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-black " +
        getStatusClass(props.status)
      }
    >
      {getStatusLabel(props.status)}
    </span>
  );
}