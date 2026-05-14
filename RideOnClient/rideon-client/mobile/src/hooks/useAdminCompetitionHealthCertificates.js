import { useCallback, useState } from "react";

import { Alert } from "react-native";

import { useFocusEffect } from "@react-navigation/native";

import * as DocumentPicker from "expo-document-picker";

import {
  getHealthCertificates,
  uploadHealthCertificateFile,
} from "../services/horsesService";

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

    var file =
      result.assets && result.assets.length > 0 ? result.assets[0] : null;

    if (!file || !file.uri) {
      Alert.alert("שגיאה", "לא נמצא קובץ תקין להעלאה");
      return;
    }

    try {
      setUploadingHorseId(horse.horseId);

      await uploadHealthCertificateFile({
        horseId: horse.horseId,
        competitionId: activeCompetition.competitionId,
        ranchId: activeRole.ranchId,
        file: file,
      });

      Alert.alert(
        "בוצע",
        "תעודת הבריאות של " + horse.horseName + " הועלתה בהצלחה",
      );

      await loadCertificates();
    } catch (error) {
      console.log("HEALTH CERTIFICATE UPLOAD ERROR", error);
      console.log("HEALTH CERTIFICATE UPLOAD MESSAGE", error?.message);
      console.log("HEALTH CERTIFICATE UPLOAD RESPONSE", error?.response?.data);

      Alert.alert(
        "שגיאה",
        String(
          error?.response?.data ||
            error?.message ||
            "לא ניתן להעלות את הקובץ. נסי שוב.",
        ),
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
