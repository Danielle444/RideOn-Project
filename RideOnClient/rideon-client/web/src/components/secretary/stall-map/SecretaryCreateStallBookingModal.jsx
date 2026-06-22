import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getCompetitionPayersForSecretary } from "../../../services/secretaryPayersService";
import { getHorsesForStallBooking } from "../../../services/stallBookingsService";
import { getServicePricesDashboard } from "../../../services/servicePricesService";

// Secretary "+ Add stall" modal. Loads payers, horses, and stall-product
// types on open. Posts via parent's onSubmit.
export default function SecretaryCreateStallBookingModal(props) {
  var isOpen = !!props.isOpen;
  var competitionId = props.competitionId;
  var ranchId = props.ranchId;

  var [payers, setPayers] = useState([]);
  var [horses, setHorses] = useState([]);
  var [productOptions, setProductOptions] = useState([]);
  var [loadingPayers, setLoadingPayers] = useState(false);
  var [loadingHorses, setLoadingHorses] = useState(false);
  var [loadingProducts, setLoadingProducts] = useState(false);

  var [payerPersonId, setPayerPersonId] = useState("");
  var [isForTack, setIsForTack] = useState(false);
  var [horseId, setHorseId] = useState("");
  var [productId, setProductId] = useState("");
  var [startDate, setStartDate] = useState("");
  var [endDate, setEndDate] = useState("");
  var [notes, setNotes] = useState("");
  var [error, setError] = useState("");
  var [saving, setSaving] = useState(false);

  useEffect(
    function () {
      if (!isOpen) return;

      // Reset state when opening
      setPayerPersonId("");
      setIsForTack(false);
      setHorseId("");
      setProductId("");
      setStartDate("");
      setEndDate("");
      setNotes("");
      setError("");

      setLoadingPayers(true);
      getCompetitionPayersForSecretary(competitionId, ranchId)
        .then(function (res) {
          setPayers(Array.isArray(res.data) ? res.data : []);
        })
        .catch(function () {
          setPayers([]);
        })
        .finally(function () {
          setLoadingPayers(false);
        });

      setLoadingHorses(true);
      getHorsesForStallBooking(competitionId, ranchId)
        .then(function (res) {
          setHorses(Array.isArray(res.data) ? res.data : []);
        })
        .catch(function () {
          setHorses([]);
        })
        .finally(function () {
          setLoadingHorses(false);
        });

      setLoadingProducts(true);
      getServicePricesDashboard(ranchId)
        .then(function (res) {
          var data = res.data || {};
          var sections = Array.isArray(data.sections)
            ? data.sections
            : Array.isArray(data.categories)
              ? data.categories
              : Array.isArray(data)
                ? data
                : [];
          var stallSection = sections.find(function (s) {
            var name = String(s.categoryKey || s.CategoryKey || s.categoryName || s.CategoryName || "");
            return (
              name.toLowerCase() === "stalls" ||
              name.indexOf("תא") >= 0
            );
          });
          var items = stallSection
            ? Array.isArray(stallSection.items)
              ? stallSection.items
              : Array.isArray(stallSection.products)
                ? stallSection.products
                : []
            : [];
          // Normalize productid + productname
          var normalized = items
            .map(function (it) {
              return {
                productId: it.productId || it.ProductId,
                productName: it.productName || it.ProductName,
              };
            })
            .filter(function (it) {
              return it.productId && it.productName;
            });
          setProductOptions(normalized);
        })
        .catch(function () {
          setProductOptions([]);
        })
        .finally(function () {
          setLoadingProducts(false);
        });
    },
    [isOpen, competitionId, ranchId],
  );

  function validate() {
    if (!payerPersonId) return "יש לבחור משלם";
    if (!productId) return "יש לבחור סוג תא";
    if (!startDate || !endDate) return "יש לבחור תאריכי התחלה וסיום";
    if (new Date(endDate) < new Date(startDate))
      return "תאריך סיום חייב להיות אחרי תאריך התחלה";
    if (!isForTack && !horseId) return "יש לבחור סוס (או לסמן 'תא ציוד')";
    return "";
  }

  async function handleSubmit() {
    var msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    try {
      setSaving(true);
      setError("");

      await props.onSubmit({
        payerPersonId: Number(payerPersonId),
        horseId: isForTack ? null : Number(horseId),
        isForTack: isForTack,
        productId: Number(productId),
        startDate: startDate,
        endDate: endDate,
        notes: notes ? notes.trim() : null,
      });

      props.onClose();
    } catch (err) {
      setError(String(err?.response?.data || err?.message || "שגיאה ביצירת תא"));
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      onClick={props.onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
        onClick={function (e) {
          e.stopPropagation();
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-[#3F312B]">+ הוספת תא</h2>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full p-1.5 text-[#6B574F] hover:bg-[#FAF5F1]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 text-right">
          <div>
            <label className="block text-sm font-bold text-[#5D4037] mb-1">
              משלם
            </label>
            <select
              value={payerPersonId}
              onChange={function (e) {
                setPayerPersonId(e.target.value);
              }}
              disabled={loadingPayers}
              className="w-full rounded-xl border border-[#E2D5CE] bg-white px-3 py-2 text-right text-sm"
            >
              <option value="">
                {loadingPayers ? "טוען משלמים..." : "בחר משלם"}
              </option>
              {payers.map(function (p) {
                return (
                  <option key={p.payerPersonId} value={p.payerPersonId}>
                    {p.fullName}
                    {p.cellPhone ? " · " + p.cellPhone : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <label className="flex items-center justify-end gap-2 text-sm">
            <span>תא ציוד (ללא סוס)</span>
            <input
              type="checkbox"
              checked={isForTack}
              onChange={function (e) {
                setIsForTack(e.target.checked);
                if (e.target.checked) setHorseId("");
              }}
              className="h-4 w-4 accent-[#8B5E4C]"
            />
          </label>

          {!isForTack ? (
            <div>
              <label className="block text-sm font-bold text-[#5D4037] mb-1">
                סוס
              </label>
              <select
                value={horseId}
                onChange={function (e) {
                  setHorseId(e.target.value);
                }}
                disabled={loadingHorses}
                className="w-full rounded-xl border border-[#E2D5CE] bg-white px-3 py-2 text-right text-sm"
              >
                <option value="">
                  {loadingHorses ? "טוען סוסים..." : "בחר סוס"}
                </option>
                {horses.map(function (h) {
                  return (
                    <option key={h.horseId} value={h.horseId}>
                      {h.horseName}
                      {h.barnName ? " (" + h.barnName + ")" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-bold text-[#5D4037] mb-1">
              סוג תא
            </label>
            <select
              value={productId}
              onChange={function (e) {
                setProductId(e.target.value);
              }}
              disabled={loadingProducts}
              className="w-full rounded-xl border border-[#E2D5CE] bg-white px-3 py-2 text-right text-sm"
            >
              <option value="">
                {loadingProducts ? "טוען סוגי תאים..." : "בחר סוג תא"}
              </option>
              {productOptions.map(function (p) {
                return (
                  <option key={p.productId} value={p.productId}>
                    {p.productName}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-[#5D4037] mb-1">
                מתאריך
              </label>
              <input
                type="date"
                value={startDate}
                onChange={function (e) {
                  setStartDate(e.target.value);
                }}
                className="w-full rounded-xl border border-[#E2D5CE] bg-white px-3 py-2 text-right text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#5D4037] mb-1">
                עד תאריך
              </label>
              <input
                type="date"
                value={endDate}
                onChange={function (e) {
                  setEndDate(e.target.value);
                }}
                className="w-full rounded-xl border border-[#E2D5CE] bg-white px-3 py-2 text-right text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#5D4037] mb-1">
              הערות
            </label>
            <textarea
              value={notes}
              onChange={function (e) {
                setNotes(e.target.value);
              }}
              rows={2}
              className="w-full rounded-xl border border-[#E2D5CE] bg-white px-3 py-2 text-right text-sm"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex justify-start gap-2 pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-2xl bg-[#7B5A4D] px-5 py-2 text-sm font-black text-white hover:bg-[#6B4D42] disabled:opacity-60"
            >
              {saving ? "שומר..." : "צור תא"}
            </button>
            <button
              type="button"
              onClick={props.onClose}
              disabled={saving}
              className="rounded-2xl border border-[#E2D5CE] bg-white px-5 py-2 text-sm font-bold text-[#6B574F] hover:bg-[#FAF5F1]"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
