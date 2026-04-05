import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import secretaryGeneralMenu from "../../components/secretary/secretaryGeneralMenu";
import CompetitionsSearchBar from "../../components/secretary/CompetitionsSearchBar";
import CompetitionsTable from "../../components/secretary/CompetitionsTable";
import CompetitionModal from "../../components/secretary/CompetitionModal";
import ToastMessage from "../../components/common/ToastMessage";
import { useUser } from "../../context/UserContext";
import { useActiveRole } from "../../context/ActiveRoleContext";
import {
  getCompetitionsByHostRanch,
  getCompetitionById,
  createCompetition,
  updateCompetition,
} from "../../services/competitionService";
import { getAllFields } from "../../services/superUserService";

export default function CompetitionsBoardPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { activeRole } = useActiveRole();

  const [competitions, setCompetitions] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [sortConfig, setSortConfig] = useState({
    key: "competitionStartDate",
    direction: "desc",
  });

  const [statusFilter, setStatusFilter] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editCompetition, setEditCompetition] = useState(null);
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({
    isOpen: false,
    type: "success",
    message: "",
  });

  const userName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  const subtitle =
    [activeRole?.roleName, activeRole?.ranchName].filter(Boolean).join(" · ") ||
    "לא נבחר תפקיד וחווה";

  const currentRanchId = useMemo(function () {
    return activeRole?.ranchId || null;
  }, [activeRole]);

  useEffect(
    function () {
      if (!currentRanchId) {
        return;
      }

      loadCompetitions("");
      loadFields();
    },
    [currentRanchId],
  );

  async function loadCompetitions(searchValue) {
    if (!currentRanchId) {
      showToast("error", "לא נבחרה חווה פעילה");
      return;
    }

    try {
      setLoading(true);

      const response = await getCompetitionsByHostRanch({
        ranchId: currentRanchId,
        searchText: searchValue || null,
        status: null,
        fieldId: null,
        dateFrom: null,
        dateTo: null,
      });

      setCompetitions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setCompetitions([]);
      showToast("error", error.response?.data || "שגיאה בטעינת התחרויות");
    } finally {
      setLoading(false);
    }
  }

  async function loadFields() {
    try {
      const response = await getAllFields();
      setFields(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setFields([]);
      showToast("error", error.response?.data || "שגיאה בטעינת הענפים");
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

  function handleGeneralNavigate(itemKey) {
    if (itemKey === "competitions-board") {
      navigate("/competitions");
      return;
    }

    showToast("info", "המסך יתחבר בהמשך");
  }

  function handleSearch() {
    loadCompetitions(searchText.trim());
  }

  function handleResetSearch() {
    setSearchText("");
    setStatusFilter("");
    setFieldFilter("");
    setSortConfig({
      key: "competitionStartDate",
      direction: "desc",
    });
    loadCompetitions("");
  }

  function handleSort(columnKey) {
    setSortConfig(function (prev) {
      if (prev.key !== columnKey) {
        return {
          key: columnKey,
          direction: "asc",
        };
      }

      if (prev.direction === "asc") {
        return {
          key: columnKey,
          direction: "desc",
        };
      }

      return {
        key: "competitionStartDate",
        direction: "desc",
      };
    });
  }

  function openCreateModal() {
    setEditCompetition(null);
    setModalError("");
    setModalOpen(true);
  }

  async function openEditModal(item) {
    if (!currentRanchId) {
      return;
    }

    try {
      setModalError("");

      const response = await getCompetitionById(item.competitionId, currentRanchId);
      setEditCompetition(response.data || null);
      setModalOpen(true);
    } catch (error) {
      console.error(error);
      showToast("error", error.response?.data || "שגיאה בטעינת פרטי התחרות");
    }
  }

  function closeModal() {
    setModalOpen(false);
    setEditCompetition(null);
    setModalError("");
  }

  async function handleSubmitCompetition(formData) {
    if (!currentRanchId) {
      setModalError("לא נבחרה חווה פעילה");
      return;
    }

    try {
      setSaving(true);
      setModalError("");

      if (editCompetition) {
        await updateCompetition(editCompetition.competitionId, {
          competitionId: editCompetition.competitionId,
          hostRanchId: currentRanchId,
          fieldId: formData.fieldId,
          competitionName: formData.competitionName,
          competitionStartDate: formData.competitionStartDate,
          competitionEndDate: formData.competitionEndDate,
          registrationOpenDate: formData.registrationOpenDate,
          registrationEndDate: formData.registrationEndDate,
          paidTimeRegistrationDate: formData.paidTimeRegistrationDate,
          paidTimePublicationDate: formData.paidTimePublicationDate,
          competitionStatus: formData.competitionStatus,
          notes: formData.notes,
        });

        showToast("success", "התחרות עודכנה בהצלחה");
      } else {
        await createCompetition({
          hostRanchId: currentRanchId,
          fieldId: formData.fieldId,
          competitionName: formData.competitionName,
          competitionStartDate: formData.competitionStartDate,
          competitionEndDate: formData.competitionEndDate,
          registrationOpenDate: formData.registrationOpenDate,
          registrationEndDate: formData.registrationEndDate,
          paidTimeRegistrationDate: formData.paidTimeRegistrationDate,
          paidTimePublicationDate: formData.paidTimePublicationDate,
          competitionStatus: formData.competitionStatus,
          notes: formData.notes,
        });

        showToast("success", "התחרות נפתחה בהצלחה");
      }

      closeModal();
      await loadCompetitions(searchText.trim());
    } catch (error) {
      console.error(error);
      setModalError(error.response?.data || "שגיאה בשמירת התחרות");
    } finally {
      setSaving(false);
    }
  }

  function handleEnterCompetition(item) {
    navigate(`/competitions/${item.competitionId}`);
  }

  const statusOptions = useMemo(function () {
    const uniqueStatuses = competitions
      .map(function (item) {
        return item.competitionStatus;
      })
      .filter(Boolean);

    return Array.from(new Set(uniqueStatuses));
  }, [competitions]);

  const filteredAndSortedCompetitions = useMemo(
    function () {
      let result = Array.isArray(competitions) ? [...competitions] : [];

      if (statusFilter) {
        result = result.filter(function (item) {
          return item.competitionStatus === statusFilter;
        });
      }

      if (fieldFilter) {
        result = result.filter(function (item) {
          return String(item.fieldId) === String(fieldFilter);
        });
      }

      result.sort(function (a, b) {
        const key = sortConfig.key;
        const direction = sortConfig.direction === "asc" ? 1 : -1;

        let aValue = a[key];
        let bValue = b[key];

        if (key === "competitionStartDate") {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
        } else {
          aValue = (aValue || "").toString().toLowerCase();
          bValue = (bValue || "").toString().toLowerCase();
        }

        if (aValue < bValue) {
          return -1 * direction;
        }

        if (aValue > bValue) {
          return 1 * direction;
        }

        return 0;
      });

      return result;
    },
    [competitions, statusFilter, fieldFilter, sortConfig],
  );

  if (!activeRole) {
    return null;
  }

  return (
    <AppLayout
      userName={userName}
      subtitle={subtitle}
      menuItems={secretaryGeneralMenu}
      activeItemKey="competitions-board"
      onNavigate={handleGeneralNavigate}
    >
      <div className="rounded-[28px] border border-[#E6DCD5] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#EFE5DF] px-8 py-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-[2rem] font-bold text-[#3F312B]">לוח תחרויות</h1>

            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-xl bg-[#8B6352] px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#7A5547]"
            >
              + פתיחת תחרות חדשה
            </button>
          </div>

          <div className="mt-6">
            <CompetitionsSearchBar
              value={searchText}
              onChange={setSearchText}
              onSearch={handleSearch}
              onReset={handleResetSearch}
            />
          </div>
        </div>

        <div className="px-6 py-6">
          <CompetitionsTable
            competitions={filteredAndSortedCompetitions}
            loading={loading}
            onEnter={handleEnterCompetition}
            onEdit={openEditModal}
            onSort={handleSort}
            sortKey={sortConfig.key}
            sortDirection={sortConfig.direction}
            statusOptions={statusOptions}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            fieldOptions={fields}
            fieldFilter={fieldFilter}
            onFieldFilterChange={setFieldFilter}
          />
        </div>
      </div>

      <CompetitionModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={handleSubmitCompetition}
        initialValue={editCompetition}
        fields={fields}
        error={modalError}
        saving={saving}
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