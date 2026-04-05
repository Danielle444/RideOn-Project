import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout";
import secretaryGeneralMenu from "../../components/secretary/secretaryGeneralMenu";
import ToastMessage from "../../components/common/ToastMessage";
import ClassInCompetitionModal from "../../components/secretary/ClassInCompetitionModal";
import ClassesInCompetitionSection from "../../components/secretary/ClassesInCompetitionSection";
import PaidTimeSlotInCompetitionModal from "../../components/secretary/PaidTimeSlotInCompetitionModal";
import PaidTimeSlotsInCompetitionSection from "../../components/secretary/PaidTimeSlotsInCompetitionSection";
import { useUser } from "../../context/UserContext";
import { useActiveRole } from "../../context/ActiveRoleContext";
import {
  createCompetition,
  getCompetitionById,
  updateCompetition,
} from "../../services/competitionService";
import { getAllFields, getAllClassTypes, getAllJudges } from "../../services/superUserService";
import { getArenasByRanchId } from "../../services/arenaService";
import {
  getClassesByCompetitionId,
  createClassInCompetition,
  updateClassInCompetition,
  deleteClassInCompetition,
} from "../../services/classInCompetitionService";
import {
  getAllPaidTimeBaseSlots,
  getPaidTimeSlotsByCompetitionId,
  createPaidTimeSlotInCompetition,
  updatePaidTimeSlotInCompetition,
  deletePaidTimeSlotInCompetition,
} from "../../services/paidTimeSlotInCompetitionService";

function SectionCard(props) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#E6DCD5] bg-white shadow-sm">
      <button
        type="button"
        onClick={props.onToggle}
        className="flex w-full items-center justify-between px-6 py-5 text-right"
      >
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#F8EBDD] px-4 py-1 text-sm font-semibold text-[#D0832D]">
            {props.statusText}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[#4E342E]">
          <span className="text-[1.75rem] font-bold">{props.title}</span>
          {props.isOpen ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
        </div>
      </button>

      {props.isOpen ? (
        <div className="border-t border-[#EFE5DF] px-6 py-6">{props.children}</div>
      ) : null}
    </div>
  );
}

function StatusBadge(props) {
  var status = props.status || "-";
  var className = "bg-[#F3ECE8] text-[#6D4C41]";

  if (status === "כעת") {
    className = "bg-green-100 text-green-700";
  } else if (status === "פעילה") {
    className = "bg-blue-100 text-blue-700";
  } else if (status === "עתידית") {
    className = "bg-sky-100 text-sky-700";
  } else if (status === "הסתיימה") {
    className = "bg-gray-100 text-gray-700";
  } else if (status === "טיוטה") {
    className = "bg-amber-100 text-amber-700";
  } else if (status === "בוטלה") {
    className = "bg-red-100 text-red-700";
  }

  return (
    <span className={"inline-flex rounded-full px-4 py-2 text-sm font-semibold " + className}>
      {status}
    </span>
  );
}

function toInputDate(value) {
  if (!value) {
    return "";
  }

  var date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, "0");
  var day = String(date.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

export default function CompetitionFormPage(props) {
  var navigate = useNavigate();
  var params = useParams();
  var userContext = useUser();
  var activeRoleContext = useActiveRole();

  var user = userContext.user;
  var activeRole = activeRoleContext.activeRole;

  var isEdit = props.mode === "edit";
  var competitionIdFromRoute = params.competitionId ? Number(params.competitionId) : null;

  var [loadingPage, setLoadingPage] = useState(false);
  var [savingDetails, setSavingDetails] = useState(false);

  var [fields, setFields] = useState([]);
  var [arenas, setArenas] = useState([]);
  var [classTypes, setClassTypes] = useState([]);
  var [judges, setJudges] = useState([]);
  var [paidTimeBaseSlots, setPaidTimeBaseSlots] = useState([]);

  var [classesInCompetition, setClassesInCompetition] = useState([]);
  var [paidTimeSlotsInCompetition, setPaidTimeSlotsInCompetition] = useState([]);

  var [loadingClasses, setLoadingClasses] = useState(false);
  var [classModalOpen, setClassModalOpen] = useState(false);
  var [editClassItem, setEditClassItem] = useState(null);
  var [classModalError, setClassModalError] = useState("");
  var [savingClass, setSavingClass] = useState(false);

  var [loadingPaidTime, setLoadingPaidTime] = useState(false);
  var [paidTimeModalOpen, setPaidTimeModalOpen] = useState(false);
  var [editPaidTimeItem, setEditPaidTimeItem] = useState(null);
  var [paidTimeModalError, setPaidTimeModalError] = useState("");
  var [savingPaidTime, setSavingPaidTime] = useState(false);

  var [sectionsOpen, setSectionsOpen] = useState({
    details: true,
    classes: false,
    paidTime: false,
  });

  var [competitionId, setCompetitionId] = useState(isEdit ? competitionIdFromRoute : null);
  var [currentStatus, setCurrentStatus] = useState("טיוטה");
  var [manualStatusAction, setManualStatusAction] = useState("none");

  var [detailsForm, setDetailsForm] = useState({
    competitionName: "",
    fieldId: "",
    competitionStartDate: "",
    competitionEndDate: "",
    registrationOpenDate: "",
    registrationEndDate: "",
    paidTimeRegistrationDate: "",
    paidTimePublicationDate: "",
    notes: "",
  });

  var [toast, setToast] = useState({
    isOpen: false,
    type: "success",
    message: "",
  });

  var userName = ((user?.firstName || "") + " " + (user?.lastName || "")).trim();
  var subtitle =
    [activeRole?.roleName, activeRole?.ranchName].filter(Boolean).join(" · ") ||
    "לא נבחר תפקיד וחווה";

  var currentRanchId = useMemo(
    function () {
      return activeRole?.ranchId || null;
    },
    [activeRole],
  );

  useEffect(
    function () {
      if (!currentRanchId) {
        return;
      }

      loadInitialData();
    },
    [currentRanchId],
  );

  useEffect(
    function () {
      if (!detailsForm.fieldId) {
        setClassTypes([]);
        setJudges([]);
        return;
      }

      loadFieldRelatedData(Number(detailsForm.fieldId));
    },
    [detailsForm.fieldId],
  );

  async function loadInitialData() {
    if (!currentRanchId) {
      return;
    }

    try {
      setLoadingPage(true);

      var results = await Promise.all([
        getAllFields(),
        getArenasByRanchId(currentRanchId),
        getAllPaidTimeBaseSlots(currentRanchId),
      ]);

      var fieldsRes = results[0];
      var arenasRes = results[1];
      var paidTimeBaseSlotsRes = results[2];

      setFields(Array.isArray(fieldsRes.data) ? fieldsRes.data : []);
      setArenas(Array.isArray(arenasRes.data) ? arenasRes.data : []);
      setPaidTimeBaseSlots(Array.isArray(paidTimeBaseSlotsRes.data) ? paidTimeBaseSlotsRes.data : []);

      if (isEdit && competitionIdFromRoute) {
        await loadExistingCompetition(competitionIdFromRoute, currentRanchId);
      } else {
        setCurrentStatus("טיוטה");
        setManualStatusAction("none");
      }
    } catch (error) {
      console.error(error);
      showToast("error", error.response?.data || "שגיאה בטעינת נתוני העמוד");
    } finally {
      setLoadingPage(false);
    }
  }

  async function loadFieldRelatedData(fieldId) {
    try {
      var results = await Promise.all([
        getAllClassTypes(fieldId),
        getAllJudges(fieldId),
      ]);

      var classTypesRes = results[0];
      var judgesRes = results[1];

      setClassTypes(Array.isArray(classTypesRes.data) ? classTypesRes.data : []);
      setJudges(Array.isArray(judgesRes.data) ? judgesRes.data : []);
    } catch (error) {
      console.error(error);
      showToast("error", error.response?.data || "שגיאה בטעינת נתוני ענף");
    }
  }

  async function loadExistingCompetition(competitionIdValue, ranchId) {
    try {
      var results = await Promise.all([
        getCompetitionById(competitionIdValue, ranchId),
        getClassesByCompetitionId(competitionIdValue, ranchId),
        getPaidTimeSlotsByCompetitionId(competitionIdValue, ranchId),
      ]);

      var competitionRes = results[0];
      var classesRes = results[1];
      var paidTimeRes = results[2];

      var competition = competitionRes.data;

      setCompetitionId(competition.competitionId);
      setCurrentStatus(competition.competitionStatus || "טיוטה");
      setManualStatusAction((competition.competitionStatus || "") === "בוטלה" ? "cancelled" : "none");

      setDetailsForm({
        competitionName: competition.competitionName || "",
        fieldId: competition.fieldId ? String(competition.fieldId) : "",
        competitionStartDate: toInputDate(competition.competitionStartDate),
        competitionEndDate: toInputDate(competition.competitionEndDate),
        registrationOpenDate: toInputDate(competition.registrationOpenDate),
        registrationEndDate: toInputDate(competition.registrationEndDate),
        paidTimeRegistrationDate: toInputDate(competition.paidTimeRegistrationDate),
        paidTimePublicationDate: toInputDate(competition.paidTimePublicationDate),
        notes: competition.notes || "",
      });

      setClassesInCompetition(Array.isArray(classesRes.data) ? classesRes.data : []);
      setPaidTimeSlotsInCompetition(Array.isArray(paidTimeRes.data) ? paidTimeRes.data : []);
    } catch (error) {
      console.error(error);
      showToast("error", error.response?.data || "שגיאה בטעינת פרטי התחרות");
    }
  }

  async function loadClassesSectionData(competitionIdValue, ranchId) {
    try {
      setLoadingClasses(true);

      var response = await getClassesByCompetitionId(competitionIdValue, ranchId);
      setClassesInCompetition(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      showToast("error", error.response?.data || "שגיאה בטעינת המקצים");
    } finally {
      setLoadingClasses(false);
    }
  }

  async function loadPaidTimeSectionData(competitionIdValue, ranchId) {
    try {
      setLoadingPaidTime(true);

      var response = await getPaidTimeSlotsByCompetitionId(competitionIdValue, ranchId);
      setPaidTimeSlotsInCompetition(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      showToast("error", error.response?.data || "שגיאה בטעינת סלוטי הפייד־טיים");
    } finally {
      setLoadingPaidTime(false);
    }
  }

  function showToast(type, message) {
    setToast({
      isOpen: true,
      type: type,
      message: message,
    });
  }

  function closeToast() {
    setToast({
      isOpen: false,
      type: "success",
      message: "",
    });
  }

  function toggleSection(sectionKey) {
    setSectionsOpen(function (prev) {
      return {
        ...prev,
        [sectionKey]: !prev[sectionKey],
      };
    });
  }

  function handleDetailsChange(fieldName, value) {
    setDetailsForm(function (prev) {
      return {
        ...prev,
        [fieldName]: value,
      };
    });
  }

  function getStatusToSendForUpdate() {
    if (manualStatusAction === "cancelled") {
      return "בוטלה";
    }

    if (manualStatusAction === "draft") {
      return "טיוטה";
    }

    return null;
  }

  async function handleSaveDetails() {
    if (!currentRanchId) {
      showToast("error", "לא נבחרה חווה פעילה");
      return;
    }

    try {
      setSavingDetails(true);

      if (competitionId) {
        await updateCompetition(competitionId, {
          competitionId: competitionId,
          hostRanchId: currentRanchId,
          fieldId: Number(detailsForm.fieldId),
          competitionName: detailsForm.competitionName,
          competitionStartDate: detailsForm.competitionStartDate,
          competitionEndDate: detailsForm.competitionEndDate,
          registrationOpenDate: detailsForm.registrationOpenDate || null,
          registrationEndDate: detailsForm.registrationEndDate || null,
          paidTimeRegistrationDate: detailsForm.paidTimeRegistrationDate || null,
          paidTimePublicationDate: detailsForm.paidTimePublicationDate || null,
          competitionStatus: getStatusToSendForUpdate(),
          notes: detailsForm.notes || null,
        });

        showToast("success", "פרטי התחרות נשמרו בהצלחה");
        await loadExistingCompetition(competitionId, currentRanchId);
      } else {
        var response = await createCompetition({
          hostRanchId: currentRanchId,
          fieldId: Number(detailsForm.fieldId),
          competitionName: detailsForm.competitionName,
          competitionStartDate: detailsForm.competitionStartDate,
          competitionEndDate: detailsForm.competitionEndDate,
          registrationOpenDate: detailsForm.registrationOpenDate || null,
          registrationEndDate: detailsForm.registrationEndDate || null,
          paidTimeRegistrationDate: detailsForm.paidTimeRegistrationDate || null,
          paidTimePublicationDate: detailsForm.paidTimePublicationDate || null,
          notes: detailsForm.notes || null,
        });

        var newCompetitionId = response.data?.competitionId || response.data?.CompetitionId;

        if (!newCompetitionId) {
          throw new Error("CompetitionId was not returned from server");
        }

        setCompetitionId(newCompetitionId);
        setCurrentStatus("טיוטה");
        setManualStatusAction("draft");
        showToast("success", "טיוטת התחרות נוצרה בהצלחה");

        navigate("/competitions/" + newCompetitionId + "/edit", { replace: true });
      }

      setSectionsOpen({
        details: true,
        classes: true,
        paidTime: true,
      });
    } catch (error) {
      console.error(error);
      showToast("error", error.response?.data || "שגיאה בשמירת פרטי התחרות");
    } finally {
      setSavingDetails(false);
    }
  }

  function openCreateClassModal() {
    setEditClassItem(null);
    setClassModalError("");
    setClassModalOpen(true);
  }

  function openEditClassModal(item) {
    setEditClassItem(item);
    setClassModalError("");
    setClassModalOpen(true);
  }

  function closeClassModal() {
    setClassModalOpen(false);
    setEditClassItem(null);
    setClassModalError("");
  }

  async function handleSubmitClass(formData) {
    if (!competitionId || !currentRanchId) {
      setClassModalError("יש לשמור קודם את התחרות");
      return;
    }

    try {
      setSavingClass(true);
      setClassModalError("");

      if (editClassItem) {
        await updateClassInCompetition(editClassItem.classInCompId, {
          classInCompId: editClassItem.classInCompId,
          competitionId: competitionId,
          hostRanchId: currentRanchId,
          classTypeId: formData.classTypeId,
          arenaRanchId: currentRanchId,
          arenaId: formData.arenaId,
          classDateTime: formData.classDateTime,
          startTime: formData.startTime,
          orderInDay: formData.orderInDay,
          organizerCost: formData.organizerCost,
          federationCost: formData.federationCost,
          classNotes: formData.classNotes,
        });

        showToast("success", "המקצה עודכן בהצלחה");
      } else {
        await createClassInCompetition({
          competitionId: competitionId,
          hostRanchId: currentRanchId,
          classTypeId: formData.classTypeId,
          arenaRanchId: currentRanchId,
          arenaId: formData.arenaId,
          classDateTime: formData.classDateTime,
          startTime: formData.startTime,
          orderInDay: formData.orderInDay,
          organizerCost: formData.organizerCost,
          federationCost: formData.federationCost,
          classNotes: formData.classNotes,
        });

        showToast("success", "המקצה נוסף בהצלחה");
      }

      closeClassModal();
      await loadClassesSectionData(competitionId, currentRanchId);
    } catch (error) {
      console.error(error);
      setClassModalError(error.response?.data || "שגיאה בשמירת המקצה");
    } finally {
      setSavingClass(false);
    }
  }

  async function handleDeleteClass(item) {
    if (!competitionId || !currentRanchId) {
      return;
    }

    var confirmed = window.confirm("האם למחוק את המקצה?");

    if (!confirmed) {
      return;
    }

    try {
      await deleteClassInCompetition(item.classInCompId, competitionId, currentRanchId);
      showToast("success", "המקצה נמחק בהצלחה");
      await loadClassesSectionData(competitionId, currentRanchId);
    } catch (error) {
      console.error(error);
      showToast("error", error.response?.data || "שגיאה במחיקת המקצה");
    }
  }

  function openCreatePaidTimeModal() {
    setEditPaidTimeItem(null);
    setPaidTimeModalError("");
    setPaidTimeModalOpen(true);
  }

  function openEditPaidTimeModal(item) {
    setEditPaidTimeItem(item);
    setPaidTimeModalError("");
    setPaidTimeModalOpen(true);
  }

  function closePaidTimeModal() {
    setPaidTimeModalOpen(false);
    setEditPaidTimeItem(null);
    setPaidTimeModalError("");
  }

  async function handleSubmitPaidTime(formData) {
    if (!competitionId || !currentRanchId) {
      setPaidTimeModalError("יש לשמור קודם את התחרות");
      return;
    }

    try {
      setSavingPaidTime(true);
      setPaidTimeModalError("");

      if (editPaidTimeItem) {
        await updatePaidTimeSlotInCompetition(editPaidTimeItem.compSlotId, {
          compSlotId: editPaidTimeItem.compSlotId,
          competitionId: competitionId,
          hostRanchId: currentRanchId,
          paidTimeSlotId: formData.paidTimeSlotId,
          arenaRanchId: currentRanchId,
          arenaId: formData.arenaId,
          slotDate: formData.slotDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          slotStatus: formData.slotStatus,
          slotNotes: formData.slotNotes,
        });

        showToast("success", "סלוט הפייד־טיים עודכן בהצלחה");
      } else {
        await createPaidTimeSlotInCompetition({
          competitionId: competitionId,
          hostRanchId: currentRanchId,
          paidTimeSlotId: formData.paidTimeSlotId,
          arenaRanchId: currentRanchId,
          arenaId: formData.arenaId,
          slotDate: formData.slotDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          slotStatus: formData.slotStatus,
          slotNotes: formData.slotNotes,
        });

        showToast("success", "סלוט הפייד־טיים נוסף בהצלחה");
      }

      closePaidTimeModal();
      await loadPaidTimeSectionData(competitionId, currentRanchId);
    } catch (error) {
      console.error(error);
      setPaidTimeModalError(error.response?.data || "שגיאה בשמירת סלוט הפייד־טיים");
    } finally {
      setSavingPaidTime(false);
    }
  }

  async function handleDeletePaidTime(item) {
    if (!competitionId || !currentRanchId) {
      return;
    }

    var confirmed = window.confirm("האם למחוק את סלוט הפייד־טיים?");

    if (!confirmed) {
      return;
    }

    try {
      await deletePaidTimeSlotInCompetition(item.compSlotId, competitionId, currentRanchId, false);
      showToast("success", "סלוט הפייד־טיים נמחק בהצלחה");
      await loadPaidTimeSectionData(competitionId, currentRanchId);
    } catch (error) {
      console.error(error);
      showToast("error", error.response?.data || "שגיאה במחיקת סלוט הפייד־טיים");
    }
  }

  if (!activeRole) {
    return null;
  }

  return (
    <AppLayout
      userName={userName}
      subtitle={subtitle}
      menuItems={secretaryGeneralMenu}
      activeItemKey="competitions-board"
      onNavigate={function (itemKey) {
        if (itemKey === "competitions-board") {
          navigate("/competitions");
          return;
        }

        showToast("info", "המסך יתחבר בהמשך");
      }}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={function () {
              navigate("/competitions");
            }}
            className="rounded-xl border border-[#BCAAA4] px-5 py-3 font-semibold text-[#6D4C41] transition-colors hover:bg-[#F8F5F2]"
          >
            חזרה ללוח תחרויות
          </button>

          <h1 className="text-[2.2rem] font-bold text-[#3F312B]">
            {competitionId ? "עריכת תחרות" : "הקמת תחרות"}
          </h1>
        </div>

        <SectionCard
          title="1. פרטי תחרות"
          isOpen={sectionsOpen.details}
          onToggle={function () {
            toggleSection("details");
          }}
          statusText={competitionId ? "נשמר" : "לא נשמר"}
        >
          {loadingPage ? (
            <div className="text-right text-[#6D4C41]">טוען נתונים...</div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E4D8D1] bg-[#FCFAF8] p-5">
                <div className="flex items-center gap-3">
                  <StatusBadge status={currentStatus} />
                  <span className="text-sm text-[#6D4C41]">סטטוס נוכחי של התחרות</span>
                </div>

                {competitionId ? (
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-semibold text-[#6D4C41]">
                      מצב ידני
                    </label>

                    <select
                      value={manualStatusAction}
                      onChange={function (e) {
                        setManualStatusAction(e.target.value);
                      }}
                      className="h-10 rounded-xl border border-[#D7CCC8] bg-white px-3 text-[#3E2723]"
                    >
                      <option value="none">חישוב אוטומטי</option>
                      <option value="cancelled">בוטלה</option>
                      <option value="draft">טיוטה</option>
                    </select>
                  </div>
                ) : (
                  <div className="text-sm text-[#8B6352]">תחרות חדשה תישמר כטיוטה</div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                    שם תחרות
                  </label>
                  <input
                    type="text"
                    value={detailsForm.competitionName}
                    onChange={function (e) {
                      handleDetailsChange("competitionName", e.target.value);
                    }}
                    className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                    ענף
                  </label>
                  <select
                    value={detailsForm.fieldId}
                    onChange={function (e) {
                      handleDetailsChange("fieldId", e.target.value);
                    }}
                    className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                  >
                    <option value="">בחרי ענף</option>
                    {fields.map(function (field) {
                      return (
                        <option key={field.fieldId} value={field.fieldId}>
                          {field.fieldName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                    תאריך התחלה
                  </label>
                  <input
                    type="date"
                    value={detailsForm.competitionStartDate}
                    onChange={function (e) {
                      handleDetailsChange("competitionStartDate", e.target.value);
                    }}
                    className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                    תאריך סיום
                  </label>
                  <input
                    type="date"
                    value={detailsForm.competitionEndDate}
                    onChange={function (e) {
                      handleDetailsChange("competitionEndDate", e.target.value);
                    }}
                    className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                    פתיחת הרשמה
                  </label>
                  <input
                    type="date"
                    value={detailsForm.registrationOpenDate}
                    onChange={function (e) {
                      handleDetailsChange("registrationOpenDate", e.target.value);
                    }}
                    className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                    סגירת הרשמה
                  </label>
                  <input
                    type="date"
                    value={detailsForm.registrationEndDate}
                    onChange={function (e) {
                      handleDetailsChange("registrationEndDate", e.target.value);
                    }}
                    className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                    פתיחת הרשמת פייד־טיים
                  </label>
                  <input
                    type="date"
                    value={detailsForm.paidTimeRegistrationDate}
                    onChange={function (e) {
                      handleDetailsChange("paidTimeRegistrationDate", e.target.value);
                    }}
                    className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                    פרסום לו״ז פייד־טיים
                  </label>
                  <input
                    type="date"
                    value={detailsForm.paidTimePublicationDate}
                    onChange={function (e) {
                      handleDetailsChange("paidTimePublicationDate", e.target.value);
                    }}
                    className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
                    הערות
                  </label>
                  <textarea
                    rows={4}
                    value={detailsForm.notes}
                    onChange={function (e) {
                      handleDetailsChange("notes", e.target.value);
                    }}
                    className="w-full rounded-xl border border-[#D7CCC8] bg-white px-4 py-3 text-right"
                  />
                </div>

                <div className="md:col-span-2 flex justify-start">
                  <button
                    type="button"
                    onClick={handleSaveDetails}
                    disabled={savingDetails}
                    className="rounded-xl bg-[#8B6352] px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#7A5547] disabled:opacity-70"
                  >
                    {savingDetails ? "שומר..." : "שמור"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="2. מקצים"
          isOpen={sectionsOpen.classes}
          onToggle={function () {
            toggleSection("classes");
          }}
          statusText={competitionId ? "זמין" : "לא נשמר"}
        >
          <ClassesInCompetitionSection
            competitionId={competitionId}
            items={classesInCompetition}
            loading={loadingClasses}
            classTypes={classTypes}
            judges={judges}
            arenas={arenas}
            onAdd={openCreateClassModal}
            onEdit={openEditClassModal}
            onDelete={handleDeleteClass}
          />
        </SectionCard>

        <SectionCard
          title="3. פייד־טיים"
          isOpen={sectionsOpen.paidTime}
          onToggle={function () {
            toggleSection("paidTime");
          }}
          statusText={competitionId ? "זמין" : "לא נשמר"}
        >
          <PaidTimeSlotsInCompetitionSection
            competitionId={competitionId}
            items={paidTimeSlotsInCompetition}
            loading={loadingPaidTime}
            baseSlots={paidTimeBaseSlots}
            arenas={arenas}
            onAdd={openCreatePaidTimeModal}
            onEdit={openEditPaidTimeModal}
            onDelete={handleDeletePaidTime}
          />
        </SectionCard>
      </div>

      <ClassInCompetitionModal
        isOpen={classModalOpen}
        onClose={closeClassModal}
        onSubmit={handleSubmitClass}
        initialValue={editClassItem}
        classTypes={classTypes}
        arenas={arenas}
        error={classModalError}
        saving={savingClass}
      />

      <PaidTimeSlotInCompetitionModal
        isOpen={paidTimeModalOpen}
        onClose={closePaidTimeModal}
        onSubmit={handleSubmitPaidTime}
        initialValue={editPaidTimeItem}
        baseSlots={paidTimeBaseSlots}
        arenas={arenas}
        error={paidTimeModalError}
        saving={savingPaidTime}
      />

      <ToastMessage
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={closeToast}
      />
    </AppLayout>
  );
}