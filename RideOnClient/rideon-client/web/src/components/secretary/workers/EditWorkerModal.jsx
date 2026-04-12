import { X } from "lucide-react";

export default function EditWorkerModal(props) {
  if (!props.isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-[760px] rounded-[28px] border border-[#E6DCD5] bg-white shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#EFE5DF] flex items-center justify-between gap-4">
          <div className="text-right">
            <h3 className="text-xl font-bold text-[#3F312B]">
              עריכת פרטי עובד
            </h3>
            <p className="mt-1 text-sm text-[#8A7268]">
              עדכון פרטי העובד המשויך לחווה הפעילה
            </p>
          </div>

          <button
            type="button"
            onClick={props.onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#F8F5F2] text-[#7B5A4D]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#E7DCD5] bg-white px-4 py-3">
              <label className="text-sm font-semibold text-[#7B5A4D]">
                שם פרטי
              </label>
              <input
                value={props.editForm.firstName}
                onChange={function (e) {
                  props.onChangeField("firstName", e.target.value);
                }}
                className="mt-2 h-10 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-right text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
              />
            </div>

            <div className="rounded-2xl border border-[#E7DCD5] bg-white px-4 py-3">
              <label className="text-sm font-semibold text-[#7B5A4D]">
                שם משפחה
              </label>
              <input
                value={props.editForm.lastName}
                onChange={function (e) {
                  props.onChangeField("lastName", e.target.value);
                }}
                className="mt-2 h-10 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-right text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
              />
            </div>

            <div className="rounded-2xl border border-[#E7DCD5] bg-white px-4 py-3">
              <label className="text-sm font-semibold text-[#7B5A4D]">
                טלפון
              </label>
              <input
                value={props.editForm.cellPhone}
                onChange={function (e) {
                  props.onChangeField("cellPhone", e.target.value);
                }}
                className="mt-2 h-10 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-right text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
              />
            </div>

            <div className="rounded-2xl border border-[#E7DCD5] bg-white px-4 py-3">
              <label className="text-sm font-semibold text-[#7B5A4D]">
                אימייל
              </label>
              <input
                value={props.editForm.email}
                onChange={function (e) {
                  props.onChangeField("email", e.target.value);
                }}
                className="mt-2 h-10 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-right text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
              />
            </div>

            <div className="rounded-2xl border border-[#E7DCD5] bg-white px-4 py-3">
              <label className="text-sm font-semibold text-[#7B5A4D]">
                מגדר
              </label>
              <input
                value={props.editForm.gender}
                onChange={function (e) {
                  props.onChangeField("gender", e.target.value);
                }}
                className="mt-2 h-10 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-right text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
              />
            </div>

            <div className="rounded-2xl border border-[#E7DCD5] bg-[#F8F5F2] px-4 py-3">
              <label className="text-sm font-semibold text-[#7B5A4D]">
                שם משתמש
              </label>
              <input
                value={props.editingWorker?.username || ""}
                disabled={true}
                className="mt-2 h-10 w-full rounded-xl border border-[#E1D6D0] bg-[#F3ECE8] px-4 text-right text-[#8A7268] shadow-sm cursor-not-allowed"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-start gap-3">
            <button
              type="button"
              onClick={props.onSave}
              disabled={props.editSaving}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#7B5A4D] px-5 py-2.5 text-white font-semibold shadow-sm hover:bg-[#6B4D42] disabled:opacity-60"
            >
              {props.editSaving ? "שומרת..." : "שמירת שינויים"}
            </button>

            <button
              type="button"
              onClick={props.onClose}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#D8CBC3] bg-white px-4 py-2.5 text-[#5D4037] font-semibold hover:bg-[#F8F5F2]"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}