import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import secretaryGeneralMenu from "../../components/secretary/secretaryGeneralMenu";
import CompetitionsSearchBar from "../../components/secretary/CompetitionsSearchBar";
import CompetitionsTable from "../../components/secretary/CompetitionsTable";
import ToastMessage from "../../components/common/ToastMessage";
import { useUser } from "../../context/UserContext";
import { useActiveRole } from "../../context/ActiveRoleContext";
import { getCompetitionsByHostRanch } from "../../services/competitionService";
import { getErrorMessage } from "../../utils/competitionForm.utils";

export default function CompetitionsBoardPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { activeRole } = useActiveRole();

  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [sortConfig, setSortConfig] = useState({
    key: "competitionStartDate",
    direction: "desc",
  });

  const [statusFilter, setStatusFilter] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");

  const [toast, setToast] = useState({
    isOpen: false,
    type: "success",
    message: "",
  });

  const userName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  const subtitle =
    [activeRole?.roleName, activeRole?.ranchName].filter(Boolean).join(" · ") ||
    "לא נבחר תפקיד וחווה";

  const currentRanchId = useMemo(
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

      loadCompetitions({
        search: "",
        from: "",
        to: "",
      });
    },
    [currentRanchId],
  );

  async function loadCompetitions(custom) {
    if (!currentRanchId) {
      showToast("error", "לא נבחרה חווה פעילה");
      return;
    }

    const effectiveSearch = custom?.search ?? searchText;
    const effectiveDateFrom = custom?.from ?? dateFrom;
    const effectiveDateTo = custom?.to ?? dateTo;

    try {
      setLoading(true);

      const response = await getCompetitionsByHostRanch({
        ranchId: currentRanchId,
        searchText: effectiveSearch.trim() || null,
        status: null,
        fieldId: null,
        dateFrom: effectiveDateFrom || null,
        dateTo: effectiveDateTo || null,
      });

      setCompetitions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setCompetitions([]);
      showToast("error", getErrorMessage(error, "שגיאה בטעינת התחרויות"));
    } finally {
      setLoading(false);
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

  function handleSearch() {
    loadCompetitions({
      search: searchText,
      from: dateFrom,
      to: dateTo,
    });
  }

  function handleResetSearch() {
    setSearchText("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("");
    setFieldFilter("");
    setSortConfig({
      key: "competitionStartDate",
      direction: "desc",
    });

    loadCompetitions({
      search: "",
      from: "",
      to: "",
    });
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

  function handleEnterCompetition(item) {
    navigate(`/competitions/${item.competitionId}/edit`);
  }

  function handleEditCompetition(item) {
    navigate(`/competitions/${item.competitionId}/edit`);
  }

  function handleCreateCompetition() {
    navigate("/competitions/create");
  }

  const statusOptions = useMemo(
    function () {
      const values = competitions
        .map(function (item) {
          return item.competitionStatus;
        })
        .filter(Boolean);

      return Array.from(new Set(values));
    },
    [competitions],
  );

  const fieldOptions = useMemo(
    function () {
      const map = new Map();

      competitions.forEach(function (item) {
        if (item.fieldId && item.fieldName && !map.has(item.fieldId)) {
          map.set(item.fieldId, {
            fieldId: item.fieldId,
            fieldName: item.fieldName,
          });
        }
      });

      return Array.from(map.values());
    },
    [competitions],
  );

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
    >
      <div className="overflow-hidden rounded-[28px] border border-[#E6DCD5] bg-white shadow-sm">
        <div className="border-b border-[#EFE5DF] px-8 py-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-[2rem] font-bold text-[#3F312B]">
              לוח תחרויות
            </h1>

            <button
              type="button"
              onClick={handleCreateCompetition}
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
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
          </div>
        </div>

        <div className="px-6 py-6">
          <CompetitionsTable
            competitions={filteredAndSortedCompetitions}
            loading={loading}
            onEnter={handleEnterCompetition}
            onEdit={handleEditCompetition}
            onSort={handleSort}
            sortKey={sortConfig.key}
            sortDirection={sortConfig.direction}
            statusOptions={statusOptions}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            fieldOptions={fieldOptions}
            fieldFilter={fieldFilter}
            onFieldFilterChange={setFieldFilter}
          />
        </div>
      </div>

      <ToastMessage
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={closeToast}
      />
    </AppLayout>
  );
}