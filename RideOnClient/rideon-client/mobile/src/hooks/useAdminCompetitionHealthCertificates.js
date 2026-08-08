import { useCallback, useRef, useState } from "react";

import { useFocusEffect } from "@react-navigation/native";

import * as DocumentPicker from "expo-document-picker";

import {
  getHealthCertificates,
  uploadHealthCertificateFile,
} from "../services/horsesService";

import { showToast } from "../services/toastService";

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

var REPLACE_APPROVED_CERTIFICATE_TITLE = "החלפת תעודה מאושרת";
var REPLACE_APPROVED_CERTIFICATE_MESSAGE =
  "החלפת תעודה מאושרת תחזיר אותה למצב ממתין לאישור המזכירות. להמשיך?";
var REPLACE_APPROVED_CERTIFICATE_CONFIRM_LABEL = "החלף תעודה";
var REPLACE_APPROVED_CERTIFICATE_CANCEL_LABEL = "ביטול";

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

  // Sole consumer is AdminCompetitionHealthCertificatesScreen.jsx, which
  // renders <AppDialog {...replaceApprovedCertificateDialogProps} /> - the
  // resolve function lives in a ref so the dialog's onConfirm/onCancel can
  // settle the Promise confirmReplaceApprovedCertificate is awaiting.
  var [replaceConfirmVisible, setReplaceConfirmVisible] = useState(false);
  var replaceConfirmResolveRef = useRef(null);

  function resolveReplaceConfirm(confirmed) {
    setReplaceConfirmVisible(false);

    var resolve = replaceConfirmResolveRef.current;
    replaceConfirmResolveRef.current = null;

    if (resolve) {
      resolve(confirmed);
    }
  }

  // Wraps the confirm/cancel choice in a promise so the upload flow can
  // simply `await` the admin's decision, same shape as the native
  // Alert.alert callback API it replaces. Resolves false on cancel so the
  // caller's default behavior (do nothing) requires no extra branching.
  function confirmReplaceApprovedCertificate() {
    return new Promise(function (resolve) {
      replaceConfirmResolveRef.current = resolve;
      setReplaceConfirmVisible(true);
    });
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

        showToast(
          resolveHealthCertificateErrorMessage(
            error,
            "לא ניתן לטעון את תעודות הבריאות",
          ),
          "error",
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
        showToast("לא נמצאה תחרות פעילה", "error");
        return;
      }

      if (!activeRole?.ranchId) {
        showToast("לא נמצאה חווה פעילה", "error");
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
        showToast("לא נמצא קובץ תקין להעלאה", "error");
        return;
      }

      if (!isSupportedHealthCertificateFile(file)) {
        showToast("ניתן להעלות קובץ PDF בלבד", "error");
        return;
      }

      if (isHealthCertificateFileTooLarge(file)) {
        showToast("הקובץ גדול מדי. הגודל המרבי המותר הוא 20MB", "error");
        return;
      }

      setUploadingHorseId(horse.horseId);

      await uploadHealthCertificateFile({
        horseId: horse.horseId,
        competitionId: activeCompetition.competitionId,
        ranchId: activeRole.ranchId,
        file: file,
      });

      showToast(
        "תעודת הבריאות של " + horse.horseName + " הועלתה בהצלחה",
        "success",
      );

      await loadCertificates();
    } catch (error) {
      console.log("HEALTH CERTIFICATE UPLOAD ERROR", error);
      console.log("HEALTH CERTIFICATE UPLOAD MESSAGE", error?.message);
      console.log("HEALTH CERTIFICATE UPLOAD RESPONSE", error?.response?.data);

      showToast(
        resolveHealthCertificateErrorMessage(
          error,
          "לא ניתן להעלות את הקובץ. נסי שוב.",
        ),
        "error",
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

    replaceApprovedCertificateDialogProps: {
      visible: replaceConfirmVisible,
      type: "warning",
      title: REPLACE_APPROVED_CERTIFICATE_TITLE,
      message: REPLACE_APPROVED_CERTIFICATE_MESSAGE,
      confirmLabel: REPLACE_APPROVED_CERTIFICATE_CONFIRM_LABEL,
      cancelLabel: REPLACE_APPROVED_CERTIFICATE_CANCEL_LABEL,
      destructive: true,
      onConfirm: function () {
        resolveReplaceConfirm(true);
      },
      onCancel: function () {
        resolveReplaceConfirm(false);
      },
    },
  };
}
