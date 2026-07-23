import { CheckCircle2, RefreshCw, X } from "lucide-react";

// Preview modal for the auto-scheduling proposal (Stage C2) with the
// fingerprint-gated Apply action (Stage D2). RENDER ONLY: it never calls any
// service. All data/loading/error/apply state come in as props; refresh, apply,
// and close are delegated to the parent via callbacks. Closing changes nothing
// on the server - the Preview itself is read-only; only Apply writes.
//
// Props:
//   isOpen        : bool
//   loading       : bool                (Preview in flight)
//   error         : string ("" when none, Preview error)
//   data          : normalized result from mapAutoSchedulePreview (or null)
//   applying      : bool                (Apply in flight)
//   applyError    : string ("" when none, Apply/stale error)
//   isStale       : bool                (409 STALE_PREVIEW - must recalculate)
//   applied       : bool                (Apply succeeded - cannot re-apply)
//   onClose       : () => void
//   onRecalculate : () => void          (calls the read-only Preview again)
//   onApply       : () => void          (calls the fingerprint-gated Apply)
export default function AutoSchedulePreviewModal(props) {
  var isOpen = !!props.isOpen;
  var loading = !!props.loading;
  var error = props.error || "";
  var data = props.data || null;
  var applying = !!props.applying;
  var applyError = props.applyError || "";
  var isStale = !!props.isStale;
  var applied = !!props.applied;

  if (!isOpen) {
    return null;
  }

  var counts = data && data.counts ? data.counts : null;

  // Apply is offered only for a valid, current, not-yet-applied Preview. A
  // missing fingerprint, an empty proposal, a stale Preview, a Preview error,
  // or an in-flight request all block it.
  var hasApplicableData = !!(
    data &&
    !data.isEmpty &&
    data.fingerprint
  );
  var applyDisabled =
    applying || loading || isStale || applied || !!error || !hasApplicableData;
  var showFooter = !loading && !error && !!data;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={props.onClose}
      dir="rtl"
    >
      <div
        className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl"
        onClick={function (e) {
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#EFE5DF] p-6 pb-4">
          <div>
            <h2 className="text-xl font-black text-[#3F312B]">
              תצוגה מקדימה לשיבוץ אוטומטי
            </h2>
            <p className="mt-1 text-xs text-[#8D6E63]">
              זוהי תצוגה מקדימה בלבד. סגירת החלון לא תשמור או תשנה שיבוצים.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={props.onRecalculate}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-[#DDD1CA] bg-white px-3.5 py-2 text-sm font-medium text-[#6B574F] shadow-sm transition-colors hover:bg-[#F8F5F2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : undefined}
              />
              חשב מחדש
            </button>

            <button
              type="button"
              onClick={props.onClose}
              className="rounded-full p-1.5 text-[#6B574F] hover:bg-[#FAF5F1]"
              title="סגירה"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 pt-4 text-right">
          {loading ? (
            <div className="py-12 text-center text-sm text-[#8D6E63]">
              מחשב תצוגה מקדימה לשיבוץ...
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#E7BABA] bg-[#FDF4F4] px-4 py-3 text-sm text-[#A54848]">
                {error}
              </div>
              <p className="text-xs text-[#8D6E63]">
                ניתן לנסות שוב בעזרת "חשב מחדש" או לסגור את החלון.
              </p>
            </div>
          ) : !data ? null : data.isEmpty ? (
            <div className="py-12 text-center text-sm text-[#8D6E63]">
              אין כרגע בקשות להצגה בתצוגה המקדימה.
            </div>
          ) : (
            <div className="space-y-6">
              <SummaryBar counts={counts} />

              <ScheduledSection items={data.scheduled} />
              <FrozenSection items={data.frozen} />
              <UnscheduledSection items={data.unscheduled} />
            </div>
          )}
        </div>

        {/* Footer: fingerprint-gated Apply (Stage D2). Shown only when a Preview
            is available (not while loading and not on a Preview error). */}
        {showFooter ? (
          <div className="border-t border-[#EFE5DF] p-6 pt-4">
            {isStale ? (
              <div className="mb-3 rounded-2xl border border-[#E8C39A] bg-[#FDF6EC] px-4 py-3 text-sm text-[#8A5A22]">
                <p className="font-semibold">{applyError}</p>
                <p className="mt-1 text-xs">
                  התצוגה אינה עדכנית - יש ללחוץ על "חשב מחדש" כדי להפיק תצוגה
                  חדשה לפני החלה.
                </p>
              </div>
            ) : applyError ? (
              <div className="mb-3 rounded-2xl border border-[#E7BABA] bg-[#FDF4F4] px-4 py-3 text-sm text-[#A54848]">
                {applyError}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-[#8D6E63]">
                {applied
                  ? "השיבוץ הוחל בהצלחה."
                  : "החלה תשמור את השיבוץ המוצע שחושב בשרת."}
              </p>

              <button
                type="button"
                onClick={props.onApply}
                disabled={applyDisabled}
                className="flex items-center gap-2 rounded-xl bg-[#8B6352] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#7A5547] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {applied ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <RefreshCw
                    size={16}
                    className={applying ? "animate-spin" : undefined}
                  />
                )}
                {applied ? "הוחל" : applying ? "מחיל שיבוץ..." : "החל שיבוץ"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SummaryBar(props) {
  var counts = props.counts || {};

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <SummaryChip
        label="ישובצו"
        value={counts.scheduled || 0}
        className="border-[#BFD5C3] bg-[#F3FAF4] text-[#2F6B3B]"
      />
      <SummaryChip
        label="יישארו בשיבוץ הקיים"
        value={counts.frozen || 0}
        className="border-[#E2D5CE] bg-[#FAF5F1] text-[#7B5A4D]"
      />
      <SummaryChip
        label="לא שובצו"
        value={counts.unscheduled || 0}
        className="border-[#E7BABA] bg-[#FDF4F4] text-[#A54848]"
      />
    </div>
  );
}

function SummaryChip(props) {
  return (
    <div
      className={
        "flex items-center justify-between rounded-2xl border px-4 py-3 " +
        props.className
      }
    >
      <span className="text-sm font-semibold">{props.label}</span>
      <span className="text-lg font-black">{props.value}</span>
    </div>
  );
}

function Section(props) {
  return (
    <section className="rounded-2xl border border-[#EFE5DF] bg-[#FFFDFB] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-black text-[#5D4037]">{props.title}</h3>
        <span className="rounded-full bg-[#F5EDE8] px-3 py-1 text-xs font-semibold text-[#7B5A4D]">
          {props.count}
        </span>
      </div>

      {props.count === 0 ? (
        <p className="text-xs text-[#8D6E63]">{props.emptyMessage}</p>
      ) : (
        <div className="space-y-2">{props.children}</div>
      )}
    </section>
  );
}

function RowCard(props) {
  return (
    <div className="rounded-xl border border-[#EFE5DF] bg-white p-3">
      {props.children}
    </div>
  );
}

function ScheduledSection(props) {
  var items = Array.isArray(props.items) ? props.items : [];

  return (
    <Section
      title="שיבוצים מוצעים"
      count={items.length}
      emptyMessage="אין שיבוצים מוצעים"
    >
      {items.map(function (item) {
        return (
          <RowCard key={item.paidTimeRequestId}>
            <div className="text-sm font-bold text-[#3F312B]">
              {item.horse}
              <span className="text-xs font-normal text-[#8D6E63]">
                {" · "}
                {item.rider}
                {" · מאמן: "}
                {item.coach}
                {" · משלם: "}
                {item.payer}
              </span>
            </div>

            <div className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-[#6B574F] sm:grid-cols-2">
              <div>
                <span className="text-[#8D6E63]">מבוקש: </span>
                {item.requestedSlotLabel}
              </div>
              <div>
                <span className="text-[#8D6E63]">מוצע: </span>
                {item.assignedSlotLabel}
              </div>
              <div>
                <span className="text-[#8D6E63]">מגרש: </span>
                {item.arena}
              </div>
              <div>
                <span className="text-[#8D6E63]">שעה: </span>
                {item.startTime}
                {item.durationMinutes !== null &&
                item.durationMinutes !== undefined ? (
                  <span>
                    {" · "}
                    {item.durationMinutes} דק'
                  </span>
                ) : null}
              </div>
            </div>
          </RowCard>
        );
      })}
    </Section>
  );
}

function FrozenSection(props) {
  var items = Array.isArray(props.items) ? props.items : [];

  return (
    <Section
      title="שיבוצים קיימים שיישמרו"
      count={items.length}
      emptyMessage="אין שיבוצים קיימים לשמירה"
    >
      {items.map(function (item) {
        return (
          <RowCard key={item.paidTimeRequestId}>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-bold text-[#4B5563]">
                ללא שינוי
              </span>
              <span className="text-sm font-bold text-[#3F312B]">
                {item.horse}
              </span>
            </div>

            <div className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-[#6B574F] sm:grid-cols-2">
              <div>
                <span className="text-[#8D6E63]">סלוט: </span>
                {item.assignedSlotLabel}
              </div>
              <div>
                <span className="text-[#8D6E63]">מגרש: </span>
                {item.arena}
              </div>
              <div>
                <span className="text-[#8D6E63]">שעה: </span>
                {item.startTime}
              </div>
              <div>
                <span className="text-[#8D6E63]">סדר: </span>
                {item.assignedOrder !== null && item.assignedOrder !== undefined
                  ? item.assignedOrder
                  : "—"}
              </div>
            </div>
          </RowCard>
        );
      })}
    </Section>
  );
}

function UnscheduledSection(props) {
  var items = Array.isArray(props.items) ? props.items : [];

  return (
    <Section
      title="בקשות שלא שובצו"
      count={items.length}
      emptyMessage="אין בקשות שלא שובצו"
    >
      {items.map(function (item) {
        return (
          <RowCard key={item.paidTimeRequestId}>
            <div className="text-sm font-bold text-[#3F312B]">
              {item.horse}
              <span className="text-xs font-normal text-[#8D6E63]">
                {" · "}
                {item.rider}
                {" · מאמן: "}
                {item.coach}
              </span>
            </div>

            <div className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-[#6B574F] sm:grid-cols-2">
              <div>
                <span className="text-[#8D6E63]">מבוקש: </span>
                {item.requestedSlotLabel}
              </div>
              <div>
                <span className="text-[#8D6E63]">סיבה: </span>
                {item.reasonText}
              </div>
            </div>
          </RowCard>
        );
      })}
    </Section>
  );
}
