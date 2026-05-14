import { useCallback, useState } from "react";

import { Alert } from "react-native";

import { useFocusEffect } from "@react-navigation/native";

import * as DocumentPicker from "expo-document-picker";

import {
  getHealthCertificates,
  saveHealthCertificate,
} from "../services/horsesService";

import { supabase } from "../lib/supabaseClient";

var HC_BUCKET = "health-certificates";

function normalizeCertificatesResponse(response) {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  return [];
}

export default function useAdminCompetitionHealthCertificates(params) {
  var activeCompetition = params.activeCompetition;
  var activeRole = params.activeRole;

  var [certificates, setCertificates] = useState([]);
  var [loading, setLoading] = useState(false);
  var [uploadingHorseId, setUploadingHorseId] = useState(null);

  var loadCertificates = useCallback(
    async function () {
      if (!activeCompetition?.competitionId) {
        return;
      }

      if (!activeRole?.ranchId) {
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
    },
    [activeCompetition, activeRole],
  );

  useFocusEffect(
    useCallback(
      function () {
        loadCertificates();
      },
      [loadCertificates],
    ),
  );

  async function uploadHealthCertificate(horse) {
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

  return {
    certificates: certificates,
    loading: loading,
    uploadingHorseId: uploadingHorseId,
    loadCertificates: loadCertificates,
    uploadHealthCertificate: uploadHealthCertificate,
  };
}