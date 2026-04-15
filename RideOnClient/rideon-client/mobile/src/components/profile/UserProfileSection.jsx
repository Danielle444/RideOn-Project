import { Pressable, Text, View } from "react-native";
import ProfileSectionCard from "./ProfileSectionCard";
import ProfileFieldRow from "./ProfileFieldRow";
import profileStyles from "../../styles/profileStyles";

export default function UserProfileSection(props) {
  var page = props.page;

  return (
    <ProfileSectionCard
      title="פרטי משתמש"
      subtitle="המידע האישי של המשתמש המחובר"
    >
      <ProfileFieldRow
        label="שם פרטי"
        value={page.isEditingUser ? page.userForm.firstName : page.data?.userProfile?.firstName}
        editable={page.isEditingUser}
        onChange={function (value) {
          page.setUserField("firstName", value);
        }}
      />

      <ProfileFieldRow
        label="שם משפחה"
        value={page.isEditingUser ? page.userForm.lastName : page.data?.userProfile?.lastName}
        editable={page.isEditingUser}
        onChange={function (value) {
          page.setUserField("lastName", value);
        }}
      />

      <ProfileFieldRow
        label="טלפון"
        value={page.isEditingUser ? page.userForm.cellPhone : page.data?.userProfile?.cellPhone}
        editable={page.isEditingUser}
        keyboardType="phone-pad"
        onChange={function (value) {
          page.setUserField("cellPhone", value);
        }}
      />

      <ProfileFieldRow
        label="אימייל"
        value={page.isEditingUser ? page.userForm.email : page.data?.userProfile?.email}
        editable={page.isEditingUser}
        keyboardType="email-address"
        onChange={function (value) {
          page.setUserField("email", value);
        }}
      />

      <ProfileFieldRow
        label="מגדר"
        value={page.isEditingUser ? page.userForm.gender : page.data?.userProfile?.gender}
        editable={page.isEditingUser}
        onChange={function (value) {
          page.setUserField("gender", value);
        }}
      />

      <ProfileFieldRow
        label="שם משתמש"
        value={page.data?.userProfile?.username || ""}
        editable={false}
      />

      <ProfileFieldRow
        label="תעודת זהות"
        value={page.data?.userProfile?.nationalId || ""}
        editable={false}
      />

      <View style={profileStyles.buttonsRow}>
        {!page.isEditingUser ? (
          <>
            <Pressable
              style={profileStyles.primaryButton}
              onPress={page.startEditUser}
            >
              <Text style={profileStyles.primaryButtonText}>עריכת פרטי משתמש</Text>
            </Pressable>

            <Pressable
              style={profileStyles.secondaryButton}
              onPress={props.onChangePassword}
            >
              <Text style={profileStyles.secondaryButtonText}>שינוי סיסמה</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              style={profileStyles.primaryButton}
              onPress={page.saveUserProfile}
              disabled={page.savingUser}
            >
              <Text style={profileStyles.primaryButtonText}>
                {page.savingUser ? "שומרת..." : "שמירת פרטי משתמש"}
              </Text>
            </Pressable>

            <Pressable
              style={profileStyles.secondaryButton}
              onPress={page.cancelEditUser}
            >
              <Text style={profileStyles.secondaryButtonText}>ביטול</Text>
            </Pressable>

            <Pressable
              style={profileStyles.secondaryButton}
              onPress={props.onChangePassword}
            >
              <Text style={profileStyles.secondaryButtonText}>שינוי סיסמה</Text>
            </Pressable>
          </>
        )}
      </View>
    </ProfileSectionCard>
  );
}