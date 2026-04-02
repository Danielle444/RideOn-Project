import SecretaryLayout from "../components/secretary/SecretaryLayout";

export default function CompetitionsBoardPage() {
  const competitions = [
    {
      name: "ריינינג 1+2 2026",
      field: "ריינינג",
      host: "חוות דאבל קיי",
      dates: "15/03/2026 - 17/03/2026",
      status: "כעת",
    },
    {
      name: "גביע האביב",
      field: "דרסז'",
      host: "חוות סוסים גליל",
      dates: "22/04/2026 - 23/04/2026",
      status: "טיוטה",
    },
    {
      name: "תחרות חורף 2025",
      field: "קפיצות",
      host: "מרכז רכיבה בניה",
      dates: "10/12/2025 - 12/12/2025",
      status: "הסתיימה",
    },
    {
      name: "אליפות הנוער",
      field: "אקסטרים",
      host: "מועדון רכיבה השרון",
      dates: "05/05/2026 - 07/05/2026",
      status: "פתוחה",
    },
  ];

  function getStatusClass(status) {
    if (status === "כעת") {
      return "bg-green-100 text-green-700";
    }

    if (status === "טיוטה") {
      return "bg-red-100 text-red-700";
    }

    if (status === "הסתיימה") {
      return "bg-gray-100 text-gray-700";
    }

    return "bg-blue-100 text-blue-700";
  }

  return (
    <SecretaryLayout sidebarMode="general" activeItemKey="competitions-board">
      <div className="bg-white rounded-[28px] border border-[#E2D6CF] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-8 py-6 border-b border-[#EFE5E0]">
          <h1 className="text-[2.2rem] font-bold text-[#3E2723]">
            לוח תחרויות
          </h1>

          <button
            type="button"
            onClick={function () {
              alert("פתיחת תחרות חדשה תתחבר כאן בהמשך");
            }}
            className="bg-[#8B6352] hover:bg-[#774E3E] text-white text-[1.35rem] font-semibold px-8 py-4 rounded-2xl transition-all shadow-sm"
          >
            + פתיחת תחרות חדשה
          </button>
        </div>

        <div className="px-8 py-7">
          <div className="rounded-[24px] border border-[#E4D8D1] bg-[#FDFBFA] p-6 mb-8">
            <div className="flex items-center justify-start gap-4 flex-wrap text-[#5D4037] text-lg font-semibold">
              <span>סינון:</span>

              <select className="rounded-xl border border-[#D7CCC8] px-4 py-2 bg-white text-[#3E2723]">
                <option>הכל</option>
              </select>
              <span>סטטוס</span>

              <select className="rounded-xl border border-[#D7CCC8] px-4 py-2 bg-white text-[#3E2723]">
                <option>הכל</option>
              </select>
              <span>טווח תאריכים</span>

              <select className="rounded-xl border border-[#D7CCC8] px-4 py-2 bg-white text-[#3E2723]">
                <option>הכל</option>
              </select>
              <span>ענף</span>
            </div>

            <div className="mt-6 flex justify-end">
              <div className="w-full max-w-[420px]">
                <input
                  type="text"
                  placeholder="חיפוש לפי שם תחרות או חווה..."
                  className="w-full rounded-xl border border-[#D7CCC8] px-5 py-4 text-right text-[#3E2723] placeholder-[#BCAAA4] focus:outline-none focus:border-[#8B6352]"
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E8DDD7]">
            <div className="grid grid-cols-[1.2fr_0.8fr_1.1fr_1.1fr_0.8fr_1fr] bg-[#F3ECE8] px-6 py-5 text-[#4E342E] text-[1.2rem] font-bold">
              <div className="text-right">שם תחרות</div>
              <div className="text-right">ענף</div>
              <div className="text-right">חווה מארחת</div>
              <div className="text-right">תאריכי תחרות</div>
              <div className="text-right">סטטוס</div>
              <div className="text-right">פעולות</div>
            </div>

            {competitions.map(function (item, index) {
              return (
                <div
                  key={index}
                  className="grid grid-cols-[1.2fr_0.8fr_1.1fr_1.1fr_0.8fr_1fr] px-6 py-6 border-t border-[#EFE5E0] items-center text-[#3E2723] text-[1.1rem]"
                >
                  <div className="text-right">{item.name}</div>
                  <div className="text-right">{item.field}</div>
                  <div className="text-right">{item.host}</div>
                  <div className="text-right">{item.dates}</div>

                  <div className="text-right">
                    <span
                      className={
                        "inline-flex rounded-full px-4 py-2 text-sm font-semibold " +
                        getStatusClass(item.status)
                      }
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="text-right text-[#8B6352] font-semibold">
                    כניסה | עריכה
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SecretaryLayout>
  );
}