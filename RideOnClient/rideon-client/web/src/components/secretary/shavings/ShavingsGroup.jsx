// One group (ranch or status) — header with rollup stats + the order table. Spec 2 (CAP-1/CAP-2).
import ShavingsOrdersTable from "./ShavingsOrdersTable";

function formatMoney(value) {
  return "₪" + Number(value || 0).toLocaleString("he-IL");
}

function StatPill(props) {
  return (
    <span className="text-sm text-[#7B5A4D]">
      <span className="font-bold text-[#5D4037]">{props.label}:</span>{" "}
      {props.value}
    </span>
  );
}

export default function ShavingsGroup(props) {
  const stats = props.stats || {};
  const orders = props.orders || [];

  const orderCount =
    stats.orderCount !== null && stats.orderCount !== undefined
      ? stats.orderCount
      : orders.length;

  return (
    <div className="rounded-2xl border border-[#E6DCD5] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE5DF] pb-3">
        <h3 className="text-lg font-black text-[#3F312B]">{props.title}</h3>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <StatPill label="הזמנות" value={orderCount} />

          {stats.stallCount !== null && stats.stallCount !== undefined ? (
            <StatPill label="תאים" value={stats.stallCount} />
          ) : null}

          <StatPill
            label="שקים"
            value={
              stats.bagQuantity !== null && stats.bagQuantity !== undefined
                ? stats.bagQuantity
                : 0
            }
          />

          {stats.expectedAmount !== null &&
          stats.expectedAmount !== undefined ? (
            <StatPill
              label="סה״כ צפוי"
              value={formatMoney(stats.expectedAmount)}
            />
          ) : null}
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
