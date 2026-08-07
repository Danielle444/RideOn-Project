import { useCallback, useRef, useState } from "react";

import { Alert } from "react-native";

import { useFocusEffect } from "@react-navigation/native";

import * as DocumentPicker from "expo-document-picker";

import {
  getHealthCertificates,
  uploadHealthCertificateFile,
} from "../services/horsesService";

import { createInFlightGuard } from "../utils/inFlightGuard";

import {
  isHealthCertificateFileTooLarge,
  isSupportedHealthCertificateFile,
  resolveHealthCertificateErrorMessage,
} from "../utils/healthCertificateUpload";

import {
  DEFAULT_HEALTH_CERTIFICATE_TAB,
  HEALTH_CERTIFICATE_TABS,
  countHealthCertificatesByTab,
  filterCertificatesByTab,
} from "../utils/healthCertificateStatus.utils";

function normalizeCertificatesResponse(response) {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  return [];
}

var REPLACE_APPROVED_CERTIFICATE_MESSAGE =
  "החלפת תעודה מאושרת תחזיר אותה למצב ממתין לאישור המזכירות. להמשיך?";

// Wraps the RN Alert.alert callback API in a promise so the upload flow can
// simply `await` the admin's choice. Resolves false on cancel/dismiss so the
// caller's default behavior (do nothing) requires no extra branching.
function confirmReplaceApprovedCertificate() {
  return new Promise(function (resolve) {
    Alert.alert("החלפת תעודה מאושרת", REPLACE_APPROVED_CERTIFICATE_MESSAGE, [
      {
        text: "ביטול",
        style: "cancel",
        onPress: function () {
          resolve(false);
        },
      },
      {
        text: "החלף תעודה",
        style: "destructive",
        onPress: function () {
          resolve(true);
        },
      },
    ]);
  });
}

export default function useAdminCompetitionHealthCertificates(params) {
  var activeCompetition = params.activeCompetition;
  var activeRole = params.activeRole;

  var [certificates, setCertificates] = useState([]);
  var [loading, setLoading] = useState(false);
  var [uploadingHorseId, setUploadingHorseId] = useState(null);

  // Synchronous, per-horse in-flight guard so a rapid double-tap on the same
  // "upload" button cannot open the picker/network flow twice - React state
  // alone (uploadingHorseId) is not a correctness guard here, since it is
  // only set after the picker promise resolves.
  var uploadGuardRef = useRef(null);
  if (uploadGuardRef.current === null) {
    uploadGuardRef.current = createInFlightGuard();
  }

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
          resolveHealthCertificateErrorMessage(
            error,
            "לא ניתן לטעון את תעודות הבריאות",
          ),
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

  var [activeTab, setActiveTab] = useState(DEFAULT_HEALTH_CERTIFICATE_TAB);

  var tabCounts = countHealthCertificatesByTab(certificates);

  var tabs = HEALTH_CERTIFICATE_TABS.map(function (tab) {
    return {
      key: tab.key,
      label: tab.label + " (" + tabCounts[tab.key] + ")",
      quiet: tab.key === "approved",
    };
  });

  var visibleCertificates = filterCertificatesByTab(certificates, activeTab);

  async function uploadHealthCertificate(horse) {
    var guardKey = String(horse.horseId);

    if (!uploadGuardRef.current.tryAcquire(guardKey)) {
      return;
    }

    try {
      if (!activeCompetition?.competitionId) {
        Alert.alert("שגיאה", "לא נמצאה תחרות פעילה");
        return;
      }

      if (!activeRole?.ranchId) {
        Alert.alert("שגיאה", "לא נמצאה חווה פעילה");
        return;
      }

      if (horse.hcApprovalStatus === "Approved") {
        var confirmedReplace = await confirmReplaceApprovedCertificate();

        if (!confirmedReplace) {
          return;
        }
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

      if (!isSupportedHealthCertificateFile(file)) {
        Alert.alert("שגיאה", "ניתן להעלות קובץ PDF בלבד");
        return;
      }

      if (isHealthCertificateFileTooLarge(file)) {
        Alert.alert("שגיאה", "הקובץ גדול מדי. הגודל המרבי המותר הוא 20MB");
        return;
      }

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
        resolveHealthCertificateErrorMessage(
          error,
          "לא ניתן להעלות את הקובץ. נסי שוב.",
        ),
      );
    } finally {
      setUploadingHorseId(null);
      uploadGuardRef.current.release(guardKey);
    }
  }

  return {
    certificates: certificates,
    visibleCertificates: visibleCertificates,
    loading: loading,
    uploadingHorseId: uploadingHorseId,
    loadCertificates: loadCertificates,
    uploadHealthCertificate: uploadHealthCertificate,
    activeTab: activeTab,
    setActiveTab: setActiveTab,
    tabs: tabs,
  };
}
