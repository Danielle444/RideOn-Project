import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserRound,
  Building2,
  RefreshCcw,
  ShieldCheck,
  PlusCircle,
} from "lucide-react";
import SecretaryLayout from "../../components/secretary/SecretaryLayout";
import ToastMessage from "../../components/common/ToastMessage";
import CustomDropdown from "../../components/common/CustomDropdown";
import RanchLocationPicker from "../../components/common/RanchLocationPicker";
import secretaryGeneralMenu from "../../components/secretary/secretaryGeneralMenu";
import useProfileSettingsPage from "../../hooks/secretary/useProfileSettingsPage";
import { getSecretaryDisplayName } from "../../utils/secretaryDisplay.utils";
import { mapRoleOptionForWeb } from "../../../../shared/auth/utils/platformRoles";
import SettingsSectionHeader from "../../components/secretary/profile-settings/SettingsSectionHeader";
import UserProfileCard from "../../components/secretary/profile-settings/UserProfileCard";
import RanchProfileCard from "../../components/secretary/profile-settings/RanchProfileCard";
import ProfilesListSection from "../../components/secretary/profile-settings/ProfilesListSection";
import AddProfileModal from "../../components/secretary/profile-settings/AddProfileModal";

export default function ProfileSettingsPage() {
  const navigate = useNavigate();
  const page = useProfileSettingsPage();

  const userName = getSecretaryDisplayName(page.user);

  const subtitle = page.activeRole
    ? `${page.activeRole.roleName || ""} • ${page.activeRole.ranchName || ""}`
    : "מזכירת חווה מארחת";

  const profileRows = useMemo(
    function () {
      const approvedLookup = new Map();

      (page.data?.approvedProfiles || []).forEach(function (item) {
        approvedLookup.set(`${item.ranchId}-${item.roleId}`, item);
      });

      return (page.data?.allProfiles || []).map(function (item) {
        const key = `${item.ranchId}-${item.roleId}`;
        const approvedItem = approvedLookup.get(key);

        if (!approvedItem) {
          return {
            ...item,
            isSupportedOnWeb: false,
            platformType: "pending",
          };
        }

        const mapped = mapRoleOptionForWeb(approvedItem);

        return {
          ...item,
          isSupportedOnWeb: mapped.isSupportedOnWeb,
          platformType: mapped.isSupportedOnWeb ? "web" : "mobile",
        };
      });
    },
    [page.data],
  );

  function renderSectionHeader(sectionKey, title, subtitleText, Icon) {
    const isExpanded = page.expandedSection === sectionKey;

    return (
      <button
        type="button"
        onClick={function () {
          page.toggleSection(sectionKey);
        }}
        className="w-full px-6 py-5 flex items-center justify-between gap-4 text-right hover:bg-[#FCFAF8] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F3ECE8] text-[#7B5A4D]">
            <Icon size={18} />
          </div>

          <div className="text-right min-w-0">
            <h2 className="text-lg font-bold text-[#3F312B] truncate">{title}</h2>
            <p className="mt-1 text-sm text-[#8A7268] truncate">{subtitleText}</p>
          </div>
        </div>

        <div className="shrink-0 text-[#7B5A4D]">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>
    );
  }

  function renderStaticField(label, value) {
    return (
      <div className="rounded-2xl border border-[#E7DCD5] bg-white px-4 py-3 min-h-[86px]">
        <div className="text-sm font-semibold text-[#7B5A4D]">{label}</div>
        <div className="mt-2 text-[0.98rem] text-[#3F312B] break-words leading-6">
          {value || "—"}
        </div>
      </div>
    );
  }

  function renderInputField(label, value, onChange, options = {}) {
    return (
      <div className="rounded-2xl border border-[#E7DCD5] bg-white px-4 py-3 min-h-[86px]">
        <label className="text-sm font-semibold text-[#7B5A4D]">{label}</label>
        <input
          value={value}
          onChange={onChange}
          disabled={options.disabled}
          className={
            "mt-2 h-10 w-full rounded-xl border px-4 shadow-sm focus:outline-none focus:ring-2 " +
            (options.disabled
              ? "border-[#E6DCD5] bg-[#F7F3F1] text-[#8A7268] cursor-not-allowed"
              : "border-[#D8CBC3] bg-white text-[#3F312B] focus:ring-[#D2B7A7]") +
            (options.textAlign === "left" ? " text-left" : " text-right")
          }
        />
      </div>
    );
  }

  function renderStatusBadge(roleStatus) {
    const normalized = String(roleStatus || "").toLowerCase();

    if (normalized === "approved") {
      return (
        <span className="inline-flex rounded-full border border-[#CFE6D8] bg-[#F7FBF8] px-3 py-1 text-sm font-semibold text-[#2F6F4F]">
          מאושר
        </span>
      );
    }

    if (normalized === "pending") {
      return (
        <span className="inline-flex rounded-full border border-[#E9D8B5] bg-[#FFF9ED] px-3 py-1 text-sm font-semibold text-[#9A6A00]">
          ממתין
        </span>
      );
    }

    return (
      <span className="inline-flex rounded-full border border-[#E1D6D0] bg-[#FAF7F5] px-3 py-1 text-sm font-semibold text-[#8A7268]">
        {roleStatus || "לא ידוע"}
      </span>
    );
  }

  function renderPlatformCell(profile) {
    if (profile.platformType === "pending") {
      return <span className="text-sm text-[#B5A39A]">—</span>;
    }

    if (profile.platformType === "web") {
      return (
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#4E6A5B]">
          <Monitor size={15} />
          זמין בווב
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#6A63A8]">
        <Smartphone size={15} />
        זמין רק במובייל
      </span>
    );
  }

  function renderUserCardContent() {
    return (
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {page.isEditingUser
            ? renderInputField("שם פרטי", page.userForm.firstName, function (e) {
                page.setUserField("firstName", e.target.value);
              })
            : renderStaticField("שם פרטי", page.data?.userProfile?.firstName)}

          {page.isEditingUser
            ? renderInputField("שם משפחה", page.userForm.lastName, function (e) {
                page.setUserField("lastName", e.target.value);
              })
            : renderStaticField("שם משפחה", page.data?.userProfile?.lastName)}

          {page.isEditingUser
            ? renderInputField("טלפון", page.userForm.cellPhone, function (e) {
                page.setUserField("cellPhone", e.target.value);
              })
            : renderStaticField("טלפון", page.data?.userProfile?.cellPhone)}

          {page.isEditingUser
            ? renderInputField("אימייל", page.userForm.email, function (e) {
                page.setUserField("email", e.target.value);
              })
            : renderStaticField("אימייל", page.data?.userProfile?.email)}

          {page.isEditingUser
            ? renderInputField("מגדר", page.userForm.gender, function (e) {
                page.setUserField("gender", e.target.value);
              })
            : renderStaticField("מגדר", page.data?.userProfile?.gender)}

          {page.isEditingUser
            ? renderInputField(
                "שם משתמש",
                page.data?.userProfile?.username || "",
                function () {},
                { disabled: true },
              )
            : renderStaticField("שם משתמש", page.data?.userProfile?.username)}
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
                onClick={function () {
                  navigate("/change-password");
                }}
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
                onClick={function () {
                  navigate("/change-password");
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#D8CBC3] bg-white px-4 py-2.5 text-[#5D4037] font-semibold hover:bg-[#F8F5F2]"
              >
                <KeyRound size={17} />
                שינוי סיסמה
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  function renderRanchCardContent() {
    return (
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {page.isEditingRanch
            ? renderInputField("שם חווה", page.ranchForm.ranchName, function (e) {
                page.setRanchField("ranchName", e.target.value);
              })
            : renderStaticField("שם חווה", page.data?.activeRanch?.ranchName)}

          {page.isEditingRanch
            ? renderInputField("אימייל חווה", page.ranchForm.contactEmail, function (e) {
                page.setRanchField("contactEmail", e.target.value);
              })
            : renderStaticField("אימייל חווה", page.data?.activeRanch?.contactEmail)}

          {page.isEditingRanch
            ? renderInputField("טלפון חווה", page.ranchForm.contactPhone, function (e) {
                page.setRanchField("contactPhone", e.target.value);
              })
            : renderStaticField("טלפון חווה", page.data?.activeRanch?.contactPhone)}

          {page.isEditingRanch
            ? renderInputField("אתר", page.ranchForm.websiteUrl, function (e) {
                page.setRanchField("websiteUrl", e.target.value);
              })
            : renderStaticField("אתר", page.data?.activeRanch?.websiteUrl)}

          <div className="col-span-1 md:col-span-2">
            {page.isEditingRanch ? (
              <div className="rounded-2xl border border-[#E7DCD5] bg-white px-4 py-4">
                <label className="block text-sm font-semibold text-[#7B5A4D] text-right mb-3">
                  מיקום החווה
                </label>
                <RanchLocationPicker
                  latitude={page.ranchForm.latitude}
                  longitude={page.ranchForm.longitude}
                  onChange={function (coords) {
                    page.setRanchField("latitude", coords.latitude);
                    page.setRanchField("longitude", coords.longitude);
                  }}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-[#E7DCD5] bg-white px-4 py-3">
                <label className="block text-sm font-semibold text-[#7B5A4D] text-right mb-1">
                  מיקום החווה
                </label>
                {page.data?.activeRanch?.latitude && page.data?.activeRanch?.longitude ? (
                  <p className="text-sm text-[#5D4037] text-right">
                    {Number(page.data.activeRanch.latitude).toFixed(6)},{" "}
                    {Number(page.data.activeRanch.longitude).toFixed(6)}
                  </p>
                ) : (
                  <p className="text-sm text-[#BCAAA4] text-right">לא הוגדר מיקום</p>
                )}
              </div>
            )}
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
    );
  }

  if (page.loading) {
    return (
      <SecretaryLayout
        userName={userName}
        subtitle={subtitle}
        menuItems={secretaryGeneralMenu}
        activeItemKey="profile-settings"
        notificationCount={0}
        notificationsOpen={false}
        notificationItems={[]}
      >
        <div className="rounded-[26px] border border-[#E6DCD5] bg-white shadow-sm px-8 py-10 text-right">
          <p className="text-[#6D4C41] text-lg">טוענת נתונים...</p>
        </div>
      </SecretaryLayout>
    );
  }

  return (
    <SecretaryLayout
      userName={userName}
      subtitle={subtitle}
      menuItems={secretaryGeneralMenu}
      activeItemKey="profile-settings"
      notificationCount={0}
      notificationsOpen={false}
      notificationItems={[]}
    >
      <div className="space-y-6">
        <div className="rounded-[26px] border border-[#E6DCD5] bg-white shadow-sm overflow-hidden">
          <div className="px-8 pt-8 pb-6 border-b border-[#EFE5DF]">
            <h1 className="text-[2rem] font-bold text-[#3F312B]">
              פרופיל והגדרות
            </h1>
            <p className="mt-2 text-sm text-[#8A7268]">
              ניהול פרטי המשתמש, פרטי החווה הפעילה והפרופילים שלך במערכת
            </p>
          </div>

          {page.error ? (
            <div className="mx-8 mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-right">
              {page.error}
            </div>
          ) : null}

          <div className="p-8 space-y-5">
            <section className="rounded-[24px] border border-[#EADFD8] bg-white overflow-hidden">
              <SettingsSectionHeader
                sectionKey="general-info"
                expandedSection={page.expandedSection}
                onToggle={page.toggleSection}
                title="פרטים כלליים"
                subtitle="פרטי המשתמש ופרטי החווה הפעילה"
                icon={UserRound}
              />

              {page.expandedSection === "general-info" ? (
                <div className="border-t border-[#EFE5DF] p-5">
                  <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5">
                    <UserProfileCard
                      page={page}
                      onChangePassword={function () {
                        navigate("/change-password");
                      }}
                    />

                    <RanchProfileCard page={page} />
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-[24px] border border-[#EADFD8] bg-[#FCFAF8] overflow-hidden">
              <SettingsSectionHeader
                sectionKey="profiles"
                expandedSection={page.expandedSection}
                onToggle={page.toggleSection}
                title="הפרופילים שלך במערכת"
                subtitle="צפייה בכל הפרופילים המשויכים למשתמש"
                icon={ShieldCheck}
              />

              {page.expandedSection === "profiles" ? (
                <div className="border-t border-[#EFE5DF] p-5">
                  <div className="flex flex-wrap justify-start gap-3 mb-4">
                    <button
                      type="button"
                      onClick={function () {
                        navigate("/select-ranch");
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[#D8CBC3] bg-white px-4 py-2.5 text-[#5D4037] font-semibold hover:bg-[#F8F5F2]"
                    >
                      <RefreshCcw size={17} />
                      החלפת פרופיל פעיל
                    </button>

                    <button
                      type="button"
                      onClick={page.openAddProfileModal}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#7B5A4D] px-4 py-2.5 text-white font-semibold shadow-sm hover:bg-[#6B4D42]"
                    >
                      <PlusCircle size={17} />
                      הוספת פרופיל חדש
                    </button>
                  </div>

                  <ProfilesListSection
                    items={profileRows}
                    activeRole={page.activeRole}
                  />
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>

      {page.isAddProfileModalOpen ? (
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
                onClick={page.closeAddProfileModal}
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
                      options={page.availableRanches}
                      value={page.addProfileForm.ranchId}
                      onChange={function (e) {
                        page.setAddProfileField("ranchId", e.target.value);
                      }}
                      placeholder="בחרי חווה"
                      searchable={true}
                      dropdownKey="add-profile-ranch"
                      openDropdownKey={page.openDropdownKey}
                      setOpenDropdownKey={page.setOpenDropdownKey}
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
                      options={page.availableRoles}
                      value={page.addProfileForm.roleId}
                      onChange={function (e) {
                        page.setAddProfileField("roleId", e.target.value);
                      }}
                      placeholder="בחרי תפקיד"
                      searchable={true}
                      dropdownKey="add-profile-role"
                      openDropdownKey={page.openDropdownKey}
                      setOpenDropdownKey={page.setOpenDropdownKey}
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
                  onClick={page.submitAddProfile}
                  disabled={
                    page.addingProfile ||
                    !page.addProfileForm.ranchId ||
                    !page.addProfileForm.roleId
                  }
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#7B5A4D] px-5 py-2.5 text-white font-semibold shadow-sm hover:bg-[#6B4D42] disabled:opacity-60"
                >
                  {page.addingProfile ? "שולחת..." : "שליחת בקשה"}
                </button>

                <button
                  type="button"
                  onClick={page.closeAddProfileModal}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#D8CBC3] bg-white px-4 py-2.5 text-[#5D4037] font-semibold hover:bg-[#F8F5F2]"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <AddProfileModal
        isOpen={page.isAddProfileModalOpen}
        onClose={page.closeAddProfileModal}
        availableRanches={page.availableRanches}
        availableRoles={page.availableRoles}
        addProfileForm={page.addProfileForm}
        setAddProfileField={page.setAddProfileField}
        openDropdownKey={page.openDropdownKey}
        setOpenDropdownKey={page.setOpenDropdownKey}
        onSubmit={page.submitAddProfile}
        addingProfile={page.addingProfile}
      />

      <ToastMessage
        isOpen={page.toast.isOpen}
        type={page.toast.type}
        message={page.toast.message}
        onClose={page.closeToast}
      />
    </SecretaryLayout>
  );
}