import { Building2, Pencil, X } from "lucide-react";
import ProfileFieldBox from "./ProfileFieldBox";
import RanchLocationPicker from "../../common/RanchLocationPicker";

export default function RanchProfileCard(props) {
  const page = props.page;

  return (
    <div className="rounded-[22px] border border-[#E7DCD5] bg-[#FCFAF8] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#EFE5DF] flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#F3ECE8] text-[#7B5A4D]">
          <Building2 size={17} />
        </div>

        <div className="text-right">
          <h3 className="text-base font-bold text-[#3F312B]">
            פרטי החווה הפעילה
          </h3>
          <p className="mt-1 text-sm text-[#8A7268]">
            פרטי החווה של הפרופיל הפעיל כרגע
          </p>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ProfileFieldBox
            label="שם חווה"
            value={
              page.isEditingRanch
                ? page.ranchForm.ranchName
                : page.data?.activeRanch?.ranchName
            }
            editable={page.isEditingRanch}
            onChange={function (e) {
              page.setRanchField("ranchName", e.target.value);
            }}
          />

          <ProfileFieldBox
            label="אימייל חווה"
            value={
              page.isEditingRanch
                ? page.ranchForm.contactEmail
                : page.data?.activeRanch?.contactEmail
            }
            editable={page.isEditingRanch}
            onChange={function (e) {
              page.setRanchField("contactEmail", e.target.value);
            }}
          />

          <ProfileFieldBox
            label="טלפון חווה"
            value={
              page.isEditingRanch
                ? page.ranchForm.contactPhone
                : page.data?.activeRanch?.contactPhone
            }
            editable={page.isEditingRanch}
            onChange={function (e) {
              page.setRanchField("contactPhone", e.target.value);
            }}
          />

          <ProfileFieldBox
            label="אתר"
            value={
              page.isEditingRanch
                ? page.ranchForm.websiteUrl
                : page.data?.activeRanch?.websiteUrl
            }
            editable={page.isEditingRanch}
            onChange={function (e) {
              page.setRanchField("websiteUrl", e.target.value);
            }}
          />

          <div className="col-span-1 md:col-span-2">
            <div className="rounded-2xl border border-[#E7DCD5] bg-white px-4 py-4">
              <label className="block text-sm font-semibold text-[#7B5A4D] text-right mb-3">
                מיקום החווה
              </label>

              {page.isEditingRanch ? (
                <RanchLocationPicker
                  latitude={page.ranchForm.latitude}
                  longitude={page.ranchForm.longitude}
                  onChange={function (coords) {
                    page.setRanchField("latitude", coords.latitude);
                    page.setRanchField("longitude", coords.longitude);
                  }}
                />
              ) : (
                page.data?.activeRanch?.latitude && page.data?.activeRanch?.longitude ? (
                  <RanchLocationPicker
                    latitude={page.data.activeRanch.latitude}
                    longitude={page.data.activeRanch.longitude}
                    readOnly={true}
                    onChange={function () {}}
                  />
                ) : (
                  <p className="text-sm text-[#BCAAA4] text-right">לא הוגדר מיקום</p>
                )
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-start gap-3">
          {!page.isEditingRanch ? (
            <button
              type="button"
              onClick={page.startEditRanch}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#D8CBC3] bg-white px-4 py-2.5 text-[#5D4037] font-semibold hover:bg-[#F8F5F2]"
            >
              <Pencil size={17} />
              עריכת פרטי חווה
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={page.saveRanchProfile}
                disabled={page.savingRanch}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#7B5A4D] px-5 py-2.5 text-white font-semibold shadow-sm hover:bg-[#6B4D42] disabled:opacity-60"
              >
                {page.savingRanch ? "שומרת..." : "שמירת פרטי חווה"}
              </button>

              <button
                type="button"
                onClick={page.cancelEditRanch}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#D8CBC3] bg-white px-4 py-2.5 text-[#5D4037] font-semibold hover:bg-[#F8F5F2]"
              >
                <X size={17} />
                ביטול
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}