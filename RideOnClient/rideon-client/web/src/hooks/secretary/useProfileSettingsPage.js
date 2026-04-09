import { useEffect, useMemo, useState } from "react";
import { getActiveRole, getUser } from "../../services/storageService";
import { getApiErrorMessage } from "../../../../shared/auth/utils/authApiErrors";
import {
  getProfileSettings,
  updateUserProfile,
  updateRanchProfile,
  addProfileToUser,
} from "../../services/profileSettingsService";
import { getRanches, getRoles } from "../../services/authService";

export default function useProfileSettingsPage() {
  const activeRole = getActiveRole();
  const user = getUser();

  const [loading, setLoading] = useState(true);
  const [savingUser, setSavingUser] = useState(false);
  const [savingRanch, setSavingRanch] = useState(false);
  const [addingProfile, setAddingProfile] = useState(false);

  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const [expandedSection, setExpandedSection] = useState("general-info");
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isEditingRanch, setIsEditingRanch] = useState(false);
  const [isAddProfileModalOpen, setIsAddProfileModalOpen] = useState(false);
  const [openDropdownKey, setOpenDropdownKey] = useState("");

  const [userForm, setUserForm] = useState({
    personId: 0,
    firstName: "",
    lastName: "",
    gender: "",
    cellPhone: "",
    email: "",
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

  const [toast, setToast] = useState({
    isOpen: false,
    type: "success",
    message: "",
  });

  const canLoadPage = useMemo(
    function () {
      return !!user?.personId && !!activeRole?.ranchId && !!activeRole?.roleId;
    },
    [user, activeRole],
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
    [canLoadPage],
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

      setUserForm({
        personId: responseData.userProfile?.personId || 0,
        firstName: responseData.userProfile?.firstName || "",
        lastName: responseData.userProfile?.lastName || "",
        gender: responseData.userProfile?.gender || "",
        cellPhone: responseData.userProfile?.cellPhone || "",
        email: responseData.userProfile?.email || "",
      });

      setRanchForm({
        ranchId: responseData.activeRanch?.ranchId || 0,
        ranchName: responseData.activeRanch?.ranchName || "",
        contactEmail: responseData.activeRanch?.contactEmail || "",
        contactPhone: responseData.activeRanch?.contactPhone || "",
        websiteUrl: responseData.activeRanch?.websiteUrl || "",
        latitude:
          responseData.activeRanch?.latitude === null ||
          responseData.activeRanch?.latitude === undefined
            ? ""
            : String(responseData.activeRanch.latitude),
        longitude:
          responseData.activeRanch?.longitude === null ||
          responseData.activeRanch?.longitude === undefined
            ? ""
            : String(responseData.activeRanch.longitude),
      });

      setAddProfileForm({
        personId: user?.personId || 0,
        ranchId: "",
        roleId: "",
      });

      setIsEditingUser(false);
      setIsEditingRanch(false);
      setIsAddProfileModalOpen(false);
      setOpenDropdownKey("");

      await loadProfileOptions();
    } catch (err) {
      setError(
        String(getApiErrorMessage(err, "אירעה שגיאה בטעינת נתוני ההגדרות")),
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadProfileOptions() {
    try {
      const [ranchesResponse, rolesResponse] = await Promise.all([
        getRanches(),
        getRoles(),
      ]);

      setAvailableRanches(
        Array.isArray(ranchesResponse.data) ? ranchesResponse.data : [],
      );
      setAvailableRoles(
        Array.isArray(rolesResponse.data) ? rolesResponse.data : [],
      );
    } catch {
      setAvailableRanches([]);
      setAvailableRoles([]);
    }
  }

  function toggleSection(sectionKey) {
    setExpandedSection(function (prev) {
      return prev === sectionKey ? "" : sectionKey;
    });
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
    setExpandedSection("general-info");
    setIsEditingUser(true);
  }

  function cancelEditUser() {
    setUserForm({
      personId: data?.userProfile?.personId || 0,
      firstName: data?.userProfile?.firstName || "",
      lastName: data?.userProfile?.lastName || "",
      gender: data?.userProfile?.gender || "",
      cellPhone: data?.userProfile?.cellPhone || "",
      email: data?.userProfile?.email || "",
    });

    setIsEditingUser(false);
  }

  function startEditRanch() {
    setExpandedSection("general-info");
    setIsEditingRanch(true);
  }

  function cancelEditRanch() {
    setRanchForm({
      ranchId: data?.activeRanch?.ranchId || 0,
      ranchName: data?.activeRanch?.ranchName || "",
      contactEmail: data?.activeRanch?.contactEmail || "",
      contactPhone: data?.activeRanch?.contactPhone || "",
      websiteUrl: data?.activeRanch?.websiteUrl || "",
      latitude:
        data?.activeRanch?.latitude === null ||
        data?.activeRanch?.latitude === undefined
          ? ""
          : String(data.activeRanch.latitude),
      longitude:
        data?.activeRanch?.longitude === null ||
        data?.activeRanch?.longitude === undefined
          ? ""
          : String(data.activeRanch.longitude),
    });

    setIsEditingRanch(false);
  }

  function openAddProfileModal() {
    setAddProfileForm({
      personId: user?.personId || 0,
      ranchId: "",
      roleId: "",
    });
    setIsAddProfileModalOpen(true);
    setOpenDropdownKey("");
  }

  function closeAddProfileModal() {
    setIsAddProfileModalOpen(false);
    setOpenDropdownKey("");
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

      setToast({
        isOpen: true,
        type: "success",
        message: "פרטי המשתמש עודכנו בהצלחה",
      });

      await loadPage();
    } catch (err) {
      setError(
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

      setToast({
        isOpen: true,
        type: "success",
        message: "פרטי החווה עודכנו בהצלחה",
      });

      await loadPage();
    } catch (err) {
      setError(
        String(getApiErrorMessage(err, "אירעה שגיאה בעדכון פרטי החווה")),
      );
    } finally {
      setSavingRanch(false);
    }
  }

  async function submitAddProfile() {
    try {
      setAddingProfile(true);
      setError("");

      await addProfileToUser(addProfileForm.personId, {
        personId: addProfileForm.personId,
        ranchId: Number(addProfileForm.ranchId),
        roleId: Number(addProfileForm.roleId),
      });

      setToast({
        isOpen: true,
        type: "success",
        message: "הבקשה להוספת פרופיל נשלחה בהצלחה",
      });

      setAddProfileForm({
        personId: user?.personId || 0,
        ranchId: "",
        roleId: "",
      });

      setIsAddProfileModalOpen(false);
      setOpenDropdownKey("");

      await loadPage();
    } catch (err) {
      setError(
        String(getApiErrorMessage(err, "אירעה שגיאה בשליחת בקשת הפרופיל")),
      );
    } finally {
      setAddingProfile(false);
    }
  }

  function closeToast() {
    setToast(function (prev) {
      return {
        ...prev,
        isOpen: false,
      };
    });
  }

  return {
    loading,
    savingUser,
    savingRanch,
    addingProfile,
    error,
    data,
    userForm,
    ranchForm,
    addProfileForm,
    availableRanches,
    availableRoles,
    setUserField,
    setRanchField,
    setAddProfileField,
    saveUserProfile,
    saveRanchProfile,
    submitAddProfile,
    loadPage,
    toast,
    closeToast,
    activeRole,
    user,
    expandedSection,
    toggleSection,
    isEditingUser,
    isEditingRanch,
    startEditUser,
    cancelEditUser,
    startEditRanch,
    cancelEditRanch,
    isAddProfileModalOpen,
    openAddProfileModal,
    closeAddProfileModal,
    openDropdownKey,
    setOpenDropdownKey,
  };
}