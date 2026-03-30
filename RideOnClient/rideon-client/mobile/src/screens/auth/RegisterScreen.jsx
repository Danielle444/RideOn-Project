import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import {
  register,
  getRanches,
  getRoles,
  checkUsername,
  getPersonByNationalIdForRegistration,
} from "../../services/authService";

import { getApiErrorMessage } from "../../../../shared/auth/utils/authApiErrors";
import {
  mapGenderToFormValue,
  filterRegisterRoles,
} from "../../../../shared/auth/mappings/authMappings";
import {
  validateRegisterForm,
  validatePersonalSection,
  validateUserSection,
} from "../../../../shared/auth/validations/registerValidation";

import styles from "../../styles/authStyles";

export default function RegisterScreen() {
  var navigation = useNavigation();

  var [activeSection, setActiveSection] = useState(1);

  var [showPasswordInfo, setShowPasswordInfo] = useState(false);

  var [form, setForm] = useState({
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

  var [ranchRolePairs, setRanchRolePairs] = useState([
    { ranchId: "", roleId: "", expanded: true },
  ]);

  var [roles, setRoles] = useState([]);
  var [ranches, setRanches] = useState([]);

  var [loadingData, setLoadingData] = useState(true);
  var [loadingSubmit, setLoadingSubmit] = useState(false);

  var [error, setError] = useState("");
  var [success, setSuccess] = useState("");

  var [checkingNationalId, setCheckingNationalId] = useState(false);
  var [nationalIdMessage, setNationalIdMessage] = useState("");
  var [nationalIdChecked, setNationalIdChecked] = useState(false);
  var [personLoadedFromSystem, setPersonLoadedFromSystem] = useState(false);
  var [existingSystemUserFound, setExistingSystemUserFound] = useState(false);

  var [checkingUsername, setCheckingUsername] = useState(false);
  var [usernameSuggestionMessage, setUsernameSuggestionMessage] = useState("");

  var [showPassword, setShowPassword] = useState(false);
  var [showConfirmPassword, setShowConfirmPassword] = useState(false);

  var [showDatePicker, setShowDatePicker] = useState(false);

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

  function formatDateToInput(dateValue) {
    var date = new Date(dateValue);
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
  }

  function parseInputDate(dateString) {
    if (!dateString) {
      return new Date();
    }

    var parts = dateString.split("-");
    if (parts.length !== 3) {
      return new Date();
    }

    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function set(fieldName) {
    return function (value) {
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
    };
  }

  function updatePair(index, fieldName, value) {
    setRanchRolePairs(function (prevPairs) {
      return prevPairs.map(function (pair, pairIndex) {
        if (pairIndex === index) {
          return {
            ...pair,
            [fieldName]: value,
          };
        }

        return pair;
      });
    });
  }

  function togglePairExpanded(index) {
    setRanchRolePairs(function (prevPairs) {
      return prevPairs.map(function (pair, pairIndex) {
        if (pairIndex === index) {
          return {
            ...pair,
            expanded: !pair.expanded,
          };
        }

        return pair;
      });
    });
  }

  function addPair() {
    if (ranchRolePairs.length >= 4) {
      return;
    }

    var hasIncompletePair = ranchRolePairs.some(function (pair) {
      return !pair.ranchId || !pair.roleId;
    });

    if (hasIncompletePair) {
      setError("יש להשלים חווה ותפקיד לפני הוספת זוג נוסף");
      return;
    }

    setError("");

    setRanchRolePairs(function (prevPairs) {
      var collapsedPrev = prevPairs.map(function (pair) {
        return {
          ...pair,
          expanded: false,
        };
      });

      return [...collapsedPrev, { ranchId: "", roleId: "", expanded: true }];
    });
  }

  function removePair(index) {
    if (ranchRolePairs.length === 1) {
      return;
    }

    setRanchRolePairs(function (prevPairs) {
      return prevPairs.filter(function (_, pairIndex) {
        return pairIndex !== index;
      });
    });
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

      var response = await checkUsername(emailValue);

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
          gender: mapGenderToFormValue(person.gender),
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

  async function handleEmailBlur() {
    var emailValue = form.email.trim();
    await tryAutoFillUsernameFromEmail(emailValue);
  }

  function handleDateChange(event, selectedDate) {
    setShowDatePicker(false);

    if (!selectedDate) {
      return;
    }

    setForm(function (prevForm) {
      return {
        ...prevForm,
        dateOfBirth: formatDateToInput(selectedDate),
      };
    });
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

  async function handleSubmit() {
    setError("");
    setSuccess("");

    var validationError = validateRegisterForm(form, existingSystemUserFound);

    if (validationError) {
      setError(validationError);
      return;
    }

    var validPairs = ranchRolePairs.filter(function (pair) {
      return pair.ranchId && pair.roleId;
    });

    var hasPartialPair = ranchRolePairs.some(function (pair) {
      return (pair.ranchId && !pair.roleId) || (!pair.ranchId && pair.roleId);
    });

    if (hasPartialPair) {
      setError("אם בוחרים חווה או תפקיד, חייבים לבחור גם את השני באותו זוג");
      return;
    }

    if (validPairs.length === 0) {
      setError("יש לבחור לפחות חווה ותפקיד אחד");
      return;
    }

    setLoadingSubmit(true);

    try {
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
        ranchRoles: validPairs.map(function (pair) {
          return {
            ranchId: Number(pair.ranchId),
            roleId: Number(pair.roleId),
          };
        }),
      });

      setSuccess("הבקשה נשלחה בהצלחה");

      Alert.alert("הצלחה", "הבקשה נשלחה בהצלחה", [
        {
          text: "אישור",
          onPress: function () {
            navigation.navigate("Login");
          },
        },
      ]);
    } catch (err) {
      var message = getApiErrorMessage(err, "שגיאה בהרשמה");
      setError(String(message));
    } finally {
      setLoadingSubmit(false);
    }
  }

  function renderSectionHeader(title, sectionNumber) {
    var isOpen = activeSection === sectionNumber;

    return (
      <Pressable
        onPress={function () {
          setActiveSection(sectionNumber);
        }}
        style={styles.sectionHeader}
      >
        <Text style={styles.sectionHeaderArrow}>{isOpen ? "▲" : "▼"}</Text>
        <Text style={styles.sectionHeaderText}>{title}</Text>
      </Pressable>
    );
  }

  function renderTextField(
    label,
    value,
    onChangeText,
    placeholder,
    extraProps,
    helperText,
    isLocked,
  ) {
    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{label}</Text>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B7AAA3"
          style={[styles.input, isLocked ? styles.readOnlyInput : null]}
          textAlign="right"
          editable={!isLocked}
          {...extraProps}
        />

        {!!helperText && <Text style={styles.helperText}>{helperText}</Text>}
      </View>
    );
  }

  function renderPasswordField(
    label,
    value,
    onChangeText,
    placeholder,
    isVisible,
    toggleVisible,
    showInfo,
    toggleInfo,
  ) {
    return (
      <View style={styles.fieldGroup}>
        <View style={styles.passwordLabelRow}>
          {toggleInfo ? (
            <Pressable onPress={toggleInfo} style={styles.infoButton}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#8B6352"
              />
            </Pressable>
          ) : null}

          <Text style={styles.label}>{label}</Text>
        </View>

        {showInfo ? (
          <View style={styles.passwordInfoBox}>
            <Text style={styles.passwordInfoText}>• לפחות 8 תווים</Text>
            <Text style={styles.passwordInfoText}>
              • לפחות אות אנגלית גדולה אחת
            </Text>
            <Text style={styles.passwordInfoText}>
              • לפחות אות אנגלית קטנה אחת
            </Text>
            <Text style={styles.passwordInfoText}>• לפחות ספרה אחת</Text>
            <Text style={styles.passwordInfoText}>• ללא רווחים</Text>
          </View>
        ) : null}

        <View style={styles.passwordWrapper}>
          <Pressable onPress={toggleVisible} style={styles.eyeButton}>
            <Ionicons
              name={isVisible ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#8B6352"
            />
          </Pressable>

          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#B7AAA3"
            style={styles.passwordInput}
            secureTextEntry={!isVisible}
          />
        </View>
      </View>
    );
  }

  function renderGenderSelector(isLocked) {
    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>מגדר</Text>

        <View style={styles.genderRow}>
          <Pressable
            style={[
              styles.genderOption,
              form.gender === "F" ? styles.genderOptionSelected : null,
              isLocked ? styles.readOnlyOption : null,
            ]}
            onPress={function () {
              if (!isLocked) {
                set("gender")("F");
              }
            }}
          >
            <Text
              style={[
                styles.genderOptionText,
                form.gender === "F" ? styles.genderOptionTextSelected : null,
              ]}
            >
              נקבה
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.genderOption,
              form.gender === "M" ? styles.genderOptionSelected : null,
              isLocked ? styles.readOnlyOption : null,
            ]}
            onPress={function () {
              if (!isLocked) {
                set("gender")("M");
              }
            }}
          >
            <Text
              style={[
                styles.genderOptionText,
                form.gender === "M" ? styles.genderOptionTextSelected : null,
              ]}
            >
              זכר
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderDateField(isLocked) {
    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>תאריך לידה</Text>

        <Pressable
          style={[styles.inputButton, isLocked ? styles.readOnlyInput : null]}
          onPress={function () {
            if (!isLocked) {
              setShowDatePicker(true);
            }
          }}
        >
          <Text
            style={[
              styles.inputButtonText,
              !form.dateOfBirth ? styles.placeholderText : null,
            ]}
          >
            {form.dateOfBirth || "בחרי תאריך לידה"}
          </Text>
        </Pressable>
      </View>
    );
  }

  function getRanchNameById(ranchId) {
    var found = ranches.find(function (ranch) {
      return String(ranch.ranchId) === String(ranchId);
    });

    return found ? found.ranchName : "";
  }

  function getRoleNameById(roleId) {
    var found = filteredRoles.find(function (role) {
      return String(role.roleId) === String(roleId);
    });

    return found ? found.roleName : "";
  }

  function renderPairCard(pair, index) {
    var ranchName = getRanchNameById(pair.ranchId);
    var roleName = getRoleNameById(pair.roleId);
    var isComplete = !!pair.ranchId && !!pair.roleId;

    if (!pair.expanded && isComplete) {
      return (
        <Pressable
          key={index}
          style={styles.collapsedPairCard}
          onPress={function () {
            togglePairExpanded(index);
          }}
        >
          <View style={styles.collapsedPairActions}>
            {ranchRolePairs.length > 1 && (
              <Pressable
                onPress={function () {
                  removePair(index);
                }}
                style={styles.removeSmallButton}
              >
                <Text style={styles.removeSmallButtonText}>הסר</Text>
              </Pressable>
            )}

            <Text style={styles.collapsedPairArrow}>▼</Text>
          </View>

          <View style={styles.collapsedPairTextWrap}>
            <Text style={styles.collapsedPairMain}>{ranchName}</Text>
            <Text style={styles.collapsedPairSub}>{roleName}</Text>
          </View>
        </Pressable>
      );
    }

    return (
      <View key={index} style={styles.pairBox}>
        <View style={styles.pairTopRow}>
          <View style={styles.pairTopActions}>
            {ranchRolePairs.length > 1 && (
              <Pressable
                style={styles.removePairButton}
                onPress={function () {
                  removePair(index);
                }}
              >
                <Text style={styles.removePairButtonText}>הסר</Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.pairEditTitle}>בחירת חווה ותפקיד</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>חווה</Text>

          <View style={styles.pickerBox}>
            <Picker
              selectedValue={pair.ranchId}
              onValueChange={function (value) {
                updatePair(index, "ranchId", String(value));
              }}
              style={styles.picker}
            >
              <Picker.Item label="בחרי חווה" value="" />
              {ranches.map(function (ranch) {
                return (
                  <Picker.Item
                    key={ranch.ranchId}
                    label={ranch.ranchName}
                    value={String(ranch.ranchId)}
                  />
                );
              })}
            </Picker>
          </View>
        </View>

        {!!pair.ranchId && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>תפקיד</Text>

            <View style={styles.pickerBox}>
              <Picker
                selectedValue={pair.roleId}
                onValueChange={function (value) {
                  updatePair(index, "roleId", String(value));
                }}
                style={styles.picker}
              >
                <Picker.Item label="בחרי תפקיד" value="" />
                {filteredRoles.map(function (role) {
                  return (
                    <Picker.Item
                      key={role.roleId}
                      label={role.roleName}
                      value={String(role.roleId)}
                    />
                  );
                })}
              </Picker>
            </View>
          </View>
        )}
      </View>
    );
  }

  var filteredRoles = filterRegisterRoles(roles);

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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B6352" />
          <Text style={styles.loadingText}>טוען נתונים...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardWrapper}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Image
              source={require("../../../../shared/assets/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.registerTitle}>הרשמה למערכת</Text>
            <Text style={styles.registerSubtitle}>
              מלאי את הפרטים ושלחי בקשת הרשמה
            </Text>

            {!!error && <Text style={styles.errorText}>{error}</Text>}
            {!!success && <Text style={styles.successText}>{success}</Text>}

            <View style={styles.sectionBox}>
              {renderSectionHeader("פרטים אישיים", 1)}

              {activeSection === 1 && (
                <View style={styles.sectionContent}>
                  {renderTextField(
                    "תעודת זהות",
                    form.nationalId,
                    set("nationalId"),
                    "הזן 9 ספרות",
                    {
                      keyboardType: "numeric",
                      maxLength: 9,
                      onBlur: handleNationalIdBlur,
                    },
                    checkingNationalId
                      ? "בודק תעודת זהות..."
                      : nationalIdMessage,
                    false,
                  )}

                  {renderTextField(
                    "שם פרטי",
                    form.firstName,
                    set("firstName"),
                    "הזן שם פרטי",
                    {},
                    "",
                    firstNameLocked,
                  )}

                  {renderTextField(
                    "שם משפחה",
                    form.lastName,
                    set("lastName"),
                    "הזן שם משפחה",
                    {},
                    "",
                    lastNameLocked,
                  )}

                  {renderGenderSelector(genderLocked)}

                  {renderDateField(dateOfBirthLocked)}

                  {renderTextField(
                    "טלפון נייד",
                    form.cellPhone,
                    set("cellPhone"),
                    "050-0000000",
                    {
                      keyboardType: "phone-pad",
                    },
                    "",
                    cellPhoneLocked,
                  )}

                  {renderTextField(
                    "אימייל",
                    form.email,
                    set("email"),
                    "example@email.com",
                    {
                      autoCapitalize: "none",
                      keyboardType: "email-address",
                      onBlur: handleEmailBlur,
                    },
                    "",
                    emailLocked,
                  )}

                  <Pressable
                    style={styles.primaryButton}
                    onPress={goToUserSection}
                  >
                    <Text style={styles.primaryButtonText}>המשך לשלב הבא</Text>
                  </Pressable>
                </View>
              )}
            </View>

            <View style={styles.sectionBox}>
              {renderSectionHeader("פרטי כניסה למערכת", 2)}

              {activeSection === 2 && (
                <View style={styles.sectionContent}>
                  {renderTextField(
                    "שם משתמש",
                    form.username,
                    set("username"),
                    "בחרי שם משתמש",
                    {
                      autoCapitalize: "none",
                    },
                    checkingUsername
                      ? "בודק זמינות..."
                      : usernameSuggestionMessage,
                    false,
                  )}

                  {renderPasswordField(
                    "סיסמה",
                    form.password,
                    set("password"),
                    "בחרי סיסמה",
                    showPassword,
                    function () {
                      setShowPassword(function (prev) {
                        return !prev;
                      });
                    },
                    showPasswordInfo,
                    function () {
                      setShowPasswordInfo(function (prev) {
                        return !prev;
                      });
                    },
                  )}

                  {renderPasswordField(
                    "אימות סיסמה",
                    form.confirmPassword,
                    set("confirmPassword"),
                    "הזיני שוב את הסיסמה",
                    showConfirmPassword,
                    function () {
                      setShowConfirmPassword(function (prev) {
                        return !prev;
                      });
                    },
                    false,
                    null,
                  )}

                  <View style={styles.stepButtonsRow}>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={function () {
                        setActiveSection(1);
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>חזרה</Text>
                    </Pressable>

                    <Pressable
                      style={styles.primaryButtonCompact}
                      onPress={goToRanchSection}
                    >
                      <Text style={styles.primaryButtonText}>המשך</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.sectionBox}>
              {renderSectionHeader("שיוך לחווה ותפקיד", 3)}

              {activeSection === 3 && (
                <View style={styles.sectionContent}>
                  {ranchRolePairs.map(renderPairCard)}

                  {ranchRolePairs.length < 4 && (
                    <Pressable style={styles.addPairButton} onPress={addPair}>
                      <Text style={styles.addPairButtonText}>
                        + הוספת חווה ותפקיד נוסף
                      </Text>
                    </Pressable>
                  )}

                  <View style={styles.noticeBox}>
                    <Text style={styles.noticeText}>
                      הבקשה תועבר לאישור, ולא ניתן יהיה להתחבר עד לאישור מנהל
                      המערכת.
                    </Text>
                  </View>

                  <View style={styles.stepButtonsRow}>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={function () {
                        setActiveSection(2);
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>חזרה</Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.primaryButtonCompact,
                        loadingSubmit ? styles.primaryButtonDisabled : null,
                      ]}
                      onPress={handleSubmit}
                      disabled={loadingSubmit}
                    >
                      <Text style={styles.primaryButtonText}>
                        {loadingSubmit ? "שולח..." : "שלח בקשה"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>

            <Pressable
              onPress={function () {
                navigation.navigate("Login");
              }}
            >
              <Text style={styles.bottomLink}>כבר יש לך חשבון? התחבר</Text>
            </Pressable>
          </View>
        </ScrollView>

        {showDatePicker && (
          <DateTimePicker
            value={parseInputDate(form.dateOfBirth)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            maximumDate={new Date()}
            onChange={handleDateChange}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
