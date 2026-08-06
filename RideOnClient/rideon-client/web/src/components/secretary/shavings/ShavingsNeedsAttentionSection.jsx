// Needs-attention section — Spec 2 (CAP-4). Pinned at the top, above the grouped list; lists
// every delayed order regardless of the active grouping. Titles are Oren-approved
// (hebrew-labels.md). Omitted entirely when nothing is delayed (no empty shell).
import { AlertTriangle } from "lucide-react";
import ShavingsOrdersTable from "./ShavingsOrdersTable";

export default function ShavingsNeedsAttentionSection(props) {
  const orders = Array.isArray(props.orders) ? props.orders : [];

  if (orders.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#F1C6C6] bg-[#FDECEC] p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#C62828]">
          <AlertTriangle size={18} />
        </span>

        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-[#C62828]">
            הזמנות שדורשות טיפול
            <span className="rounded-full bg-[#C62828] px-2.5 py-0.5 text-sm font-bold text-white">
              {orders.length}
            </span>
          </h2>
          <p className="text-sm text-[#9A4A44]">הזמנות שחורגות מזמן היעד</p>
        </div>
      </div>

      <ShavingsOrdersTable
        orders={orders}
        onCancelOrder={props.onCancelOrder}
        cancellingId={props.cancellingId}
      />
    </div>
  );
}
