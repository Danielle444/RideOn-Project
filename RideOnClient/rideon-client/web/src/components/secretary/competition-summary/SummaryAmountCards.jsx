function formatMoney(value) {
  return "₪" + Number(value || 0).toLocaleString("he-IL");
}

function AmountCard(props) {
  var colorClass = props.colorClass || "text-[#7B5A4D]";
  var clickableClass = props.onClick
    ? "cursor-pointer transition-colors hover:bg-[#FCF8F5]"
    : "";

  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={!props.onClick}
      className={
        "rounded-2xl border border-[#E3D7D0] bg-white px-6 py-5 text-right shadow-sm disabled:cursor-default " +
        clickableClass
      }
    >
      <p className="text-sm font-bold text-[#6D4C41]">{props.title}</p>

      <p className={"mt-3 text-3xl font-black " + colorClass}>
        {props.isMoney === false
          ? Number(props.amount || 0).toLocaleString("he-IL")
          : formatMoney(props.amount)}
      </p>
    </button>
  );
}

export default function SummaryAmountCards(props) {
  var totals = props.totals || {};
  var showQuantity = props.showQuantity === true;

  return (
    <div
      className={
        "grid grid-cols-1 gap-4 " +
        (showQuantity ? "md:grid-cols-4" : "md:grid-cols-3")
      }
    >
      {showQuantity ? (
        <AmountCard
          title="כמות"
          amount={props.quantity || 0}
          colorClass="text-[#3F312B]"
          isMoney={false}
        />
      ) : null}

      <AmountCard
        title="סה״כ הכנסות צפויות"
        amount={totals.expectedAmount || totals.ExpectedAmount}
        colorClass="text-[#7B5A4D]"
        onClick={props.onExpectedAmountClick}
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
