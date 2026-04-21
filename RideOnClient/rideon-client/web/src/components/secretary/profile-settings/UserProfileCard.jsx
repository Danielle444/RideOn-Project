import { KeyRound, Pencil, UserRound, X } from "lucide-react";
import ProfileFieldBox from "./ProfileFieldBox";

export default function UserProfileCard(props) {
  const page = props.page;

  return (
    <div className="rounded-[22px] border border-[#E7DCD5] bg-[#FCFAF8] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#EFE5DF] flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#F3ECE8] text-[#7B5A4D]">
          <UserRound size={17} />
        </div>

        <div className="text-right">
          <h3 className="text-base font-bold text-[#3F312B]">פרטי משתמש</h3>
          <p className="mt-1 text-sm text-[#8A7268]">
            המידע האישי של המשתמש המחובר
          </p>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ProfileFieldBox
            label="שם פרטי"
            value={
              page.isEditingUser
                ? page.userForm.firstName
                : page.data?.userProfile?.firstName
            }
            editable={page.isEditingUser}
            onChange={function (e) {
              page.setUserField("firstName", e.target.value);
            }}
          />

          <ProfileFieldBox
            label="שם משפחה"
            value={
              page.isEditingUser
                ? page.userForm.lastName
                : page.data?.userProfile?.lastName
            }
            editable={page.isEditingUser}
            onChange={function (e) {
              page.setUserField("lastName", e.target.value);
            }}
          />

          <ProfileFieldBox
            label="טלפון"
            value={
              page.isEditingUser
                ? page.userForm.cellPhone
                : page.data?.userProfile?.cellPhone
            }
            editable={page.isEditingUser}
            onChange={function (e) {
              page.setUserField("cellPhone", e.target.value);
            }}
          />

          <ProfileFieldBox
            label="אימייל"
            value={
              page.isEditingUser
                ? page.userForm.email
                : page.data?.userProfile?.email
            }
            editable={page.isEditingUser}
            onChange={function (e) {
              page.setUserField("email", e.target.value);
            }}
          />

          <ProfileFieldBox
            label="מגדר"
            value={
              page.isEditingUser
                ? page.userForm.gender
                : page.data?.userProfile?.gender
            }
            editable={page.isEditingUser}
            onChange={function (e) {
              page.setUserField("gender", e.target.value);
            }}
          />

          <ProfileFieldBox
            label="שם משתמש"
            value={page.data?.userProfile?.username || ""}
            editable={page.isEditingUser}
            onChange={function () {}}
            disabled={page.isEditingUser}
          />
        </div>

        <div className="mt-4 flex flex-wrap justify-start gap-3">
          {!page.isEditingUser ? (
            <>
              <button
                type="button"
                onClick={page.startEditUser}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#D8CBC3] bg-white px-4 py-2.5 text-[#5D4037] font-semibold hover:bg-[#F8F5F2]"
              >
                <Pencil size={17} />
                עריכת פרטי משתמש
              </button>

              <button
                type="button"
                onClick={props.onChangePassword}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#D8CBC3] bg-white px-4 py-2.5 text-[#5D4037] font-semibold hover:bg-[#F8F5F2]"
              >
                <KeyRound size={17} />
                שינוי סיסמה
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={page.saveUserProfile}
                disabled={page.savingUser}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#7B5A4D] px-5 py-2.5 text-white font-semibold shadow-sm hover:bg-[#6B4D42] disabled:opacity-60"
              >
                {page.savingUser ? "שומרת..." : "שמירת פרטי משתמש"}
              </button>

              <button
                type="button"
                onClick={page.cancelEditUser}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#D8CBC3] bg-white px-4 py-2.5 text-[#5D4037] font-semibold hover:bg-[#F8F5F2]"
              >
                <X size={17} />
                ביטול
              </button>

              <button
                type="button"
                onClick={props.onChangePassword}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#D8CBC3] bg-white px-4 py-2.5 text-[#5D4037] font-semibold hover:bg-[#F8F5F2]"
              >
                <KeyRound size={17} />
                שינוי סיסמה
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}