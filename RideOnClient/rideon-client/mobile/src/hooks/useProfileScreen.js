import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useUser } from "../context/UserContext";
import { useActiveRole } from "../context/ActiveRoleContext";
import { getApiErrorMessage } from "../../../shared/auth/utils/authApiErrors";
import {
  getProfileUiConfig,
  buildMobileProfileRows,
  createUserForm,
  createRanchForm,
  createAddProfileForm,
  normalizeManagersForDisplay,
} from "../../../shared/profile/profileUiUtils";
import {
  getProfileSettings,
  updateUserProfile,
  updateRanchProfile,
  addProfileToUser,
} from "../services/profileSettingsService";
import { getRoles, getRanchesForRegistration } from "../services/authService";
import {
  getPayerManagers,
  getAvailablePayerManagers,
  addPayerManager,
  removePayerManager,
} from "../services/payerProfileService";

export default function useProfileScreen() {
  const { user } = useUser();
  const { activeRole } = useActiveRole();

  const [loading, setLoading] = useState(true);
  const [savingUser, setSavingUser] = useState(false);
  const [savingRanch, setSavingRanch] = useState(false);
  const [addingProfile, setAddingProfile] = useState(false);

  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isEditingRanch, setIsEditingRanch] = useState(false);

  const [userForm, setUserForm] = useState({
    personId: 0,
    firstName: "",
    lastName: "",
    gender: "",
    cellPhone: "",
    email: "",
    username: "",
    nationalId: "",
  });

  const [ranchForm, setRanchForm] = useState({
    ranchId: 0,
    ranchName: "",
    contactEmail: "",
    contactPhone: "",
    websiteUrl: "",
    latitude: "",
    longitude: "",
  });

  const [availableRanches, setAvailableRanches] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);

  const [addProfileForm, setAddProfileForm] = useState({
    personId: user?.personId || 0,
    ranchId: "",
    roleId: "",
  });

  const [isAddProfileModalOpen, setIsAddProfileModalOpen] = useState(false);

  const [managers, setManagers] = useState([]);
  const [availableManagers, setAvailableManagers] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [loadingAvailableManagers, setLoadingAvailableManagers] =
    useState(false);
  const [isManagersModalOpen, setIsManagersModalOpen] = useState(false);
  const [managersSearchText, setManagersSearchText] = useState("");
  const [submittingManagerId, setSubmittingManagerId] = useState(null);
  const [removingManagerId, setRemovingManagerId] = useState(null);

  const config = useMemo(
    function () {
      return getProfileUiConfig(activeRole?.roleName || "");
    },
    [activeRole],
  );

  const canLoadPage = useMemo(
    function () {
      return !!user?.personId && !!activeRole?.ranchId && !!activeRole?.roleId;
    },
    [user, activeRole],
  );

  const profileRows = useMemo(
    function () {
      return buildMobileProfileRows(data);
    },
    [data],
  );

  useEffect(
    function () {
      if (!canLoadPage) {
        setLoading(false);
        setError("לא נמצא פרופיל פעיל. יש לבחור פרופיל מחדש.");
        return;
      }

      loadPage();
    },
    [canLoadPage, user?.personId, activeRole?.ranchId, activeRole?.roleId],
  );

  async function loadPage() {
    try {
      setLoading(true);
      setError("");

      const response = await getProfileSettings(
        user.personId,
        activeRole.ranchId,
        activeRole.roleId,
      );

      const responseData = response.data;

      setData(responseData);
      setUserForm(createUserForm(responseData));
      setRanchForm(createRanchForm(responseData));
      setAddProfileForm(createAddProfileForm(user.personId));
      setIsEditingUser(false);
      setIsEditingRanch(false);

      await loadProfileOptions();

      if (config.showManagersSection) {
        await loadManagers();
      } else {
        setManagers([]);
      }
    } catch (err) {
      setError(
        String(getApiErrorMessage(err, "אירעה שגיאה בטעינת נתוני הפרופיל")),
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadProfileOptions() {
    try {
      const responses = await Promise.all([
        getRanchesForRegistration(),
        getRoles(),
      ]);

      setAvailableRanches(
        Array.isArray(responses[0].data) ? responses[0].data : [],
      );

      setAvailableRoles(
        Array.isArray(responses[1].data) ? responses[1].data : [],
      );
    } catch (err) {
      setAvailableRanches([]);
      setAvailableRoles([]);
    }
  }

  async function loadManagers() {
    if (!user?.personId || !config.showManagersSection) {
      return;
    }

    try {
      setLoadingManagers(true);

      const response = await getPayerManagers(user.personId);
      const normalized = normalizeManagersForDisplay(
        Array.isArray(response.data) ? response.data : [],
      );

      setManagers(normalized);
    } catch (err) {
      console.log("loadManagers error full:", err);
      console.log("loadManagers error response:", err?.response);
      console.log("loadManagers error status:", err?.response?.status);
      console.log("loadManagers error data:", err?.response?.data);

      Alert.alert(
        "שגיאה",
        String(
          err?.response?.data ||
            err?.message ||
            "אירעה שגיאה בטעינת רשימת המנהלים",
        ),
      );
    } finally {
      setLoadingManagers(false);
    }
  }

  async function loadAvailableManagers(searchText) {
    if (!user?.personId || !config.showManagersSection) {
      return;
    }

    try {
      setLoadingAvailableManagers(true);

      const response = await getAvailablePayerManagers(
        user.personId,
        searchText,
      );
      const normalized = normalizeManagersForDisplay(
        Array.isArray(response.data) ? response.data : [],
      );

      setAvailableManagers(normalized);
    } catch (err) {
      console.log("loadAvailableManagers error full:", err);
      console.log("loadAvailableManagers error response:", err?.response);
      console.log("loadAvailableManagers error status:", err?.response?.status);
      console.log("loadAvailableManagers error data:", err?.response?.data);

      Alert.alert(
        "שגיאה",
        String(
          err?.response?.data ||
            err?.message ||
            "אירעה שגיאה בטעינת המנהלים הזמינים",
        ),
      );
    } finally {
      setLoadingAvailableManagers(false);
    }
  }

  function setUserField(fieldName, value) {
    setUserForm(function (prev) {
      return {
        ...prev,
        [fieldName]: value,
      };
    });
  }

  function setRanchField(fieldName, value) {
    setRanchForm(function (prev) {
      return {
        ...prev,
        [fieldName]: value,
      };
    });
  }

  function setAddProfileField(fieldName, value) {
    setAddProfileForm(function (prev) {
      return {
        ...prev,
        [fieldName]: value,
      };
    });
  }

  function startEditUser() {
    setIsEditingUser(true);
  }

  function cancelEditUser() {
    setUserForm(createUserForm(data));
    setIsEditingUser(false);
  }

  function startEditRanch() {
    if (!config.allowEditRanch) {
      return;
    }

    setIsEditingRanch(true);
  }

  function cancelEditRanch() {
    setRanchForm(createRanchForm(data));
    setIsEditingRanch(false);
  }

  async function saveUserProfile() {
    try {
      setSavingUser(true);
      setError("");

      await updateUserProfile({
        personId: userForm.personId,
        firstName: userForm.firstName.trim(),
        lastName: userForm.lastName.trim(),
        gender: userForm.gender.trim() || null,
        cellPhone: userForm.cellPhone.trim() || null,
        email: userForm.email.trim() || null,
      });

      Alert.alert("הצלחה", "פרטי המשתמש עודכנו בהצלחה");
      await loadPage();
    } catch (err) {
      Alert.alert(
        "שגיאה",
        String(getApiErrorMessage(err, "אירעה שגיאה בעדכון פרטי המשתמש")),
      );
    } finally {
      setSavingUser(false);
    }
  }

  async function saveRanchProfile() {
    try {
      setSavingRanch(true);
      setError("");

      const latitudeValue =
        ranchForm.latitude === "" ? null : Number(ranchForm.latitude);

      const longitudeValue =
        ranchForm.longitude === "" ? null : Number(ranchForm.longitude);

      await updateRanchProfile(ranchForm.ranchId, {
        ranchId: ranchForm.ranchId,
        ranchName: ranchForm.ranchName.trim(),
        contactEmail: ranchForm.contactEmail.trim() || null,
        contactPhone: ranchForm.contactPhone.trim() || null,
        websiteUrl: ranchForm.websiteUrl.trim() || null,
        latitude: Number.isNaN(latitudeValue) ? null : latitudeValue,
        longitude: Number.isNaN(longitudeValue) ? null : longitudeValue,
      });

      Alert.alert("הצלחה", "פרטי החווה עודכנו בהצלחה");
      await loadPage();
    } catch (err) {
      Alert.alert(
        "שגיאה",
        String(getApiErrorMessage(err, "אירעה שגיאה בעדכון פרטי החווה")),
      );
    } finally {
      setSavingRanch(false);
    }
  }

  function openAddProfileModal() {
    setAddProfileForm(createAddProfileForm(user?.personId || 0));
    setIsAddProfileModalOpen(true);
  }

  function closeAddProfileModal() {
    setIsAddProfileModalOpen(false);
  }

  async function submitAddProfile() {
    try {
      setAddingProfile(true);

      await addProfileToUser(addProfileForm.personId, {
        personId: addProfileForm.personId,
        ranchId: Number(addProfileForm.ranchId),
        roleId: Number(addProfileForm.roleId),
      });

      Alert.alert("הצלחה", "הבקשה להוספת פרופיל נשלחה בהצלחה");
      setIsAddProfileModalOpen(false);
      await loadPage();
    } catch (err) {
      Alert.alert(
        "שגיאה",
        String(getApiErrorMessage(err, "אירעה שגיאה בשליחת בקשת הפרופיל")),
      );
    } finally {
      setAddingProfile(false);
    }
  }

  async function openManagersModal() {
    setManagersSearchText("");
    setIsManagersModalOpen(true);
    await loadAvailableManagers("");
  }

  function closeManagersModal() {
    setManagersSearchText("");
    setAvailableManagers([]);
    setIsManagersModalOpen(false);
  }

  async function onManagersSearchChange(text) {
    setManagersSearchText(text);
    await loadAvailableManagers(text);
  }

  async function handleAddManager(adminPersonId) {
    try {
      setSubmittingManagerId(adminPersonId);
      await addPayerManager(user.personId, adminPersonId);
      await loadManagers();
      await loadAvailableManagers(managersSearchText);
      Alert.alert("הצלחה", "המנהל נוסף בהצלחה");
    } catch (err) {
      Alert.alert(
        "שגיאה",
        String(getApiErrorMessage(err, "לא ניתן להוסיף את המנהל")),
      );
    } finally {
      setSubmittingManagerId(null);
    }
  }

  async function handleRemoveManager(adminPersonId) {
    try {
      setRemovingManagerId(adminPersonId);
      await removePayerManager(user.personId, adminPersonId);
      await loadManagers();
      Alert.alert("הצלחה", "המנהל הוסר בהצלחה");
    } catch (err) {
      Alert.alert(
        "שגיאה",
        String(getApiErrorMessage(err, "לא ניתן להסיר את המנהל")),
      );
    } finally {
      setRemovingManagerId(null);
    }
  }

  return {
    user,
    activeRole,
    config,
    loading,
    savingUser,
    savingRanch,
    addingProfile,
    error,
    data,
    userForm,
    ranchForm,
    availableRanches,
    availableRoles,
    addProfileForm,
    isEditingUser,
    isEditingRanch,
    profileRows,
    isAddProfileModalOpen,
    setUserField,
    setRanchField,
    setAddProfileField,
    startEditUser,
    cancelEditUser,
    saveUserProfile,
    startEditRanch,
    cancelEditRanch,
    saveRanchProfile,
    openAddProfileModal,
    closeAddProfileModal,
    submitAddProfile,
    managers,
    availableManagers,
    loadingManagers,
    loadingAvailableManagers,
    isManagersModalOpen,
    managersSearchText,
    submittingManagerId,
    removingManagerId,
    openManagersModal,
    closeManagersModal,
    onManagersSearchChange,
    handleAddManager,
    handleRemoveManager,
  };
}
