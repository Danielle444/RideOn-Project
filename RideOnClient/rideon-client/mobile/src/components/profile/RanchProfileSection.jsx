import { Pressable, Text, View } from "react-native";
import ProfileSectionCard from "./ProfileSectionCard";
import ProfileFieldRow from "./ProfileFieldRow";
import profileStyles from "../../styles/profileStyles";

export default function RanchProfileSection(props) {
  var page = props.page;
  var canEdit = props.canEdit;

  return (
    <ProfileSectionCard
      title="פרטי החווה הפעילה"
      subtitle="פרטי החווה של הפרופיל הפעיל כרגע"
    >
      <ProfileFieldRow
        label="שם חווה"
        value={page.isEditingRanch ? page.ranchForm.ranchName : page.data?.activeRanch?.ranchName}
        editable={page.isEditingRanch}
        onChange={function (value) {
          page.setRanchField("ranchName", value);
        }}
      />

      <ProfileFieldRow
        label="אימייל חווה"
        value={page.isEditingRanch ? page.ranchForm.contactEmail : page.data?.activeRanch?.contactEmail}
        editable={page.isEditingRanch}
        keyboardType="email-address"
        onChange={function (value) {
          page.setRanchField("contactEmail", value);
        }}
      />

      <ProfileFieldRow
        label="טלפון חווה"
        value={page.isEditingRanch ? page.ranchForm.contactPhone : page.data?.activeRanch?.contactPhone}
        editable={page.isEditingRanch}
        keyboardType="phone-pad"
        onChange={function (value) {
          page.setRanchField("contactPhone", value);
        }}
      />

      <ProfileFieldRow
        label="אתר"
        value={page.isEditingRanch ? page.ranchForm.websiteUrl : page.data?.activeRanch?.websiteUrl}
        editable={page.isEditingRanch}
        textAlign="left"
        onChange={function (value) {
          page.setRanchField("websiteUrl", value);
        }}
      />

      <ProfileFieldRow
        label="קו רוחב"
        value={
          page.isEditingRanch
            ? page.ranchForm.latitude
            : page.data?.activeRanch?.latitude === null ||
              page.data?.activeRanch?.latitude === undefined
            ? ""
            : String(page.data.activeRanch.latitude)
        }
        editable={page.isEditingRanch}
        textAlign="left"
        keyboardType="numeric"
        onChange={function (value) {
          page.setRanchField("latitude", value);
        }}
      />

      <ProfileFieldRow
        label="קו אורך"
        value={
          page.isEditingRanch
            ? page.ranchForm.longitude
            : page.data?.activeRanch?.longitude === null ||
              page.data?.activeRanch?.longitude === undefined
            ? ""
            : String(page.data.activeRanch.longitude)
        }
        editable={page.isEditingRanch}
        textAlign="left"
        keyboardType="numeric"
        onChange={function (value) {
          page.setRanchField("longitude", value);
        }}
      />

      {canEdit ? (
        <View style={profileStyles.buttonsRow}>
          {!page.isEditingRanch ? (
            <Pressable
              style={profileStyles.primaryButton}
              onPress={page.startEditRanch}
            >
              <Text style={profileStyles.primaryButtonText}>עריכת פרטי חווה</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                style={profileStyles.primaryButton}
                onPress={page.saveRanchProfile}
                disabled={page.savingRanch}
              >
                <Text style={profileStyles.primaryButtonText}>
                  {page.savingRanch ? "שומרת..." : "שמירת פרטי חווה"}
                </Text>
              </Pressable>

              <Pressable
                style={profileStyles.secondaryButton}
                onPress={page.cancelEditRanch}
              >
                <Text style={profileStyles.secondaryButtonText}>ביטול</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}
    </ProfileSectionCard>
  );
}