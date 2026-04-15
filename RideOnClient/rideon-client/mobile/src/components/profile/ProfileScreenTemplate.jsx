import { ActivityIndicator, Text, View } from "react-native";
import MobileScreenLayout from "../mobile-nav/MobileScreenLayout";
import SideMenuTemplate from "../mobile-nav/SideMenuTemplate";
import profileStyles from "../../styles/profileStyles";
import ProfileHeaderCard from "./ProfileHeaderCard";
import UserProfileSection from "./UserProfileSection";
import RanchProfileSection from "./RanchProfileSection";
import ProfilesListSection from "./ProfilesListSection";
import AddProfileModal from "./AddProfileModal";
import PayerManagersSection from "./PayerManagersSection";

export default function ProfileScreenTemplate(props) {
  var page = props.page;

  var fullName =
    (page.data?.userProfile?.firstName || page.user?.firstName || "") +
    " " +
    (page.data?.userProfile?.lastName || page.user?.lastName || "");

  if (page.loading) {
    return (
      <MobileScreenLayout
        title="פרופיל"
        subtitle=""
        activeBottomTab="profile"
        bottomNavItems={props.bottomNavItems}
        menuContent={function (_params) {
          return (
            <SideMenuTemplate
              userName={fullName.trim()}
              roleName={page.activeRole?.roleName || ""}
              ranchName={page.config.showRanchInHeader ? page.activeRole?.ranchName || "" : ""}
              items={props.menuItems}
              onItemPress={function (item) {
                props.navigation.navigate(item.screen);
              }}
              onSwitchRole={function () {
                props.navigation.replace("SelectActiveRole");
              }}
              onLogout={props.onLogout}
            />
          );
        }}
      >
        <View style={profileStyles.loadingWrap}>
          <ActivityIndicator size="small" />
          <Text style={profileStyles.loadingText}>טוענת נתוני פרופיל...</Text>
        </View>
      </MobileScreenLayout>
    );
  }

  return (
    <MobileScreenLayout
      title="פרופיל"
      subtitle=""
      activeBottomTab="profile"
      bottomNavItems={props.bottomNavItems}
      menuContent={function (_params) {
        return (
          <SideMenuTemplate
            userName={fullName.trim()}
            roleName={page.activeRole?.roleName || ""}
            ranchName={page.config.showRanchInHeader ? page.activeRole?.ranchName || "" : ""}
            items={props.menuItems}
            onItemPress={function (item) {
              props.navigation.navigate(item.screen);
            }}
            onSwitchRole={function () {
              props.navigation.replace("SelectActiveRole");
            }}
            onLogout={props.onLogout}
          />
        );
      }}
    >
      <View style={profileStyles.screenContent}>
        {page.error ? (
          <View style={profileStyles.errorCard}>
            <Text style={profileStyles.errorText}>{page.error}</Text>
          </View>
        ) : null}

        <ProfileHeaderCard
          fullName={fullName.trim()}
          username={page.data?.userProfile?.username || ""}
          roleName={page.activeRole?.roleName || ""}
          ranchName={page.activeRole?.ranchName || ""}
          showRanch={page.config.showRanchInHeader}
          onSwitchRole={function () {
            props.navigation.replace("SelectActiveRole");
          }}
        />

        <UserProfileSection
          page={page}
          onChangePassword={function () {
            props.navigation.navigate("ChangePassword");
          }}
        />

        {page.config.showRanchSection ? (
          <RanchProfileSection page={page} canEdit={page.config.allowEditRanch} />
        ) : null}

        {page.config.showManagersSection ? (
          <PayerManagersSection
            managers={page.managers}
            availableManagers={page.availableManagers}
            loadingManagers={page.loadingManagers}
            loadingAvailableManagers={page.loadingAvailableManagers}
            isManagersModalOpen={page.isManagersModalOpen}
            managersSearchText={page.managersSearchText}
            submittingManagerId={page.submittingManagerId}
            removingManagerId={page.removingManagerId}
            onOpenManagersModal={page.openManagersModal}
            onCloseManagersModal={page.closeManagersModal}
            onManagersSearchChange={page.onManagersSearchChange}
            onAddManager={page.handleAddManager}
            onRemoveManager={page.handleRemoveManager}
          />
        ) : null}

        <ProfilesListSection
          items={page.profileRows}
          activeRole={page.activeRole}
          onSwitchRole={function () {
            props.navigation.replace("SelectActiveRole");
          }}
          onOpenAddProfile={page.openAddProfileModal}
        />

        <AddProfileModal
          isOpen={page.isAddProfileModalOpen}
          onClose={page.closeAddProfileModal}
          availableRanches={page.availableRanches}
          availableRoles={page.availableRoles}
          addProfileForm={page.addProfileForm}
          setAddProfileField={page.setAddProfileField}
          onSubmit={page.submitAddProfile}
          addingProfile={page.addingProfile}
        />
      </View>
    </MobileScreenLayout>
  );
}