export default function ChangeRequestsSummaryCards(props) {
  var summary = props.summary || {
    total: 0,
    entryCount: 0,
    productCount: 0,
    cancellationCount: 0,
    changeCount: 0,
  };

  // CAP-11: one coherent breakdown (change vs cancel) plus an overall total —
  // no pair of cards that double-counts the same requests under two groupings.
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <div className="rounded-3xl border border-[#EFE5DF] bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold text-[#8D6E63]">סה״כ בסטטוס זה</p>
        <p className="mt-2 text-2xl font-bold text-[#3F312B]">
          {summary.total}
        </p>
      </div>

      <div className="rounded-3xl border border-[#EFE5DF] bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold text-[#8D6E63]">בקשות שינוי</p>
        <p className="mt-2 text-2xl font-bold text-[#2F6B3B]">
          {summary.changeCount}
        </p>
      </div>

      <div className="rounded-3xl border border-[#EFE5DF] bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold text-[#8D6E63]">בקשות ביטול</p>
        <p className="mt-2 text-2xl font-bold text-[#9A5B00]">
          {summary.cancellationCount}
        </p>
      </div>
    </section>
  );
}
