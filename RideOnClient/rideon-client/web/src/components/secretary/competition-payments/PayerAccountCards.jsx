import PaymentStatusBadge from "./PaymentStatusBadge";

function getValue(item, camelKey, pascalKey, fallback) {
  if (!item) {
    return fallback;
  }

  if (item[camelKey] !== null && item[camelKey] !== undefined) {
    return item[camelKey];
  }

  if (item[pascalKey] !== null && item[pascalKey] !== undefined) {
    return item[pascalKey];
  }

  return fallback;
}

function formatMoney(value) {
  return "₪" + Number(value || 0).toLocaleString("he-IL");
}

function getOwnerLabel(owner) {
  if (owner === "Organizer") {
    return "חשבון מארגן";
  }

  if (owner === "Federation") {
    return "חשבון התאחדות";
  }

  return owner;
}

function findSummary(items, owner) {
  return (items || []).find(function (item) {
    return getValue(item, "chargeOwner", "ChargeOwner", "") === owner;
  });
}

function getFederationCoverageInfo(status, validation, loading) {
  if (loading) {
    return {
      label: "בודק כיסוי התאחדות...",
      description: "מתבצעת בדיקה מול חיובי ההתאחדות של המשלם",
      className: "border-[#E6DCD5] bg-[#FCFAF8] text-[#7B5A4D]",
    };
  }

  if (!status) {
    return null;
  }

  var coverageStatus = getValue(status, "coverageStatus", "CoverageStatus", "");

  var missingAmount = getValue(
    status,
    "missingFederationAmount",
    "MissingFederationAmount",
    0,
  );

  var coveredAmount = getValue(
    status,
    "coveredFederationAmount",
    "CoveredFederationAmount",
    0,
  );

  var totalAmount = getValue(
    status,
    "totalFederationAmount",
    "TotalFederationAmount",
    0,
  );

  var message = getValue(validation, "message", "Message", "");

  if (coverageStatus === "מכוסה במלואו") {
    return {
      label: "כיסוי התאחדות תקין",
      description:
        message || "כל חיובי ההתאחדות מכוסים, ניתן להמשיך לסגירת תשלום מארגן.",
      className: "border-green-200 bg-green-50 text-green-800",
    };
  }

  if (coverageStatus === "כיסוי חלקי") {
    return {
      label: "כיסוי התאחדות חלקי",
      description:
        "כוסה " +
        formatMoney(coveredAmount) +
        " מתוך " +
        formatMoney(totalAmount) +
        ". חסר " +
        formatMoney(missingAmount) +
        ".",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  if (coverageStatus === "חסר כיסוי") {
    return {
      label: "חסר כיסוי התאחדות",
      description:
        message ||
        "חסר " +
          formatMoney(missingAmount) +
          ". יש להשלים או לשייך קבלה לפני סגירת תשלום מארגן.",
      className: "border-red-200 bg-red-50 text-red-800",
    };
  }

  if (coverageStatus === "אין חיובי התאחדות") {
    return {
      label: "אין חיובי התאחדות",
      description: "למשלם זה אין חיובי התאחדות פתוחים בתחרות.",
      className: "border-[#E6DCD5] bg-[#FCFAF8] text-[#7B5A4D]",
    };
  }

  return {
    label: coverageStatus || "סטטוס התאחדות",
    description: message || "סטטוס כיסוי ההתאחדות של המשלם.",
    className: "border-[#E6DCD5] bg-[#FCFAF8] text-[#7B5A4D]",
  };
}

function FederationCoverageMiniStatus(props) {
  var info = getFederationCoverageInfo(
    props.status,
    props.validation,
    props.loading,
  );

  if (!info) {
    return null;
  }

  return (
    <div className={"mt-5 rounded-2xl border px-4 py-3 " + info.className}>
      <p className="text-sm font-black">{info.label}</p>
      <p className="mt-1 text-xs font-bold opacity-80">{info.description}</p>
    </div>
  );
}

function MoneyTile(props) {
  var colorClass = props.colorClass || "text-[#7B5A4D]";
  var compact = props.compact === true;

  return (
    <div
      className={
        "min-w-0 rounded-2xl border border-[#E3D7D0] bg-white text-right shadow-sm " +
        (compact ? "px-4 py-3" : "px-6 py-5")
      }
    >
      <p className="text-sm font-bold text-[#6D4C41]">{props.label}</p>

      <p
        className={
          "mt-3 break-words text-2xl font-black tabular-nums lg:text-3xl " +
          colorClass
        }
      >
        {formatMoney(props.amount)}
      </p>
    </div>
  );
}

function AccountCard(props) {
  var item = props.item || {};
  var owner = props.owner;
  var isActive = props.activeOwner === owner;

  return (
    <button
      type="button"
      onClick={function () {
        props.onSelectOwner(owner);
      }}
      className={
        "rounded-[24px] border p-6 text-right shadow-sm transition-colors " +
        (isActive
          ? "border-[#8B5E4C] bg-[#FCF8F5]"
          : "border-[#E6DCD5] bg-white hover:bg-[#FCFAF8]")
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-[#3F312B]">
            {getOwnerLabel(owner)}
          </h3>

          <p className="mt-1 text-sm text-[#8A7268]">
            {owner === "Organizer"
              ? "מקצים, פייד־טיים, תאים ונסורת"
              : "חלק ההתאחדות מתוך המקצים"}
          </p>
        </div>

        <PaymentStatusBadge
          status={getValue(item, "paymentStatus", "PaymentStatus", "NoCharges")}
          totalAmount={getValue(item, "totalAmount", "TotalAmount", 0)}
          unpaidAmount={getValue(item, "unpaidAmount", "UnpaidAmount", 0)}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MoneyTile
          label="סה״כ"
          amount={getValue(item, "totalAmount", "TotalAmount", 0)}
          colorClass="text-[#7B5A4D]"
          compact
        />

        <MoneyTile
          label="שולם"
          amount={getValue(item, "paidAmount", "PaidAmount", 0)}
          colorClass="text-[#2E7D32]"
          compact
        />

        <MoneyTile
          label="יתרה"
          amount={getValue(item, "unpaidAmount", "UnpaidAmount", 0)}
          colorClass="text-[#C62828]"
          compact
        />
      </div>

      {owner === "Federation" ? (
        <FederationCoverageMiniStatus
          status={props.federationCoverageStatus}
          validation={props.federationValidation}
          loading={props.federationCoverageLoading}
        />
      ) : null}
    </button>
  );
}

export default function PayerAccountCards(props) {
  var organizer = findSummary(props.items, "Organizer");
  var federation = findSummary(props.items, "Federation");

  return (
    <section className="rounded-[28px] border border-[#E6DCD5] bg-white p-8 shadow-sm">
      <div className="mb-7">
        <h2 className="text-3xl font-black text-[#3F312B]">חשבונות המשלם</h2>

        <p className="mt-2 text-sm text-[#8A7268]">
          סה״כ, שולם ויתרה עבור חשבון המארגן וחשבון ההתאחדות של המשלם.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <AccountCard
          owner="Organizer"
          item={organizer}
          activeOwner={props.activeOwner}
          onSelectOwner={props.onSelectOwner}
        />

        <AccountCard
          owner="Federation"
          item={federation}
          activeOwner={props.activeOwner}
          onSelectOwner={props.onSelectOwner}
          federationCoverageStatus={props.federationCoverageStatus}
          federationValidation={props.federationValidation}
          federationCoverageLoading={props.federationCoverageLoading}
        />
      </div>
    </section>
  );
}

export { MoneyTile };
