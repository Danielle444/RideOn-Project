import SectionCard from "./SectionCard";
import StatusBadge from "./StatusBadge";

export default function CompetitionDetailsSection(props) {
  return (
    <SectionCard
      title="1. פרטי תחרות"
      isOpen={props.isOpen}
      onToggle={props.onToggle}
      statusText={props.competitionId ? "נשמר" : "לא נשמר"}
    >
      {props.loadingPage ? (
        <div className="text-right text-[#6D4C41]">טוען נתונים...</div>
      ) : (
        <div className="space-y-7">
          <div className="flex items-center justify-start gap-3">
            <span className="text-sm font-semibold text-[#6D4C41]">סטטוס:</span>
            <StatusBadge status={props.currentStatus} />
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-7 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                שם תחרות
              </label>
              <input
                type="text"
                value={props.detailsForm.competitionName}
                onChange={function (e) {
                  props.onChange("competitionName", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                ענף
              </label>
              <select
                value={props.detailsForm.fieldId}
                onChange={function (e) {
                  props.onChange("fieldId", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
              >
                <option value="">בחרי ענף</option>
                {props.fields.map(function (field) {
                  return (
                    <option key={field.fieldId} value={field.fieldId}>
                      {field.fieldName}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                תאריך התחלה
              </label>
              <input
                type="date"
                value={props.detailsForm.competitionStartDate}
                onChange={function (e) {
                  props.onChange("competitionStartDate", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                תאריך סיום
              </label>
              <input
                type="date"
                value={props.detailsForm.competitionEndDate}
                onChange={function (e) {
                  props.onChange("competitionEndDate", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                פתיחת הרשמה
              </label>
              <input
                type="date"
                value={props.detailsForm.registrationOpenDate}
                onChange={function (e) {
                  props.onChange("registrationOpenDate", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                סגירת הרשמה
              </label>
              <input
                type="date"
                value={props.detailsForm.registrationEndDate}
                onChange={function (e) {
                  props.onChange("registrationEndDate", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                פתיחת הרשמת פייד־טיים
              </label>
              <input
                type="date"
                value={props.detailsForm.paidTimeRegistrationDate}
                onChange={function (e) {
                  props.onChange("paidTimeRegistrationDate", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                פרסום לו״ז פייד־טיים
              </label>
              <input
                type="date"
                value={props.detailsForm.paidTimePublicationDate}
                onChange={function (e) {
                  props.onChange("paidTimePublicationDate", e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                הערות
              </label>
              <textarea
                rows={5}
                value={props.detailsForm.notes}
                onChange={function (e) {
                  props.onChange("notes", e.target.value);
                }}
                className="w-full rounded-xl border border-[#D7CCC8] bg-white px-4 py-3 text-right"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-[#EFE5DF] pt-4">
            <button
              type="button"
              onClick={props.onSaveDraft}
              disabled={props.savingDetails}
              className="rounded-xl border border-[#D7CCC8] px-5 py-3 font-semibold text-[#5D4037] transition-colors hover:bg-[#F8F5F2] disabled:opacity-70"
            >
              {props.savingDetails ? "שומר..." : "שמור כטיוטה"}
            </button>

            <button
              type="button"
              onClick={props.onSaveAndContinue}
              disabled={props.savingDetails}
              className="rounded-xl bg-[#8B6352] px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#7A5547] disabled:opacity-70"
            >
              {props.savingDetails ? "שומר..." : "שמור והמשך למקצים"}
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}