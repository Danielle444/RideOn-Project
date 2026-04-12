import { useEffect, useState } from "react";
import SectionCard from "./SectionCard";
import StatusBadge from "./StatusBadge";
import CustomDropdown from "../../common/CustomDropdown";
import MultiSelectPicker from "../../common/MultiSelectPicker";
import JudgeModal from "../../common/JudgeModal";
import useJudgeCreation from "../../../hooks/common/useJudgeCreation";

export default function CompetitionDetailsSection(props) {
  var fields = Array.isArray(props.fields) ? props.fields : [];
  var judges = Array.isArray(props.judges) ? props.judges : [];
  var selectedCompetitionJudgeIds = Array.isArray(
    props.selectedCompetitionJudgeIds,
  )
    ? props.selectedCompetitionJudgeIds
    : [];

  var [openDropdownKey, setOpenDropdownKey] = useState("");
  var [localJudges, setLocalJudges] = useState(judges);

  useEffect(
    function () {
      setLocalJudges(judges);
    },
    [judges],
  );

  var judgeCreation = useJudgeCreation({
    fieldId: props.detailsForm.fieldId,
    onJudgesUpdated: function (refreshedJudges) {
      setLocalJudges(refreshedJudges);

      if (props.onJudgesReloaded) {
        props.onJudgesReloaded(refreshedJudges);
      }
    },
    onJudgeCreated: function (createdJudge) {
      if (
        createdJudge &&
        props.onToggleCompetitionJudge &&
        !selectedCompetitionJudgeIds.some(function (id) {
          return String(id) === String(createdJudge.judgeId);
        })
      ) {
        props.onToggleCompetitionJudge(createdJudge.judgeId);
      }
    },
  });

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

              <CustomDropdown
                dropdownKey="competition-field"
                openDropdownKey={openDropdownKey}
                setOpenDropdownKey={setOpenDropdownKey}
                options={fields}
                value={props.detailsForm.fieldId}
                placeholder="בחרי ענף"
                searchable={true}
                getOptionValue={function (field) {
                  return field.fieldId;
                }}
                getOptionLabel={function (field) {
                  return field.fieldName;
                }}
                onChange={function (e) {
                  props.onChange("fieldId", e.target.value);
                }}
              />
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
                שופטים כלליים לתחרות
              </label>

              {!props.detailsForm.fieldId ? (
                <div className="rounded-2xl border border-[#D7CCC8] bg-[#FFFCFA] px-4 py-4 text-right text-sm text-[#8B6A5A]">
                  יש לבחור קודם ענף כדי לטעון שופטים מתאימים.
                </div>
              ) : (
                <>
                  <div className="mb-3 text-right text-sm text-[#8B6A5A]">
                    הבחירה כאן היא עזר להגדרת מקצים. בפועל, השופטים נשמרים לכל
                    מקצה בנפרד.
                  </div>

                  <MultiSelectPicker
                    options={localJudges}
                    selectedValues={selectedCompetitionJudgeIds}
                    onToggleValue={props.onToggleCompetitionJudge}
                    getOptionValue={function (judge) {
                      return judge.judgeId;
                    }}
                    getOptionLabel={function (judge) {
                      return [judge.firstNameHebrew, judge.lastNameHebrew]
                        .filter(Boolean)
                        .join(" ");
                    }}
                    getOptionSearchText={function (judge) {
                      return [
                        judge.firstNameHebrew,
                        judge.lastNameHebrew,
                        judge.firstNameEnglish,
                        judge.lastNameEnglish,
                        judge.country,
                        judge.qualifiedFields,
                      ]
                        .filter(Boolean)
                        .join(" ");
                    }}
                    renderOptionMeta={function (judge) {
                      return [judge.country, judge.qualifiedFields]
                        .filter(Boolean)
                        .join(" • ");
                    }}
                    searchPlaceholder="חיפוש שופט לפי שם, מדינה או ענף"
                    emptySelectionText="לא נבחרו שופטים"
                    noResultsText="לא נמצאו שופטים להצגה"
                    actionButtonLabel="+ הוספת שופט"
                    onActionButtonClick={judgeCreation.handleOpenJudgeModal}
                  />
                </>
              )}
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

      <JudgeModal
        isOpen={judgeCreation.judgeModalOpen}
        onClose={judgeCreation.handleCloseJudgeModal}
        onSubmit={judgeCreation.handleCreateJudge}
        initialJudge={null}
        fields={judgeCreation.judgeFields}
        error={judgeCreation.judgeModalError}
      />
    </SectionCard>
  );
}