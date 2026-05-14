import { useCallback, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useFocusEffect } from "@react-navigation/native";

import * as DocumentPicker from "expo-document-picker";

import { Ionicons } from "@expo/vector-icons";

import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";

import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";

import roleSharedStyles from "../../../../styles/roleSharedStyles";

import horsesStyles from "../../../../styles/horsesStyles";

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";

import { getAdminCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";

import { useActiveRole } from "../../../../context/ActiveRoleContext";

import { useCompetition } from "../../../../context/CompetitionContext";

import {
  getHealthCertificates,
  saveHealthCertificate,
} from "../../../../services/horsesService";

import { supabase } from "../../../../lib/supabaseClient";

const HC_BUCKET = "health-certificates";

function getStatusLabel(status) {
  if (status === "Approved") {
    return {
      label: "מאושר",
      color: "#4CAF50",
    };
  }

  if (status === "Pending") {
    return {
      label: "ממתין לאישור",
      color: "#F59E0B",
    };
  }

  return {
    label: "לא הועלה",
    color: "#8A7268",
  };
}

function normalizeCertificatesResponse(response) {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  return [];
}

export default function AdminCompetitionHealthCertificatesScreen(props) {
  var activeRoleContext = useActiveRole();

  var competitionContext = useCompetition();

  var activeRole = activeRoleContext.activeRole;

  var activeCompetition = competitionContext.activeCompetition;

  var [certificates, setCertificates] = useState([]);

  var [loading, setLoading] = useState(false);

  var [uploadingHorseId, setUploadingHorseId] = useState(null);

  useFocusEffect(
    useCallback(
      function () {
        if (!activeCompetition?.competitionId || !activeRole?.ranchId) {
          return;
        }

        loadCertificates();
      },
      [activeCompetition, activeRole],
    ),
  );

  async function loadCertificates() {
    if (!activeCompetition?.competitionId) {
      Alert.alert("שגיאה", "לא נמצאה תחרות פעילה");
      return;
    }

    if (!activeRole?.ranchId) {
      Alert.alert("שגיאה", "לא נמצאה חווה פעילה");
      return;
    }

    try {
      setLoading(true);

      var response = await getHealthCertificates(
        activeCompetition.competitionId,
        activeRole.ranchId,
      );

      setCertificates(normalizeCertificatesResponse(response));
    } catch (error) {
      console.log("HEALTH CERTIFICATES LOAD ERROR", error);
      console.log("HEALTH CERTIFICATES LOAD RESPONSE", error?.response?.data);

      Alert.alert(
        "שגיאה",
        String(error?.response?.data || "לא ניתן לטעון את תעודות הבריאות"),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadPdf(horse) {
    if (!activeCompetition?.competitionId) {
      Alert.alert("שגיאה", "לא נמצאה תחרות פעילה");
      return;
    }

    if (!activeRole?.ranchId) {
      Alert.alert("שגיאה", "לא נמצאה חווה פעילה");
      return;
    }

    var result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return;
    }

    var file = result.assets[0];

    try {
      setUploadingHorseId(horse.horseId);

      var fileName =
        "horse_" +
        horse.horseId +
        "_comp_" +
        activeCompetition.competitionId +
        "_" +
        Date.now() +
        ".pdf";

      var filePath =
        "competitions/" + activeCompetition.competitionId + "/" + fileName;

      var fileResponse = await fetch(file.uri);

      var blob = await fileResponse.blob();

      var uploadResult = await supabase.storage
        .from(HC_BUCKET)
        .upload(filePath, blob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadResult.error) {
        throw new Error(uploadResult.error.message);
      }

      var publicUrlResult = supabase.storage
        .from(HC_BUCKET)
        .getPublicUrl(filePath);

      await saveHealthCertificate(
        horse.horseId,
        activeCompetition.competitionId,
        activeRole.ranchId,
        publicUrlResult.data.publicUrl,
      );

      Alert.alert(
        "בוצע",
        "תעודת הבריאות של " + horse.horseName + " הועלתה בהצלחה",
      );

      await loadCertificates();
    } catch (error) {
      console.log("HEALTH CERTIFICATE UPLOAD ERROR", error);
      console.log("HEALTH CERTIFICATE UPLOAD RESPONSE", error?.response?.data);

      Alert.alert(
        "שגיאה",
        String(error?.response?.data || "לא ניתן להעלות את הקובץ. נסי שוב."),
      );
    } finally {
      setUploadingHorseId(null);
    }
  }

  function handleCompetitionMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  async function handleExitCompetition() {
    props.navigation.navigate("AdminCompetitionsBoard");
  }

  return (
    <MobileScreenLayout
      title="תעודות בריאות"
      subtitle=""
      activeBottomTab={null}
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <CompetitionMenuTemplate
            activeKey="health-certificates"
            closeMenu={closeMenu}
            competitionName={
              activeCompetition ? activeCompetition.competitionName : ""
            }
            items={getAdminCompetitionMenuItems()}
            onItemPress={handleCompetitionMenuPress}
            onExitCompetition={handleExitCompetition}
          />
        );
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 120,
        }}
      >
        {loading ? (
          <View style={horsesStyles.loadingWrap}>
            <ActivityIndicator size="large" color="#7B5A4D" />

            <Text style={horsesStyles.loadingText}>טוען תעודות בריאות...</Text>
          </View>
        ) : null}

        {!loading && certificates.length === 0 ? (
          <View style={horsesStyles.emptyCard}>
            <Text style={horsesStyles.emptyTitle}>אין סוסים רשומים</Text>

            <Text style={horsesStyles.emptyText}>
              לא נמצאו סוסים הרשומים לתחרות הפעילה.
            </Text>
          </View>
        ) : null}

        {!loading
          ? certificates.map(function (cert) {
              var isUploading = uploadingHorseId === cert.horseId;

              var status = getStatusLabel(cert.hcApprovalStatus);

              return (
                <View
                  key={String(cert.horseId)}
                  style={[
                    roleSharedStyles.card,
                    {
                      marginBottom: 12,
                    },
                  ]}
                >
                  <View style={roleSharedStyles.cardTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={roleSharedStyles.cardTitle}>
                        {cert.horseName}
                      </Text>

                      {cert.barnName ? (
                        <Text
                          style={{
                            color: "#8A7268",
                            fontSize: 13,
                            marginTop: 2,
                            textAlign: "right",
                          }}
                        >
                          כינוי: {cert.barnName}
                        </Text>
                      ) : null}
                    </View>

                    <View
                      style={{
                        backgroundColor: status.color + "20",
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 20,
                      }}
                    >
                      <Text
                        style={{
                          color: status.color,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        {status.label}
                      </Text>
                    </View>
                  </View>

                  {cert.hcUploadDate ? (
                    <Text
                      style={{
                        color: "#8A7268",
                        fontSize: 12,
                        marginBottom: 10,
                        textAlign: "right",
                      }}
                    >
                      הועלה:{" "}
                      {new Date(cert.hcUploadDate).toLocaleDateString("he-IL")}
                    </Text>
                  ) : null}

                  <View style={roleSharedStyles.buttonsRow}>
                    <Pressable
                      style={[
                        roleSharedStyles.primaryButton,
                        {
                          flex: 1,
                          opacity: isUploading ? 0.6 : 1,
                        },
                      ]}
                      onPress={function () {
                        handleUploadPdf(cert);
                      }}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons
                            name="cloud-upload-outline"
                            size={16}
                            color="#fff"
                            style={{ marginLeft: 6 }}
                          />

                          <Text style={roleSharedStyles.primaryButtonText}>
                            {cert.hcPath ? "החלף קובץ" : "העלה PDF"}
                          </Text>
                        </>
                      )}
                    </Pressable>

                    {cert.hcPath ? (
                      <Pressable
                        style={[
                          roleSharedStyles.primaryButton,
                          {
                            backgroundColor: "#6B7280",
                            flex: 1,
                          },
                        ]}
                        onPress={function () {
                          Linking.openURL(cert.hcPath);
                        }}
                      >
                        <Ionicons
                          name="document-outline"
                          size={16}
                          color="#fff"
                          style={{ marginLeft: 6 }}
                        />

                        <Text style={roleSharedStyles.primaryButtonText}>
                          צפה בקובץ
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })
          : null}
      </ScrollView>
    </MobileScreenLayout>
  );
}
