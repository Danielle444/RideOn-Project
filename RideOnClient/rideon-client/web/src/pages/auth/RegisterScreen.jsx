import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Info, X } from "lucide-react";
import logo from "../../../../shared/assets/logo.png";
import { authTheme } from "../../../../shared/auth/theme/authTheme";
import Field from "../../components/common/Field";
import AuthButton from "../../components/common/AuthButton";
import CustomDropdown from "../../components/common/CustomDropdown";
import DatePicker from "../../components/common/DatePicker";
import {
  register,
  createRanchRequest,
  getRanches,
  getRoles,
  checkUsername,
  getPersonByNationalIdForRegistration,
  sendOtp,
} from "../../services/authService";

import { getApiErrorMessage } from "../../../../shared/auth/utils/authApiErrors";

import {
  mapGenderToFormValue,
  filterRegisterRoles,
} from "../../../../shared/auth/mappings/authMappings";
import { GENDER_OPTIONS, normalizeGenderValue } from "../../utils/gender.utils";

import {
  validateRegisterForm,
  validatePersonalSection,
  validateUserSection,
} from "../../../../shared/auth/validations/registerValidation";

const { palette } = authTheme;

export default function RegisterScreen() {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState(1);
  const [openDropdownKey, setOpenDropdownKey] = useState("");
  const [showPasswordInfo, setShowPasswordInfo] = useState(false);

  const [form, setForm] = useState({
    nationalId: "",
    firstName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",
    cellPhone: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [ranchRolePairs, setRanchRolePairs] = useState([
    { ranchId: "", roleId: "" },
  ]);

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [roles, setRoles] = useState([]);
  const [ranches, setRanches] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [usernameSuggestionMessage, setUsernameSuggestionMessage] =
    useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);

  const [checkingNationalId, setCheckingNationalId] = useState(false);
  const [nationalIdMessage, setNationalIdMessage] = useState("");
  const [personLoadedFromSystem, setPersonLoadedFromSystem] = useState(false);
  const [existingSystemUserFound, setExistingSystemUserFound] = useState(false);
  const [nationalIdChecked, setNationalIdChecked] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");

  const [showRanchModal, setShowRanchModal] = useState(false);
  const [creatingRanchRequest, setCreatingRanchRequest] = useState(false);
  const [ranchModalError, setRanchModalError] = useState("");
  const [newRanch, setNewRanch] = useState({
    ranchName: "",
    contactEmail: "",
    contactPhone: "",
    websiteUrl: "",
  });

  useEffect(function () {
    Promise.all([getRoles(), getRanches()])
      .then(function ([rolesResponse, ranchesResponse]) {
        setRoles(Array.isArray(rolesResponse.data) ? rolesResponse.data : []);
        setRanches(
          Array.isArray(ranchesResponse.data) ? ranchesResponse.data : [],
        );
      })
      .catch(function () {
        setError("שגיאה בטעינת נתונים מהשרת");
      })
      .finally(function () {
        setLoadingData(false);
      });
  }, []);

  function set(fieldName) {
    return function (e) {
      var value = e.target.value;

      setForm(function (prevForm) {
        return {
          ...prevForm,
          [fieldName]: value,
        };
      });

      if (fieldName === "email") {
        setUsernameSuggestionMessage("");
      }

      if (fieldName === "nationalId") {
        setNationalIdMessage("");
        setPersonLoadedFromSystem(false);
        setExistingSystemUserFound(false);
        setNationalIdChecked(false);
      }
    };
  }

  function setNewRanchField(fieldName) {
    return function (e) {
      var value = e.target.value;

      setNewRanch(function (prevRanch) {
        return {
          ...prevRanch,
          [fieldName]: value,
        };
      });

      if (ranchModalError) {
        setRanchModalError("");
      }
    };
  }

  function resetPersonDetailsKeepNationalId() {
    setForm(function (prevForm) {
      return {
        ...prevForm,
        firstName: "",
        lastName: "",
        gender: "",
        dateOfBirth: "",
        cellPhone: "",
        email: "",
      };
    });
  }

  async function handleSendOtp() {
    setOtpError("");
    setOtpSuccess("");

    if (!form.email || !form.email.includes("@")) {
      setOtpError("נא להזין כתובת מייל תקינה");
      return;
    }

    setOtpLoading(true);

    try {
      await sendOtp(form.email.trim());
      setOtpSent(true);
      setOtpSuccess("קוד נשלח למייל שלך");
    } catch {
      setOtpError("שגיאה בשליחת קוד האימות. נסה שוב.");
    } finally {
      setOtpLoading(false);
    }
  }

  function openCreateRanchModal() {
    setRanchModalError("");
    setNewRanch(function () {
      return {
        ranchName: "",
        contactEmail: form.email || "",
        contactPhone: form.cellPhone || "",
        websiteUrl: "",
      };
    });
    setShowRanchModal(true);
  }

  function closeCreateRanchModal() {
    if (creatingRanchRequest) {
      return;
    }

    setShowRanchModal(false);
    setRanchModalError("");
  }

  async function handleNationalIdBlur() {
    var nationalId = form.nationalId.trim();

    setError("");
    setSuccess("");
    setNationalIdMessage("");
    setExistingSystemUserFound(false);
    setPersonLoadedFromSystem(false);
    setNationalIdChecked(false);

    if (!nationalId) {
      return;
    }

    if (!/^\d{9}$/.test(nationalId)) {
      setNationalIdMessage("תעודת זהות חייבת להכיל 9 ספרות בדיוק");
      return;
    }

    try {
      setCheckingNationalId(true);

      var response = await getPersonByNationalIdForRegistration(nationalId);
      var person = response.data;

      if (person.hasSystemUser) {
        setExistingSystemUserFound(true);
        setNationalIdChecked(true);
        setNationalIdMessage(
          "לאדם עם תעודת זהות זו כבר קיים משתמש במערכת. יש להתחבר או להשתמש בתעודת זהות אחרת.",
        );
        return;
      }

      setForm(function (prevForm) {
        return {
          ...prevForm,
          firstName: person.firstName || "",
          lastName: person.lastName || "",
          gender: normalizeGenderValue(mapGenderToFormValue(person.gender)) || "",
          dateOfBirth: person.dateOfBirth
            ? String(person.dateOfBirth).slice(0, 10)
            : "",
          cellPhone: person.cellPhone || "",
          email: person.email || "",
        };
      });

      if (person.email) {
        await tryAutoFillUsernameFromEmail(person.email);
      }

      setPersonLoadedFromSystem(true);
      setNationalIdChecked(true);
      setNationalIdMessage(
        "האדם כבר קיים במערכת. הפרטים מולאו אוטומטית. שדות חסרים ניתן להשלים ידנית.",
      );
    } catch (err) {
      if (err.response && err.response.status === 404) {
        resetPersonDetailsKeepNationalId();
        setPersonLoadedFromSystem(false);
        setExistingSystemUserFound(false);
        setNationalIdChecked(true);
        setNationalIdMessage(
          "האדם לא קיים במערכת. ניתן להמשיך ולמלא את הפרטים ידנית.",
        );
      } else {
        setError("לא ניתן היה לבדוק את תעודת הזהות כרגע");
      }
    } finally {
      setCheckingNationalId(false);
    }
  }

  async function tryAutoFillUsernameFromEmail(emailValue) {
    if (!emailValue || !emailValue.includes("@")) {
      return;
    }

    if (form.username.trim()) {
      return;
    }

    try {
      setCheckingUsername(true);
      setUsernameSuggestionMessage("");

      const response = await checkUsername(emailValue);

      if (response.data.exists) {
        setUsernameSuggestionMessage(
          "האימייל הזה כבר תפוס כשם משתמש. יש לבחור שם משתמש אחר.",
        );
      } else {
        setForm(function (prevForm) {
          return {
            ...prevForm,
            username: emailValue,
          };
        });

        setUsernameSuggestionMessage("שם המשתמש מולא אוטומטית לפי האימייל.");
      }
    } catch (err) {
      setUsernameSuggestionMessage("לא ניתן היה לבדוק זמינות שם משתמש כרגע.");
    } finally {
      setCheckingUsername(false);
    }
  }

  async function handleEmailBlur() {
    const emailValue = form.email.trim();
    await tryAutoFillUsernameFromEmail(emailValue);
  }

  function goToUserSection() {
    var sectionError = validatePersonalSection(
      form,
      nationalIdChecked,
      existingSystemUserFound,
    );
    if (sectionError) {
      setError(sectionError);
      return;
    }

    setError("");
    setActiveSection(2);
  }

  function goToRanchSection() {
    var sectionError = validateUserSection(form);

    if (sectionError) {
      setError(sectionError);
      return;
    }

    setError("");
    setActiveSection(3);
  }

  async function handleCreateRanchRequest() {
    setRanchModalError("");
    setError("");
    setSuccess("");

    if (!newRanch.ranchName.trim()) {
      setRanchModalError("יש להזין שם חווה");
      return;
    }

    if (!form.firstName.trim()) {
      setRanchModalError("יש למלא שם פרטי לפני יצירת בקשת חווה");
      return;
    }

    if (!form.lastName.trim()) {
      setRanchModalError("יש למלא שם משפחה לפני יצירת בקשת חווה");
      return;
    }

    if (!form.nationalId.trim()) {
      setRanchModalError("יש למלא תעודת זהות לפני יצירת בקשת חווה");
      return;
    }

    if (!form.cellPhone.trim()) {
      setRanchModalError("יש למלא טלפון נייד לפני יצירת בקשת חווה");
      return;
    }

    try {
      setCreatingRanchRequest(true);

      await createRanchRequest({
        ranchName: newRanch.ranchName.trim(),
        contactEmail: newRanch.contactEmail.trim() || null,
        contactPhone: newRanch.contactPhone.trim() || null,
        websiteUrl: newRanch.websiteUrl.trim() || null,
        latitude: null,
        longitude: null,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        nationalId: form.nationalId.trim(),
        email: form.email.trim() || null,
        cellPhone: form.cellPhone.trim(),
      });

      const ranchesResponse = await getRanches();
      const refreshedRanches = Array.isArray(ranchesResponse.data)
        ? ranchesResponse.data
        : [];

      setRanches(refreshedRanches);

      var createdRanch = refreshedRanches.find(function (item) {
        return item.ranchName === newRanch.ranchName.trim();
      });

      if (createdRanch) {
        setRanchRolePairs(function (prevPairs) {
          return prevPairs.map(function (pair, index) {
            if (index === 0 && !pair.ranchId) {
              return {
                ...pair,
                ranchId: String(createdRanch.ranchId),
              };
            }

            return pair;
          });
        });
      }

      setShowRanchModal(false);
      setSuccess("בקשת חווה נשלחה בהצלחה. החווה תופיע לאחר אישור מנהל.");
    } catch (err) {
      var message = getApiErrorMessage(err, "שגיאה ביצירת בקשת חווה");
      setRanchModalError(message);
    } finally {
      setCreatingRanchRequest(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    var validationError = validateRegisterForm(form, existingSystemUserFound);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      var validPairs = ranchRolePairs.filter(function (pair) {
        return pair.ranchId && pair.roleId;
      });

      var hasPartialPair = ranchRolePairs.some(function (pair) {
        return (pair.ranchId && !pair.roleId) || (!pair.ranchId && pair.roleId);
      });

      if (hasPartialPair) {
        setError("אם בוחרים חווה או תפקיד, חייבים לבחור גם את השני באותו זוג");
        setLoading(false);
        return;
      }

      if (validPairs.length === 0) {
        setError("יש לבחור לפחות חווה ותפקיד אחד");
        setLoading(false);
        return;
      }

      await register({
        nationalId: form.nationalId,
        firstName: form.firstName,
        lastName: form.lastName,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        cellPhone: form.cellPhone,
        email: form.email,
        username: form.username,
        password: form.password,
        otpCode: otpCode,
        ranchRoles: validPairs.map(function (pair) {
          return {
            ranchId: Number(pair.ranchId),
            roleId: Number(pair.roleId),
          };
        }),
      });

      setSuccess("הבקשה נשלחה בהצלחה! תקבל הודעה לאחר אישור מנהל המערכת.");

      setTimeout(function () {
        navigate("/login");
      }, 3500);
    } catch (err) {
      var message = getApiErrorMessage(err, "שגיאה בהרשמה לשרת");

      setError(message);
      setActiveSection(2);
    } finally {
      setLoading(false);
    }
  }

  var filteredRoles = filterRegisterRoles(roles);

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl text-right placeholder-[#BCAAA4] focus:outline-none transition-all text-sm";

  const readOnlyCls =
    "w-full px-4 py-2.5 rounded-xl text-right placeholder-[#BCAAA4] cursor-not-allowed text-sm";

  function getEditableFieldStyle() {
    return {
      borderWidth: 2,
      borderStyle: "solid",
      borderColor: palette.border,
      backgroundColor: palette.surfaceMuted,
      color: palette.text,
    };
  }

  function getReadOnlyFieldStyle() {
    return {
      borderWidth: 2,
      borderStyle: "solid",
      borderColor: palette.borderSoft,
      backgroundColor: palette.surfaceMuted,
      color: palette.text,
    };
  }

  function handleEditableFieldFocus(e) {
    e.currentTarget.style.borderColor = palette.primary;
    e.currentTarget.style.backgroundColor = palette.surface;
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(123, 90, 77, 0.15)";
  }

  function handleEditableFieldBlur(e) {
    e.currentTarget.style.borderColor = palette.border;
    e.currentTarget.style.backgroundColor = palette.surfaceMuted;
    e.currentTarget.style.boxShadow = "none";
  }

  var personalFieldsLocked = !nationalIdChecked || existingSystemUserFound;

  var firstNameLocked =
    personalFieldsLocked || (personLoadedFromSystem && !!form.firstName);
  var lastNameLocked =
    personalFieldsLocked || (personLoadedFromSystem && !!form.lastName);
  var genderLocked =
    personalFieldsLocked || (personLoadedFromSystem && !!form.gender);
  var dateOfBirthLocked =
    personalFieldsLocked || (personLoadedFromSystem && !!form.dateOfBirth);
  var cellPhoneLocked =
    personalFieldsLocked || (personLoadedFromSystem && !!form.cellPhone);
  var emailLocked =
    personalFieldsLocked || (personLoadedFromSystem && !!form.email);

  if (loadingData) {
    return (
      <div
        className="w-screen min-h-screen flex items-center justify-center"
        style={{ backgroundColor: palette.background }}
      >
        <p className="font-medium" style={{ color: palette.primary }}>
          טוען נתונים...
        </p>
      </div>
    );
  }

  return (
    <div
      className="w-screen min-h-screen flex flex-col items-center py-8 px-4 sm:py-12"
      dir="rtl"
      style={{ backgroundColor: palette.background }}
    >
      <div className="text-center mb-8 w-full max-w-3xl">
        <img
          src={logo}
          alt="RideOn"
          className="h-20 sm:h-24 object-contain mx-auto mb-3"
        />
        <h2
          className="text-2xl sm:text-3xl font-bold mt-1"
          style={{ color: palette.heading }}
        >
          הרשמה למערכת
        </h2>
        <p className="text-sm mt-2" style={{ color: palette.primary }}>
          מלאו את הפרטים הבאים. הבקשה תועבר לאישור מנהל.
        </p>
      </div>

      <div
        className="w-full max-w-4xl rounded-2xl shadow-xl overflow-visible"
        style={{
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: palette.borderSoft,
        }}
      >
        <form onSubmit={handleSubmit}>
          <div
            style={{
              borderBottomWidth: 1,
              borderBottomStyle: "solid",
              borderBottomColor: palette.borderSoft,
            }}
          >
            <button
              type="button"
              onClick={function () {
                setActiveSection(1);
              }}
              className="w-full text-right px-6 sm:px-8 py-4 font-bold flex items-center justify-between"
              style={{ color: palette.text }}
            >
              <span>פרטים אישיים</span>
              <span>{activeSection === 1 ? "▲" : "▼"}</span>
            </button>

            {activeSection === 1 && (
              <div className="p-6 sm:p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="תעודת זהות" required>
                    <div>
                      <input
                        type="text"
                        value={form.nationalId}
                        onChange={set("nationalId")}
                        onBlur={function (e) {
                          handleEditableFieldBlur(e);
                          handleNationalIdBlur();
                        }}
                        onFocus={handleEditableFieldFocus}
                        placeholder="9 ספרות"
                        maxLength={9}
                        className={inputCls}
                        style={getEditableFieldStyle()}
                      />

                      {checkingNationalId && (
                        <p
                          className="mt-1 text-xs text-right"
                          style={{ color: palette.mutedText }}
                        >
                          בודק תעודת זהות...
                        </p>
                      )}

                      {!checkingNationalId && nationalIdMessage && (
                        <p
                          className="mt-1 text-xs text-right"
                          style={{ color: palette.mutedText }}
                        >
                          {nationalIdMessage}
                        </p>
                      )}
                    </div>
                  </Field>

                  <Field label="מגדר" required>
                    <select
                      value={form.gender}
                      onChange={set("gender")}
                      className={genderLocked ? readOnlyCls : inputCls}
                      style={
                        genderLocked
                          ? getReadOnlyFieldStyle()
                          : getEditableFieldStyle()
                      }
                      onFocus={genderLocked ? undefined : handleEditableFieldFocus}
                      onBlur={genderLocked ? undefined : handleEditableFieldBlur}
                      dir="rtl"
                      disabled={genderLocked}
                    >
                      <option value="">בחר/י מגדר</option>
                      {GENDER_OPTIONS.map(function (option) {
                        return (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        );
                      })}
                    </select>
                  </Field>

                  <Field label="שם פרטי" required>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={set("firstName")}
                      placeholder="שם פרטי"
                      className={firstNameLocked ? readOnlyCls : inputCls}
                      style={
                        firstNameLocked
                          ? getReadOnlyFieldStyle()
                          : getEditableFieldStyle()
                      }
                      onFocus={
                        firstNameLocked ? undefined : handleEditableFieldFocus
                      }
                      onBlur={
                        firstNameLocked ? undefined : handleEditableFieldBlur
                      }
                      readOnly={firstNameLocked}
                    />
                  </Field>

                  <Field label="שם משפחה" required>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={set("lastName")}
                      placeholder="שם משפחה"
                      className={lastNameLocked ? readOnlyCls : inputCls}
                      style={
                        lastNameLocked
                          ? getReadOnlyFieldStyle()
                          : getEditableFieldStyle()
                      }
                      onFocus={
                        lastNameLocked ? undefined : handleEditableFieldFocus
                      }
                      onBlur={
                        lastNameLocked ? undefined : handleEditableFieldBlur
                      }
                      readOnly={lastNameLocked}
                    />
                  </Field>

                  <Field label="תאריך לידה" required>
                    <DatePicker
                      value={form.dateOfBirth}
                      onChange={set("dateOfBirth")}
                      className={dateOfBirthLocked ? readOnlyCls : inputCls}
                      style={
                        dateOfBirthLocked
                          ? getReadOnlyFieldStyle()
                          : getEditableFieldStyle()
                      }
                      onFocus={
                        dateOfBirthLocked ? undefined : handleEditableFieldFocus
                      }
                      onBlur={
                        dateOfBirthLocked ? undefined : handleEditableFieldBlur
                      }
                      disabled={dateOfBirthLocked}
                    />
                  </Field>

                  <Field label="טלפון נייד" required>
                    <input
                      type="tel"
                      value={form.cellPhone}
                      onChange={set("cellPhone")}
                      placeholder="050-0000000"
                      className={cellPhoneLocked ? readOnlyCls : inputCls}
                      style={
                        cellPhoneLocked
                          ? getReadOnlyFieldStyle()
                          : getEditableFieldStyle()
                      }
                      onFocus={
                        cellPhoneLocked ? undefined : handleEditableFieldFocus
                      }
                      onBlur={
                        cellPhoneLocked ? undefined : handleEditableFieldBlur
                      }
                      readOnly={cellPhoneLocked}
                    />
                  </Field>

                  <Field label="אימייל" required>
                    <div>
                      <input
                        type="email"
                        value={form.email}
                        onChange={set("email")}
                        onBlur={function (e) {
                          if (!emailLocked) {
                            handleEditableFieldBlur(e);
                          }
                          handleEmailBlur();
                        }}
                        onFocus={
                          emailLocked ? undefined : handleEditableFieldFocus
                        }
                        placeholder="example@email.com"
                        className={emailLocked ? readOnlyCls : inputCls}
                        style={
                          emailLocked
                            ? getReadOnlyFieldStyle()
                            : getEditableFieldStyle()
                        }
                        readOnly={emailLocked}
                      />

                      {/* שלב OTP */}
                      <div className="mt-3 space-y-2">
                        <AuthButton
                          type="button"
                          variant="outline"
                          onClick={handleSendOtp}
                          disabled={otpLoading || !form.email || emailLocked}
                        >
                          {otpLoading
                            ? "שולח קוד..."
                            : otpSent
                            ? "שלח קוד חדש"
                            : "שלח קוד אימות למייל"}
                        </AuthButton>

                        {otpSuccess && (
                          <p className="text-sm text-green-600 text-right">
                            {otpSuccess}
                          </p>
                        )}
                        {otpError && (
                          <p className="text-sm text-red-600 text-right">
                            {otpError}
                          </p>
                        )}

                        {otpSent && (
                          <Field label="קוד אימות">
                            <input
                              type="text"
                              value={otpCode}
                              onChange={function (e) {
                                setOtpCode(e.target.value);
                              }}
                              className={inputCls}
                              style={getEditableFieldStyle()}
                              onFocus={handleEditableFieldFocus}
                              onBlur={handleEditableFieldBlur}
                              placeholder="הזן את הקוד שקיבלת במייל"
                              maxLength={6}
                              autoComplete="one-time-code"
                            />
                          </Field>
                        )}
                      </div>
                    </div>
                  </Field>
                </div>

                <div className="mt-6 flex justify-start">
                  <AuthButton type="button" fullWidth={false} onClick={goToUserSection}>
                    המשך לשלב הבא
                  </AuthButton>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              borderBottomWidth: 1,
              borderBottomStyle: "solid",
              borderBottomColor: palette.borderSoft,
              backgroundColor: palette.surfaceMuted,
            }}
          >
            <button
              type="button"
              onClick={function () {
                setActiveSection(2);
              }}
              className="w-full text-right px-6 sm:px-8 py-4 font-bold flex items-center justify-between"
              style={{ color: palette.text }}
            >
              <span>פרטי כניסה למערכת</span>
              <span>{activeSection === 2 ? "▲" : "▼"}</span>
            </button>

            {activeSection === 2 && (
              <div className="p-6 sm:p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="שם משתמש" required>
                    <div>
                      <input
                        type="text"
                        value={form.username}
                        onChange={set("username")}
                        placeholder="בחרו שם משתמש"
                        autoComplete="username"
                        className={inputCls}
                        style={getEditableFieldStyle()}
                        onFocus={handleEditableFieldFocus}
                        onBlur={handleEditableFieldBlur}
                      />

                      {checkingUsername && (
                        <p
                          className="mt-1 text-xs text-right"
                          style={{ color: palette.mutedText }}
                        >
                          בודק זמינות...
                        </p>
                      )}

                      {!checkingUsername && usernameSuggestionMessage && (
                        <p
                          className="mt-1 text-xs text-right"
                          style={{ color: palette.mutedText }}
                        >
                          {usernameSuggestionMessage}
                        </p>
                      )}
                    </div>
                  </Field>

                  <div className="hidden sm:block" />
                  <Field
                    label="סיסמה"
                    required
                    info={<Info size={14} />}
                    showInfoPopup={showPasswordInfo}
                    onInfoClick={function () {
                      setShowPasswordInfo(function (prev) {
                        return !prev;
                      });
                    }}
                    onCloseInfo={function () {
                      setShowPasswordInfo(false);
                    }}
                    infoPopup={
                      showPasswordInfo ? (
                        <div
                          className="absolute top-6 right-0 z-30 w-72 rounded-xl shadow-lg p-3 text-right"
                          style={{
                            borderWidth: 1,
                            borderStyle: "solid",
                            borderColor: palette.borderSoft,
                            backgroundColor: palette.surface,
                          }}
                        >
                          <div
                            className="absolute -top-2 right-3 h-3 w-3 rotate-45"
                            style={{
                              borderLeftWidth: 1,
                              borderTopWidth: 1,
                              borderStyle: "solid",
                              borderColor: palette.borderSoft,
                              backgroundColor: palette.surface,
                            }}
                          />

                          <p
                            className="text-xs font-semibold mb-2"
                            style={{ color: palette.text }}
                          >
                            הסיסמה חייבת לכלול:
                          </p>

                          <ul
                            className="text-xs space-y-1 leading-5"
                            style={{ color: palette.text }}
                          >
                            <li>• לפחות 8 תווים</li>
                            <li>• לפחות אות אנגלית גדולה אחת</li>
                            <li>• לפחות אות אנגלית קטנה אחת</li>
                            <li>• לפחות ספרה אחת</li>
                            <li>• ללא רווחים</li>
                          </ul>
                        </div>
                      ) : null
                    }
                  >
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        value={form.password}
                        onChange={set("password")}
                        placeholder="בחרי סיסמה"
                        autoComplete="new-password"
                        className={inputCls + " pl-10"}
                        style={getEditableFieldStyle()}
                        onFocus={handleEditableFieldFocus}
                        onBlur={handleEditableFieldBlur}
                      />
                      <button
                        type="button"
                        onClick={function () {
                          setShowPass(function (prev) {
                            return !prev;
                          });
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors"
                        style={{ color: palette.mutedText }}
                        onMouseEnter={function (e) {
                          e.currentTarget.style.color = palette.text;
                        }}
                        onMouseLeave={function (e) {
                          e.currentTarget.style.color = palette.mutedText;
                        }}
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>

                  <Field label="אימות סיסמה" required>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={form.confirmPassword}
                        onChange={set("confirmPassword")}
                        placeholder="הזינו סיסמה שוב"
                        autoComplete="new-password"
                        className={inputCls + " pl-10"}
                        style={getEditableFieldStyle()}
                        onFocus={handleEditableFieldFocus}
                        onBlur={handleEditableFieldBlur}
                      />
                      <button
                        type="button"
                        onClick={function () {
                          setShowConfirm(function (prev) {
                            return !prev;
                          });
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors"
                        style={{ color: palette.mutedText }}
                        onMouseEnter={function (e) {
                          e.currentTarget.style.color = palette.text;
                        }}
                        onMouseLeave={function (e) {
                          e.currentTarget.style.color = palette.mutedText;
                        }}
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>
                </div>

                <div className="mt-6 flex justify-between gap-3">
                  <AuthButton
                    type="button"
                    variant="outline"
                    fullWidth={false}
                    onClick={function () {
                      setActiveSection(1);
                    }}
                  >
                    חזרה
                  </AuthButton>

                  <AuthButton
                    type="button"
                    fullWidth={false}
                    onClick={goToRanchSection}
                  >
                    המשך לשלב הבא
                  </AuthButton>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              borderBottomWidth: 1,
              borderBottomStyle: "solid",
              borderBottomColor: palette.borderSoft,
            }}
          >
            <button
              type="button"
              onClick={function () {
                setActiveSection(3);
              }}
              className="w-full text-right px-6 sm:px-8 py-4 font-bold flex items-center justify-between"
              style={{ color: palette.text }}
            >
              <span>שיוך לחוות ותפקידים</span>
              <span>{activeSection === 3 ? "▲" : "▼"}</span>
            </button>

            {activeSection === 3 && (
              <div className="p-6 sm:p-8 pb-12">
                <p
                  className="text-xs text-right mb-4 leading-6"
                  style={{ color: palette.primary }}
                >
                  ניתן לבקש שיוך למספר חוות ותפקידים. כל זוג שייבחר יישמר ויועבר
                  לאישור.
                </p>

                <div className="space-y-3">
                  {ranchRolePairs.map(function (pair, idx) {
                    return (
                      <div key={idx} className="flex items-start gap-2">
                        {ranchRolePairs.length > 1 && (
                          <button
                            type="button"
                            onClick={function () {
                              setRanchRolePairs(function (prevPairs) {
                                return prevPairs.filter(function (_, index) {
                                  return index !== idx;
                                });
                              });
                            }}
                            className="mt-8 w-7 h-7 rounded-full bg-red-50 border border-red-200 text-red-400 hover:bg-red-100 flex items-center justify-center text-sm shrink-0 transition-colors"
                          >
                            ✕
                          </button>
                        )}

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Field
                            label={`חווה ${
                              ranchRolePairs.length > 1 ? idx + 1 : ""
                            }`}
                            required={idx === 0}
                          >
                            <div>
                              <CustomDropdown
                                value={pair.ranchId}
                                onChange={function (e) {
                                  setRanchRolePairs(function (prevPairs) {
                                    return prevPairs.map(function (item, index) {
                                      if (index === idx) {
                                        return {
                                          ...item,
                                          ranchId: e.target.value,
                                        };
                                      }
                                      return item;
                                    });
                                  });
                                }}
                                options={ranches}
                                placeholder="בחר חווה"
                                disabled={false}
                                searchable={true}
                                openDropdownKey={openDropdownKey}
                                setOpenDropdownKey={setOpenDropdownKey}
                                dropdownKey={"ranch-" + idx}
                                getOptionLabel={function (option) {
                                  return option.ranchName;
                                }}
                                getOptionValue={function (option) {
                                  return option.ranchId;
                                }}
                              />

                              <button
                                type="button"
                                onClick={openCreateRanchModal}
                                className="mt-2 text-xs hover:underline transition-colors"
                                style={{ color: palette.primary }}
                                onMouseEnter={function (e) {
                                  e.currentTarget.style.color = palette.heading;
                                }}
                                onMouseLeave={function (e) {
                                  e.currentTarget.style.color = palette.primary;
                                }}
                              >
                                לא מצאתי את החווה שלי
                              </button>
                            </div>
                          </Field>

                          <Field
                            label={`תפקיד ${
                              ranchRolePairs.length > 1 ? idx + 1 : ""
                            }`}
                            required={idx === 0}
                          >
                            <CustomDropdown
                              value={pair.roleId}
                              onChange={function (e) {
                                setRanchRolePairs(function (prevPairs) {
                                  return prevPairs.map(function (item, index) {
                                    if (index === idx) {
                                      return {
                                        ...item,
                                        roleId: e.target.value,
                                      };
                                    }
                                    return item;
                                  });
                                });
                              }}
                              options={filteredRoles}
                              placeholder="בחר תפקיד"
                              disabled={false}
                              searchable={true}
                              openDropdownKey={openDropdownKey}
                              setOpenDropdownKey={setOpenDropdownKey}
                              dropdownKey={"role-" + idx}
                              getOptionLabel={function (option) {
                                return option.roleName;
                              }}
                              getOptionValue={function (option) {
                                return option.roleId;
                              }}
                            />
                          </Field>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {ranchRolePairs.length < 4 && (
                  <button
                    type="button"
                    onClick={function () {
                      setRanchRolePairs(function (prevPairs) {
                        return [...prevPairs, { ranchId: "", roleId: "" }];
                      });
                    }}
                    className="mt-3 flex items-center gap-1.5 text-sm font-medium transition-colors"
                    style={{ color: palette.primary }}
                    onMouseEnter={function (e) {
                      e.currentTarget.style.color = palette.heading;
                    }}
                    onMouseLeave={function (e) {
                      e.currentTarget.style.color = palette.primary;
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-base leading-none"
                      style={{
                        borderWidth: 2,
                        borderStyle: "solid",
                        borderColor: palette.primary,
                      }}
                    >
                      +
                    </span>
                    הוספת חווה ותפקיד נוסף
                  </button>
                )}

                <div className="mt-6 flex justify-start">
                  <AuthButton
                    type="button"
                    variant="outline"
                    fullWidth={false}
                    onClick={function () {
                      setActiveSection(2);
                    }}
                  >
                    חזרה
                  </AuthButton>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8 space-y-4 relative z-0">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm text-right">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm text-right">
                {success}
              </div>
            )}

            <div className="bg-amber-50 border-r-4 border-amber-400 px-4 py-3 rounded-xl text-right">
              <p className="text-xs" style={{ color: palette.text }}>
                הבקשה תועבר לאישור מנהל המערכת. לא תוכל להתחבר עד לאישור.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <AuthButton
                type="submit"
                fullWidth={false}
                className="flex-1 shadow-md hover:shadow-lg active:scale-[0.98]"
                style={{
                  paddingTop: "0.75rem",
                  paddingBottom: "0.75rem",
                  fontSize: "1rem",
                  opacity:
                    loading || existingSystemUserFound || !otpCode
                      ? 0.6
                      : undefined,
                }}
                disabled={loading || existingSystemUserFound || !otpCode}
              >
                {loading ? "שולח בקשה..." : "שלח בקשת הרשמה"}
              </AuthButton>

              <AuthButton
                type="button"
                variant="outline"
                fullWidth={false}
                className="sm:w-44 active:scale-[0.98]"
                style={{
                  paddingTop: "0.75rem",
                  paddingBottom: "0.75rem",
                }}
                onClick={function () {
                  navigate("/login");
                }}
              >
                חזרה להתחברות
              </AuthButton>
            </div>
          </div>
        </form>
      </div>

      {showRanchModal && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center px-4">
          <div
            className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            style={{
              backgroundColor: palette.surface,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: palette.borderSoft,
            }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{
                borderBottomWidth: 1,
                borderBottomStyle: "solid",
                borderBottomColor: palette.borderSoft,
              }}
            >
              <button
                type="button"
                onClick={closeCreateRanchModal}
                className="transition-colors"
                style={{ color: palette.mutedText }}
                onMouseEnter={function (e) {
                  e.currentTarget.style.color = palette.text;
                }}
                onMouseLeave={function (e) {
                  e.currentTarget.style.color = palette.mutedText;
                }}
              >
                <X size={18} />
              </button>

              <h3 className="text-lg font-bold" style={{ color: palette.heading }}>
                בקשה להוספת חווה
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <p
                className="text-xs text-right leading-6"
                style={{ color: palette.primary }}
              >
                לא מצאת את החווה שלך? אפשר לשלוח בקשה להוספת חווה חדשה. הבקשה
                תועבר לאישור מנהל המערכת.
              </p>

              <Field label="שם החווה" required>
                <input
                  type="text"
                  value={newRanch.ranchName}
                  onChange={setNewRanchField("ranchName")}
                  placeholder="הזיני שם חווה"
                  className={inputCls}
                  style={getEditableFieldStyle()}
                  onFocus={handleEditableFieldFocus}
                  onBlur={handleEditableFieldBlur}
                />
              </Field>

              <Field label="אימייל חווה">
                <input
                  type="email"
                  value={newRanch.contactEmail}
                  onChange={setNewRanchField("contactEmail")}
                  placeholder="example@email.com"
                  className={inputCls}
                  style={getEditableFieldStyle()}
                  onFocus={handleEditableFieldFocus}
                  onBlur={handleEditableFieldBlur}
                />
              </Field>

              <Field label="טלפון חווה">
                <input
                  type="tel"
                  value={newRanch.contactPhone}
                  onChange={setNewRanchField("contactPhone")}
                  placeholder="050-0000000"
                  className={inputCls}
                  style={getEditableFieldStyle()}
                  onFocus={handleEditableFieldFocus}
                  onBlur={handleEditableFieldBlur}
                />
              </Field>

              <Field label="אתר חווה">
                <input
                  type="text"
                  value={newRanch.websiteUrl}
                  onChange={setNewRanchField("websiteUrl")}
                  placeholder="https://example.com"
                  className={inputCls}
                  style={getEditableFieldStyle()}
                  onFocus={handleEditableFieldFocus}
                  onBlur={handleEditableFieldBlur}
                />
              </Field>

              {ranchModalError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm text-right">
                  {ranchModalError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <AuthButton
                  type="button"
                  fullWidth={false}
                  className="flex-1 shadow-md hover:shadow-lg active:scale-[0.98]"
                  style={{
                    paddingTop: "0.75rem",
                    paddingBottom: "0.75rem",
                    opacity: creatingRanchRequest ? 0.6 : undefined,
                  }}
                  onClick={handleCreateRanchRequest}
                  disabled={creatingRanchRequest}
                >
                  {creatingRanchRequest ? "שולח בקשה..." : "שלח בקשת חווה"}
                </AuthButton>

                <AuthButton
                  type="button"
                  variant="outline"
                  fullWidth={false}
                  className="sm:w-36"
                  style={{
                    paddingTop: "0.75rem",
                    paddingBottom: "0.75rem",
                    opacity: creatingRanchRequest ? 0.6 : undefined,
                  }}
                  onClick={closeCreateRanchModal}
                  disabled={creatingRanchRequest}
                >
                  ביטול
                </AuthButton>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs mt-6" style={{ color: palette.subtleText }}>
        RideOn System &copy; 2026
      </p>
    </div>
  );
}
