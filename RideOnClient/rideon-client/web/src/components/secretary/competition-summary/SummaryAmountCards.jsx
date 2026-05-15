function formatMoney(value) {
  return "₪" + Number(value || 0).toLocaleString("he-IL");
}

function AmountCard(props) {
  var colorClass = props.colorClass || "text-[#7B5A4D]";

  return (
    <div className="rounded-2xl border border-[#E3D7D0] bg-white px-6 py-5 shadow-sm">
      <p className="text-sm font-bold text-[#6D4C41]">{props.title}</p>

      <p className={"mt-3 text-3xl font-black " + colorClass}>
        {formatMoney(props.amount)}
      </p>
    </div>
  );
}

export default function SummaryAmountCards(props) {
  var totals = props.totals || {};

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <AmountCard
        title="סה״כ הכנסות צפויות"
        amount={totals.expectedAmount || totals.ExpectedAmount}
        colorClass="text-[#7B5A4D]"
      />

      <AmountCard
        title="שולם בפועל"
        amount={totals.paidAmount || totals.PaidAmount}
        colorClass="text-[#2E7D32]"
      />

      <AmountCard
        title="לא שולם"
        amount={totals.unpaidAmount || totals.UnpaidAmount}
        colorClass="text-[#C62828]"
      />
    </div>
  );
}
