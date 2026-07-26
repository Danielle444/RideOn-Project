// Derived-status chip — Spec 2 (CAP-3). Reads the DERIVED status, never the stored token.
import {
  deriveShavingsStatus,
  isUnverifiedDelivery,
} from "../../../utils/shavingsStatus.utils";

const STATUS_STYLE = {
  Pending: "bg-[#FDF2E3] text-[#B26A00]",
  Seen: "bg-[#E8F1FB] text-[#1565C0]",
  Delivered: "bg-[#EEF8F0] text-[#2E7D32]",
};

const STATUS_LABEL = {
  Pending: "ממתין לטיפול",
  Seen: "בטיפול",
  Delivered: "סופק",
};

export default function ShavingsStatusChip(props) {
  const order = props.order;
  const status = deriveShavingsStatus(order);
  const style = STATUS_STYLE[status] || "bg-[#F3EEEA] text-[#5D4037]";

  let label = STATUS_LABEL[status] || status;

  // DEP-1: mark a delivered order that has no delivery photo.
  if (status === "Delivered" && isUnverifiedDelivery(order)) {
    label = label + " · ללא תמונה";
  }

  return (
    <span
      className={
        "inline-block rounded-full px-3 py-1 text-xs font-bold " + style
      }
    >
      {label}
    </span>
  );
}
