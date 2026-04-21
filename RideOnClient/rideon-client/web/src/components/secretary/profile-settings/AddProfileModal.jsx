import { X } from "lucide-react";
import CustomDropdown from "../../common/CustomDropdown";

export default function AddProfileModal(props) {
  if (!props.isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-[620px] rounded-[28px] border border-[#E6DCD5] bg-white shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#EFE5DF] flex items-center justify-between gap-4">
          <div className="text-right">
            <h3 className="text-xl font-bold text-[#3F312B]">
              הוספת פרופיל חדש
            </h3>
            <p className="mt-1 text-sm text-[#8A7268]">
              בקשת שיוך לחווה ותפקיד נוספים
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
          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-2xl border border-[#E7DCD5] bg-white px-4 py-3 min-h-[110px]">
              <label className="block text-sm font-semibold text-[#7B5A4D] text-right">
                חווה
              </label>

              <div className="mt-3">
                <CustomDropdown
                  options={props.availableRanches}
                  value={props.addProfileForm.ranchId}
                  onChange={function (e) {
                    props.setAddProfileField("ranchId", e.target.value);
                  }}
                  placeholder="בחרי חווה"
                  dropdownKey="add-profile-ranch"
                  openDropdownKey={props.openDropdownKey}
                  setOpenDropdownKey={props.setOpenDropdownKey}
                  getOptionValue={function (option) {
                    return option.ranchId;
                  }}
                  getOptionLabel={function (option) {
                    return option.ranchName;
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[#E7DCD5] bg-white px-4 py-3 min-h-[110px]">
              <label className="block text-sm font-semibold text-[#7B5A4D] text-right">
                תפקיד
              </label>

              <div className="mt-3">
                <CustomDropdown
                  options={props.availableRoles}
                  value={props.addProfileForm.roleId}
                  onChange={function (e) {
                    props.setAddProfileField("roleId", e.target.value);
                  }}
                  placeholder="בחרי תפקיד"
                  dropdownKey="add-profile-role"
                  openDropdownKey={props.openDropdownKey}
                  setOpenDropdownKey={props.setOpenDropdownKey}
                  getOptionValue={function (option) {
                    return option.roleId;
                  }}
                  getOptionLabel={function (option) {
                    return option.roleName;
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-start gap-3">
            <button
              type="button"
              onClick={props.onSubmit}
              disabled={
                props.addingProfile ||
                !props.addProfileForm.ranchId ||
                !props.addProfileForm.roleId
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-[#7B5A4D] px-5 py-2.5 text-white font-semibold shadow-sm hover:bg-[#6B4D42] disabled:opacity-60"
            >
              {props.addingProfile ? "שולחת..." : "שליחת בקשה"}
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