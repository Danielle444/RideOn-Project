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