import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  CheckSquare,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Square,
  Trash2,
  X,
} from "lucide-react";

import CompetitionWorkspaceLayout from "../../components/secretary/competition-workspace/CompetitionWorkspaceLayout";
import DataTableShell from "../../components/common/table/DataTableShell";
import DataTableEmptyState from "../../components/common/table/DataTableEmptyState";
import DataTableLoadingState from "../../components/common/table/DataTableLoadingState";
import TableActionButton from "../../components/common/table/TableActionButton";
import ToastMessage from "../../components/common/ToastMessage";
import PaidTimeRequestCard from "../../components/secretary/paid-time/PaidTimeRequestCard";
import PaidTimeScheduleCell from "../../components/secretary/paid-time/PaidTimeScheduleCell";
import PaidTimeSlotInCompetitionModal from "../../components/secretary/PaidTimeSlotInCompetitionModal";
import useCompetitionPaidTimePage from "../../hooks/secretary/useCompetitionPaidTimePage";
import { useActiveRole } from "../../context/ActiveRoleContext";
import CustomDropdown from "../../components/common/CustomDropdown";

function getSlotId(slot) {
  return slot.paidTimeSlotInCompId || slot.PaidTimeSlotInCompId;
}

function getSlotDate(slot) {
  return slot.slotDate || slot.SlotDate;
}

function getSlotStartTime(slot) {
  return slot.startTime || slot.StartTime;
}

function getSlotEndTime(slot) {
  return slot.endTime || slot.EndTime;
}

function getSlotTimeOfDay(slot) {
  return slot.timeOfDay || slot.TimeOfDay || "";
}

function getSlotArenaName(slot) {
  return slot.arenaName || slot.ArenaName || "";
}

function getSlotStatus(slot) {
  return slot.slotStatus || slot.SlotStatus || "לא פורסם";
}

function getAssignedCount(slot) {
  return Number(slot.assignedCount || slot.AssignedCount || 0);
}

function getAvailablePlaces(slot) {
  return Number(
    slot.estimatedAvailablePlaces || slot.EstimatedAvailablePlaces || 0,
  );
}

function getPendingRequestsCount(slot) {
  return Number(slot.pendingRequestsCount || slot.PendingRequestsCount || 0);
}

function getCoachName(request) {
  return request.coachName || request.CoachName || "";
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("he-IL");
}

function getDayName(value) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("he-IL", {
    weekday: "long",
  });
}

function formatTime(value) {
  if (!value) {
    return "-";
  }

  return String(value).substring(0, 5);
}

export default function CompetitionPaidTimePage() {
  const { competitionId } = useParams();
  const { activeRole } = useActiveRole();
  const ranchId = activeRole?.ranchId || null;

  const [toast, setToast] = useState({
    isOpen: false,
    type: "success",
    message: "",
  });

  const [selectedDate, setSelectedDate] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [selectedCoach, setSelectedCoach] = useState("");
  const [openDropdownKey, setOpenDropdownKey] = useState("");

  const page = useCompetitionPaidTimePage({
    competitionId: Number(competitionId),
    ranchId: ranchId,
    onShowToast: showToast,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const uniqueDates = useMemo(
    function () {
      var dates = [];

      page.slots.forEach(function (slot) {
        var date = getSlotDate(slot);

        if (date && !dates.includes(date)) {
          dates.push(date);
        }
      });

      return dates.sort();
    },
    [page.slots],
  );

  const visibleSlots = useMemo(
    function () {
      var filtered = page.slots.filter(function (slot) {
        return !selectedDate || getSlotDate(slot) === selectedDate;
      });

      return [...filtered].sort(function (a, b) {
        if (sortBy === "free") {
          return getAvailablePlaces(b) - getAvailablePlaces(a);
        }

        if (sortBy === "assigned") {
          return getAssignedCount(b) - getAssignedCount(a);
        }

        if (sortBy === "pending") {
          return getPendingRequestsCount(b) - getPendingRequestsCount(a);
        }

        if (sortBy === "time") {
          var aTime = String(getSlotStartTime(a) || "");
          var bTime = String(getSlotStartTime(b) || "");

          if (aTime !== bTime) {
            return aTime.localeCompare(bTime);
          }

          return String(getSlotDate(a) || "").localeCompare(
            String(getSlotDate(b) || ""),
          );
        }

        var aDate = String(getSlotDate(a) || "");
        var bDate = String(getSlotDate(b) || "");

        if (aDate !== bDate) {
          return aDate.localeCompare(bDate);
        }

        return String(getSlotStartTime(a) || "").localeCompare(
          String(getSlotStartTime(b) || ""),
        );
      });
    },
    [page.slots, selectedDate, sortBy],
  );

  const coachOptions = useMemo(
    function () {
      var names = [];

      page.requests.forEach(function (request) {
        var coachName = getCoachName(request);

        if (coachName && !names.includes(coachName)) {
          names.push(coachName);
        }
      });

      return names.sort();
    },
    [page.requests],
  );

  const filteredPendingRequests = useMemo(
    function () {
      if (!selectedCoach) {
        return page.pendingRequests;
      }

      return page.pendingRequests.filter(function (request) {
        return getCoachName(request) === selectedCoach;
      });
    },
    [page.pendingRequests, selectedCoach],
  );

  function showToast(type, message) {
    setToast({
      isOpen: true,
      type: type,
      message: message,
    });
  }

  function closeToast() {
    setToast(function (prev) {
      return {
        ...prev,
        isOpen: false,
      };
    });
  }

  function renderCapacityBadge(slot) {
    var availablePlaces = getAvailablePlaces(slot);
    var pendingRequestsCount = getPendingRequestsCount(slot);

    return (
      <div className="flex flex-col gap-1">
        <span className="w-fit rounded-full bg-[#EEF8F0] px-3 py-1 text-xs font-semibold text-[#2F6B3B]">
          {availablePlaces} מקומות פנויים
        </span>

        <span className="text-xs text-[#8D6E63]">
          {pendingRequestsCount} בקשות ממתינות
        </span>
      </div>
    );
  }

  function renderSlotRows() {
    if (page.loadingSlots) {
      return (
        <DataTableLoadingState
          colSpan={page.assignmentMode ? 10 : 9}
          message="טוען סלוטי פייד־טיים..."
        />
      );
    }

    if (!visibleSlots || visibleSlots.length === 0) {
      return (
        <DataTableEmptyState
          colSpan={page.assignmentMode ? 10 : 9}
          message="לא נמצאו סלוטים להצגה"
        />
      );
    }

    return visibleSlots.map(function (slot) {
      var slotId = getSlotId(slot);
      var isSelected = page.selectedSlotIds.includes(slotId);

      return (
        <tr
          key={slotId}
          className="border-t border-[#F1E7E1] text-sm text-[#4A3A34]"
        >
          {page.assignmentMode ? (
            <td className="px-4 py-3">
              <button
                type="button"
                onClick={function () {
                  page.toggleSlotSelection(slotId);
                }}
                className="flex items-center justify-center text-[#7B5A4D]"
              >
                {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
              </button>
            </td>
          ) : null}

          <td className="px-4 py-3 font-semibold">
            {formatDate(getSlotDate(slot))}
          </td>

          <td className="px-4 py-3">{getSlotTimeOfDay(slot)}</td>
          <td className="px-4 py-3">{formatTime(getSlotStartTime(slot))}</td>
          <td className="px-4 py-3">{formatTime(getSlotEndTime(slot))}</td>
          <td className="px-4 py-3">{getSlotArenaName(slot)}</td>

          <td className="px-4 py-3">{renderCapacityBadge(slot)}</td>

          <td className="px-4 py-3">
            <span className="rounded-full bg-[#F5EDE8] px-3 py-1 text-xs font-semibold text-[#7B5A4D]">
              {getSlotStatus(slot)}
            </span>
          </td>

          <td className="px-4 py-3">
            <div className="flex flex-wrap justify-end gap-2">
              <TableActionButton
                label="צפה בשיבוץ"
                icon={<Eye size={15} />}
                onClick={function () {
                  setSelectedCoach("");
                  page.openAssignmentForSlot(slotId);
                }}
              />

              {!page.assignmentMode ? (
                <>
                  <TableActionButton
                    icon={<Pencil size={15} />}
                    iconOnly
                    title="עריכת סלוט"
                    onClick={function () {
                      page.openEditPaidTimeSlotModal(slot);
                    }}
                  />

                  <TableActionButton
                    icon={<Trash2 size={15} />}
                    iconOnly
                    title="מחיקת סלוט"
                    variant="danger"
                    onClick={function () {
                      page.handleDeletePaidTimeSlot(slot);
                    }}
                  />
                </>
              ) : null}
            </div>
          </td>
        </tr>
      );
    });
  }

  function renderSlotsView() {
    return (
      <section className="rounded-3xl border border-[#EFE5DF] bg-[#FFFDFB] p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#3F312B]">סלוטים בתחרות</h2>
            <p className="text-xs text-[#8D6E63]">
              בחרי סלוט אחד או יותר כדי לשבץ בקשות ממתינות
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-40">
              <CustomDropdown
                dropdownKey="date-filter"
                openDropdownKey={openDropdownKey}
                setOpenDropdownKey={setOpenDropdownKey}
                value={selectedDate}
                onChange={function (event) {
                  setSelectedDate(event.target.value);
                }}
                options={[
                  { value: "", label: "כל הימים" },
                  ...uniqueDates.map(function (date) {
                    return {
                      value: date,
                      label: getDayName(date) + " (" + formatDate(date) + ")",
                    };
                  }),
                ]}
                getOptionValue={function (option) {
                  return option.value;
                }}
                getOptionLabel={function (option) {
                  return option.label;
                }}
                placeholder="כל הימים"
                searchable={false}
              />
            </div>

            <div className="w-44">
              <CustomDropdown
                dropdownKey="slot-sort"
                openDropdownKey={openDropdownKey}
                setOpenDropdownKey={setOpenDropdownKey}
                value={sortBy}
                onChange={function (event) {
                  setSortBy(event.target.value);
                }}
                options={[
                  { value: "date", label: "מיון לפי תאריך" },
                  { value: "time", label: "מיון לפי שעה" },
                  { value: "free", label: "מיון לפי פנויים" },
                  { value: "pending", label: "מיון לפי ממתינות" },
                  { value: "assigned", label: "מיון לפי משובצים" },
                ]}
                getOptionValue={function (option) {
                  return option.value;
                }}
                getOptionLabel={function (option) {
                  return option.label;
                }}
                placeholder="מיון לפי"
                searchable={false}
              />
            </div>

            {!page.assignmentMode ? (
              <TableActionButton
                label="הוספת סלוט"
                icon={<Plus size={15} />}
                variant="success"
                onClick={page.openCreatePaidTimeSlotModal}
              />
            ) : null}

            {page.assignmentMode ? (
              <TableActionButton
                label="פתח שיבוץ לסלוטים שנבחרו"
                icon={<CheckSquare size={15} />}
                onClick={page.loadRequests}
                disabled={page.selectedSlotIds.length === 0}
                loading={page.loadingRequests}
              />
            ) : null}
          </div>
        </div>

        <DataTableShell>
          <thead className="bg-[#FAF5F1] text-sm text-[#6B574F]">
            <tr>
              {page.assignmentMode ? (
                <th className="px-4 py-3">בחירה</th>
              ) : null}
              <th className="px-4 py-3">תאריך</th>
              <th className="px-4 py-3">זמן ביום</th>
              <th className="px-4 py-3">התחלה</th>
              <th className="px-4 py-3">סיום</th>
              <th className="px-4 py-3">מגרש</th>
              <th className="px-4 py-3">קיבולת</th>
              <th className="px-4 py-3">סטטוס</th>
              <th className="px-4 py-3">פעולות</th>
            </tr>
          </thead>

          <tbody>{renderSlotRows()}</tbody>
        </DataTableShell>
      </section>
    );
  }

  function renderAssignmentView() {
    return (
      <DndContext
        sensors={sensors}
        onDragStart={page.handleDragStart}
        onDragEnd={page.handleDragEnd}
      >
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[330px_1fr]">
          <aside className="rounded-3xl border border-[#EFE5DF] bg-white p-4 shadow-sm xl:sticky xl:top-6 xl:max-h-[78vh]">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-[#3F312B]">
                  בקשות ממתינות
                </h2>
                <p className="text-xs text-[#8D6E63]">
                  {filteredPendingRequests.length} בקשות לגרירה
                </p>
              </div>

              <TableActionButton
                icon={<RefreshCw size={15} />}
                iconOnly
                title="רענון בקשות"
                onClick={page.loadRequests}
                loading={page.loadingRequests}
              />
            </div>

            <label className="mb-3 flex items-center gap-2 rounded-2xl bg-[#FAF5F1] px-3 py-2 text-xs text-[#6B574F]">
              <input
                type="checkbox"
                checked={page.includeAllPending}
                onChange={function (event) {
                  page.handleIncludeAllPendingChange(event.target.checked);
                }}
              />
              הצג את כל הבקשות הממתינות באותו יום
            </label>

            <CustomDropdown
              dropdownKey="coach-filter"
              openDropdownKey={openDropdownKey}
              setOpenDropdownKey={setOpenDropdownKey}
              value={selectedCoach}
              onChange={function (event) {
                setSelectedCoach(event.target.value);
              }}
              options={[
                { value: "", label: "כל המאמנים" },
                ...coachOptions.map(function (coachName) {
                  return { value: coachName, label: coachName };
                }),
              ]}
              getOptionValue={function (option) {
                return option.value;
              }}
              getOptionLabel={function (option) {
                return option.label;
              }}
              placeholder="סינון לפי מאמן"
              searchable={true}
            />

            <div className="max-h-[62vh] space-y-3 overflow-y-auto pr-1">
              {page.loadingRequests ? (
                <p className="py-6 text-center text-sm text-[#8D6E63]">
                  טוען בקשות...
                </p>
              ) : null}

              {!page.loadingRequests && filteredPendingRequests.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#BCAAA4]">
                  אין בקשות ממתינות להצגה
                </p>
              ) : null}

              {filteredPendingRequests.map(function (request) {
                return (
                  <PaidTimeRequestCard
                    key={request.paidTimeRequestId || request.PaidTimeRequestId}
                    request={request}
                    disabled={page.savingAssignment}
                  />
                );
              })}
            </div>
          </aside>

          <div className="space-y-4">
            {page.selectedSlots.map(function (slot) {
              var slotId = getSlotId(slot);
              var assignedForSlot = page.getAssignedRequestsForSlot(slotId);
              var timeCells = page.buildTimeCellsForSlot(slot, assignedForSlot);

              return (
                <div
                  key={slotId}
                  className="rounded-3xl border border-[#EFE5DF] bg-[#FFFDFB] p-4 shadow-sm"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#EFE5DF] pb-3">
                    <div>
                      <h3 className="text-lg font-bold text-[#3F312B]">
                        {formatTime(getSlotStartTime(slot))}–
                        {formatTime(getSlotEndTime(slot))} |{" "}
                        {getDayName(getSlotDate(slot))}
                      </h3>
                      <p className="text-xs text-[#8D6E63]">
                        {getSlotArenaName(slot)} • {getSlotTimeOfDay(slot)}
                      </p>
                    </div>

                    <span className="rounded-full bg-[#F5EDE8] px-3 py-1 text-xs font-semibold text-[#7B5A4D]">
                      {assignedForSlot.length} משובצים
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-[#EFE5DF] bg-white">
                    {timeCells.map(function (timeCell) {
                      var assignment = timeCell.assignment;

                      return (
                        <div
                          key={timeCell.slotId + "-" + timeCell.assignedOrder}
                          className="grid grid-cols-[88px_1fr] border-b border-[#F3EAE4] last:border-b-0"
                        >
                          <div className="flex items-center justify-center bg-[#FAF5F1] text-sm font-bold text-[#7B5A4D]">
                            {timeCell.label}
                          </div>

                          <PaidTimeScheduleCell
                            timeCell={timeCell}
                            assignment={assignment}
                            onUnassign={page.handleUnassignRequest}
                            selectedCoach={selectedCoach}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <DragOverlay>
          {page.activeRequest ? (
            <div className="w-72">
              <PaidTimeRequestCard
                request={page.activeRequest}
                disabled={false}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  }

  return (
    <CompetitionWorkspaceLayout activeItemKey="paid-time">
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#3F312B]">פייד־טיים</h1>
            <p className="text-sm text-[#8D6E63]">
              {page.assignmentMode
                ? "גררי בקשות ממתינות אל תוך לו״ז הפייד־טיים"
                : "ניהול סלוטים ושיבוץ בקשות פייד־טיים עבור התחרות הפעילה"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {page.assignmentMode ? (
              <TableActionButton
                label="חזרה לרשימת סלוטים"
                icon={<X size={15} />}
                variant="danger"
                onClick={page.exitAssignmentMode}
              />
            ) : (
              <TableActionButton
                label="מצב שיבוץ"
                icon={<CheckSquare size={15} />}
                onClick={function () {
                  setSelectedCoach("");
                  page.enterAssignmentMode();
                }}
              />
            )}
          </div>
        </div>

        {page.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {page.error}
          </div>
        ) : null}

        {page.assignmentMode && !page.assignmentViewOpen ? (
          <>
            <div className="rounded-2xl border border-[#EFE5DF] bg-[#FAF5F1] px-4 py-3 text-sm text-[#7A655C]">
              בחרי סלוט אחד או יותר מהרשימה כדי לפתוח את מסך השיבוץ.
            </div>
            {renderSlotsView()}
          </>
        ) : page.assignmentMode ? (
          renderAssignmentView()
        ) : (
          renderSlotsView()
        )}
      </div>

      <PaidTimeSlotInCompetitionModal
        isOpen={page.paidTimeSlotModalOpen}
        initialValue={page.editPaidTimeSlotItem}
        baseSlots={page.baseSlots || []}
        arenas={page.arenas || []}
        saving={page.savingPaidTimeSlot}
        error={page.paidTimeSlotModalError}
        onClose={page.closePaidTimeSlotModal}
        onSubmit={page.handleSubmitPaidTimeSlot}
      />

      <ToastMessage
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={closeToast}
      />
    </CompetitionWorkspaceLayout>
  );
}
