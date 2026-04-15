import { Pressable, Text, View } from "react-native";
import ProfileSectionCard from "./ProfileSectionCard";
import profileStyles from "../../styles/profileStyles";

export default function ProfilesListSection(props) {
  function getStatusStyle(roleStatus) {
    var normalized = String(roleStatus || "").toLowerCase();

    if (normalized === "approved") {
      return profileStyles.statusApproved;
    }

    if (normalized === "pending") {
      return profileStyles.statusPending;
    }

    return profileStyles.statusOther;
  }

  function getStatusText(roleStatus) {
    var normalized = String(roleStatus || "").toLowerCase();

    if (normalized === "approved") {
      return "מאושר";
    }

    if (normalized === "pending") {
      return "ממתין";
    }

    return roleStatus || "לא ידוע";
  }

  function getPlatformText(platformType) {
    if (platformType === "pending") {
      return "ממתין לאישור";
    }

    if (platformType === "mobile") {
      return "זמין במובייל";
    }

    return "לא זמין במובייל";
  }

  return (
    <ProfileSectionCard
      title="הפרופילים שלך במערכת"
      subtitle="צפייה בכל הפרופילים המשויכים למשתמש"
    >
      <View style={profileStyles.buttonsRow}>
        <Pressable style={profileStyles.secondaryButton} onPress={props.onSwitchRole}>
          <Text style={profileStyles.secondaryButtonText}>החלפת פרופיל פעיל</Text>
        </Pressable>

        <Pressable style={profileStyles.primaryButton} onPress={props.onOpenAddProfile}>
          <Text style={profileStyles.primaryButtonText}>הוספת פרופיל חדש</Text>
        </Pressable>
      </View>

      <View style={{ marginTop: 12 }}>
        {(props.items || []).map(function (item, index) {
          var isActive =
            item.ranchId === props.activeRole?.ranchId &&
            item.roleId === props.activeRole?.roleId;

          return (
            <View
              key={item.ranchId + "-" + item.roleId + "-" + index}
              style={[
                profileStyles.profileListItem,
                isActive ? profileStyles.activeProfileListItem : null,
              ]}
            >
              <Text style={profileStyles.profileListTitle}>{item.ranchName}</Text>
              <Text style={profileStyles.profileListSubTitle}>{item.roleName}</Text>

              <View style={profileStyles.profileBadgeRow}>
                <View style={[profileStyles.statusBadge, getStatusStyle(item.roleStatus)]}>
                  <Text style={profileStyles.statusBadgeText}>
                    {getStatusText(item.roleStatus)}
                  </Text>
                </View>

                <Text style={profileStyles.platformText}>
                  {getPlatformText(item.platformType)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </ProfileSectionCard>
  );
}