function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return "₪" + Number(value).toLocaleString("he-IL");
}

export default function SecretaryClassEntriesSummaryCards(props) {
  var summary = props.summary || {
    totalCount: 0,
    paidCount: 0,
    unpaidCount: 0,
    totalAmount: 0,
    paidAmount: 0,
    unpaidAmount: 0,
  };

  var titlePrefix = props.titlePrefix || "כניסות";

  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <div className="rounded-3xl border border-[#EFE5DF] bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold text-[#8D6E63]">
          סה״כ {titlePrefix}
        </p>
        <p className="mt-2 text-2xl font-bold text-[#3F312B]">
          {summary.totalCount}
        </p>
      </div>

      <div className="rounded-3xl border border-[#EFE5DF] bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold text-[#8D6E63]">שולמו</p>
        <p className="mt-2 text-2xl font-bold text-[#2F6B3B]">
          {summary.paidCount}
        </p>
      </div>

      <div className="rounded-3xl border border-[#EFE5DF] bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold text-[#8D6E63]">לא שולמו</p>
        <p className="mt-2 text-2xl font-bold text-[#9A5B00]">
          {summary.unpaidCount}
        </p>
      </div>

      <div className="rounded-3xl border border-[#EFE5DF] bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold text-[#8D6E63]">סה״כ חיובים</p>
        <p className="mt-2 text-xl font-bold text-[#3F312B]">
          {formatMoney(summary.totalAmount)}
        </p>
      </div>

      <div className="rounded-3xl border border-[#EFE5DF] bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold text-[#8D6E63]">סכום ששולם</p>
        <p className="mt-2 text-xl font-bold text-[#2F6B3B]">
          {formatMoney(summary.paidAmount)}
        </p>
      </div>

      <div className="rounded-3xl border border-[#EFE5DF] bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold text-[#8D6E63]">יתרה פתוחה</p>
        <p className="mt-2 text-xl font-bold text-[#9A5B00]">
          {formatMoney(summary.unpaidAmount)}
        </p>
      </div>
    </section>
  );
}
