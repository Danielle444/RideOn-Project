import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CheckSquare, Eye, RefreshCw, Square, X } from "lucide-react";

import CompetitionWorkspaceLayout from "../../components/secretary/competition-workspace/CompetitionWorkspaceLayout";
import DataTableShell from "../../components/common/table/DataTableShell";
import DataTableEmptyState from "../../components/common/table/DataTableEmptyState";
import DataTableLoadingState from "../../components/common/table/DataTableLoadingState";
import TableActionButton from "../../components/common/table/TableActionButton";
import ToastMessage from "../../components/common/ToastMessage";
import PaidTimeRequestCard from "../../components/secretary/paid-time/PaidTimeRequestCard";
import PaidTimeScheduleCell from "../../components/secretary/paid-time/PaidTimeScheduleCell";
import useCompetitionPaidTimePage from "../../hooks/secretary/useCompetitionPaidTimePage";
import { useActiveRole } from "../../context/ActiveRoleContext";

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

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("he-IL");
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

  function renderSlotRows() {
    if (page.loadingSlots) {
      return (
        <DataTableLoadingState
          colSpan={page.assignmentMode ? 8 : 7}
          message="טוען סלוטי פייד־טיים..."
        />
      );
    }

    if (!page.slots || page.slots.length === 0) {
      return (
        <DataTableEmptyState
          colSpan={page.assignmentMode ? 8 : 7}
          message="לא הוגדרו סלוטים לפייד־טיים בתחרות זו"
        />
      );
    }

    return page.slots.map(function (slot) {
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

          <td className="px-4 py-3">
            <span className="rounded-full bg-[#F5EDE8] px-3 py-1 text-xs font-semibold text-[#7B5A4D]">
              {getSlotStatus(slot)}
            </span>
          </td>

          <td className="px-4 py-3">
            <div className="flex justify-end gap-2">
              <TableActionButton
                label="צפה בשיבוץ"
                icon={<Eye size={15} />}
                onClick={function () {
                  page.enterAssignmentMode(slotId);
                }}
              />
            </div>
          </td>
        </tr>
      );
    });
  }

  function getAssignmentForCell(timeCell) {
    return page.assignedRequests.find(function (request) {
      var assignedSlotId =
        request.assignedCompSlotId || request.AssignedCompSlotId;
      var assignedStartTime =
        request.assignedStartTime || request.AssignedStartTime;

      if (!assignedStartTime) {
        return false;
      }

      return (
        Number(assignedSlotId) === Number(timeCell.slotId) &&
        String(assignedStartTime).includes(timeCell.timeValue.substring(0, 5))
      );
    });
  }

  return (
    <CompetitionWorkspaceLayout activeItemKey="paid-time">
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#3F312B]">פייד־טיים</h1>
            <p className="text-sm text-[#8D6E63]">
              ניהול סלוטים ושיבוץ בקשות פייד־טיים עבור התחרות הפעילה
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {page.assignmentMode ? (
              <>
                <TableActionButton
                  label="טען בקשות"
                  icon={<RefreshCw size={15} />}
                  onClick={page.loadRequests}
                  disabled={page.selectedSlotIds.length === 0}
                  loading={page.loadingRequests}
                />

                <TableActionButton
                  label="סגור מצב שיבוץ"
                  icon={<X size={15} />}
                  variant="danger"
                  onClick={page.exitAssignmentMode}
                />
              </>
            ) : (
              <TableActionButton
                label="מצב שיבוץ"
                icon={<CheckSquare size={15} />}
                onClick={function () {
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

        <section className="rounded-3xl border border-[#EFE5DF] bg-[#FFFDFB] p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#3F312B]">
                סלוטים בתחרות
              </h2>
              <p className="text-xs text-[#8D6E63]">
                בחרי סלוט אחד או יותר כדי לשבץ בקשות ממתינות
              </p>
            </div>

            {page.assignmentMode ? (
              <label className="flex items-center gap-2 text-sm text-[#6B574F]">
                <input
                  type="checkbox"
                  checked={page.includeAllPending}
                  onChange={function (event) {
                    page.setIncludeAllPending(event.target.checked);
                  }}
                />
                הצג את כל הבקשות הממתינות בתחרות
              </label>
            ) : null}
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
                <th className="px-4 py-3">סטטוס</th>
                <th className="px-4 py-3">פעולות</th>
              </tr>
            </thead>

            <tbody>{renderSlotRows()}</tbody>
          </DataTableShell>
        </section>

        {page.assignmentMode ? (
          <DndContext
            sensors={sensors}
            onDragStart={page.handleDragStart}
            onDragEnd={page.handleDragEnd}
          >
            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_1fr]">
              <aside className="rounded-3xl border border-[#EFE5DF] bg-white p-4 shadow-sm">
                <div className="mb-3">
                  <h2 className="text-lg font-bold text-[#3F312B]">
                    בקשות ממתינות
                  </h2>
                  <p className="text-xs text-[#8D6E63]">
                    {page.pendingRequests.length} בקשות לגרירה
                  </p>
                </div>

                <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
                  {page.loadingRequests ? (
                    <p className="py-6 text-center text-sm text-[#8D6E63]">
                      טוען בקשות...
                    </p>
                  ) : null}

                  {!page.loadingRequests &&
                  page.pendingRequests.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[#BCAAA4]">
                      אין בקשות ממתינות להצגה
                    </p>
                  ) : null}

                  {page.pendingRequests.map(function (request) {
                    return (
                      <PaidTimeRequestCard
                        key={
                          request.paidTimeRequestId || request.PaidTimeRequestId
                        }
                        request={request}
                        disabled={page.savingAssignment}
                      />
                    );
                  })}
                </div>
              </aside>

              <div className="space-y-4">
                {page.selectedSlots.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-[#D7CCC8] bg-[#FAF5F1] p-8 text-center text-sm text-[#8D6E63]">
                    בחרי סלוט אחד או יותר מהטבלה כדי להתחיל שיבוץ
                  </div>
                ) : null}

                {page.selectedSlots.map(function (slot) {
                  var slotId = getSlotId(slot);
                  var timeCells = page.buildTimeCellsForSlot(slot);

                  return (
                    <div
                      key={slotId}
                      className="rounded-3xl border border-[#EFE5DF] bg-[#FFFDFB] p-4 shadow-sm"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base font-bold text-[#3F312B]">
                            {formatDate(getSlotDate(slot))} |{" "}
                            {formatTime(getSlotStartTime(slot))}–
                            {formatTime(getSlotEndTime(slot))}
                          </h3>
                          <p className="text-xs text-[#8D6E63]">
                            {getSlotArenaName(slot)} • {getSlotTimeOfDay(slot)}
                          </p>
                        </div>

                        <span className="rounded-full bg-[#F5EDE8] px-3 py-1 text-xs font-semibold text-[#7B5A4D]">
                          {page.getAssignedRequestsForSlot(slotId).length}{" "}
                          משובצים
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
                        {timeCells.map(function (timeCell) {
                          var assignment = getAssignmentForCell(timeCell);

                          return (
                            <PaidTimeScheduleCell
                              key={timeCell.slotId + "-" + timeCell.timeValue}
                              timeCell={timeCell}
                              assignment={assignment}
                              onUnassign={page.handleUnassignRequest}
                            />
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
        ) : null}
      </div>

      <ToastMessage
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={closeToast}
      />
    </CompetitionWorkspaceLayout>
  );
}
