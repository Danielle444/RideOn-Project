import SummaryFigureCard from "./SummaryFigureCard";

function formatMoney(value) {
  return "₪" + Number(value || 0).toLocaleString("he-IL");
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
        <SummaryFigureCard
          title="כמות"
          value={Number(props.quantity || 0).toLocaleString("he-IL")}
          colorClass="text-[#3F312B]"
        />
      ) : null}

      <SummaryFigureCard
        title="סה״כ הכנסות צפויות"
        value={formatMoney(totals.expectedAmount || totals.ExpectedAmount)}
        colorClass="text-[#7B5A4D]"
        onClick={props.onExpectedAmountClick}
      />

      <SummaryFigureCard
        title="שולם בפועל"
        value={formatMoney(totals.paidAmount || totals.PaidAmount)}
        colorClass="text-[#2E7D32]"
        onClick={props.onPaidAmountClick}
      />

      <SummaryFigureCard
        title="לא שולם"
        value={formatMoney(totals.unpaidAmount || totals.UnpaidAmount)}
        colorClass="text-[#C62828]"
      />
    </div>
  );
}
