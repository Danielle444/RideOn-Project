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
  ArrowRight,
  ClipboardList,
  Eye,
  EyeOff,
  MapPinned,
} from "lucide-react";

import CompetitionWorkspaceLayout from "../../components/secretary/competition-workspace/CompetitionWorkspaceLayout";
import ToastMessage from "../../components/common/ToastMessage";
import StallMapGrid from "../../components/secretary/stall-map/StallMapGrid";
import StallMapUploader from "../../components/secretary/stall-map/StallMapUploader";
import StallBookingsOverviewTable from "../../components/secretary/stall-map/StallBookingsOverviewTable";
import SecretaryCreateStallBookingModal from "../../components/secretary/stall-map/SecretaryCreateStallBookingModal";
import SecretaryUpdateStallBookingModal from "../../components/secretary/stall-map/SecretaryUpdateStallBookingModal";
import StallAssignmentSidebar from "../../components/secretary/stall-map/StallAssignmentSidebar";
import StallAssignmentRanchTabs from "../../components/secretary/stall-map/StallAssignmentRanchTabs";
import StallBookingLabel from "../../components/secretary/stall-map/StallBookingLabel";
import useCompetitionStallsPage from "../../hooks/secretary/useCompetitionStallsPage";
import { useActiveRole } from "../../context/ActiveRoleContext";
import { useUser } from "../../context/UserContext";

function formatPublishDate(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString("he-IL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

export default function CompetitionStallsPage() {
  const { competitionId } = useParams();
  const { activeRole } = useActiveRole();
  const { user } = useUser();

  const ranchId = activeRole?.ranchId || null;

  const page = useCompetitionStallsPage(Number(competitionId), ranchId);

  // Ranch-model fix: reuse the already-computed participating-ranch list
  // (page.ranchGroups) as the requesting-ranch options for a tack stall
  // booking, adding the host ranch itself as a fallback option if it is
  // not already one of the participating ranches.
  const ranchOptions = useMemo(
    function () {
      const options = page.ranchGroups.map(function (group) {
        return { ranchId: group.ranchId, ranchName: group.ranchName };
      });

      const hasHostRanch = options.some(function (option) {
        return option.ranchId === ranchId;
      });

      if (!hasHostRanch && ranchId) {
        options.push({
          ranchId: ranchId,
          ranchName: activeRole?.ranchName || "",
        });
      }

      return options;
    },
    [page.ranchGroups, ranchId, activeRole],
  );

  const [activeItem, setActiveItem] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  async function handleDeleteBooking(item) {
    try {
      await page.handleDeleteStallBooking(item.stallBookingId);
    } catch (err) {
      alert(String(err?.response?.data || err?.message || "שגיאה בביטול תא"));
    }
  }

  function handleEditBooking(item) {
    setEditTarget(item);
  }

  async function handleSubmitCreate(payload) {
    await page.handleCreateStallBookingForPayer(payload);
  }

  async function handleSubmitUpdate(stallBookingId, payload) {
    await page.handleUpdateStallBooking(stallBookingId, payload);
  }
  const [toast, setToast] = useState({
    isOpen: false,
    type: "success",
    message: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragStart(event) {
    const dragData = event.active.data.current || {};
    const item = dragData.item || dragData.assignment;

    if (item) {
      setActiveItem(item);
    }
  }

  async function handleDragEnd(event) {
    setActiveItem(null);

    const dragData = event.active.data.current || {};
    const item = dragData.item || dragData.assignment;
    const sourceCell = dragData.sourceCell || null;
    const cell = event.over?.data.current?.cell;

    if (!item || !cell || !cell.stallId) return;

    if (sourceCell && sourceCell.stallNumber === cell.stallNumber) return;

    // Reposition-to-empty only: dropping onto an already-occupied stall would evict its
    // occupant server-side (a real swap needs stored-procedure changes, out of scope here).
    const isOccupiedTarget = page.activeAssignments.some(function (assignment) {
      return assignment.stallNumber === cell.stallNumber;
    });

    if (isOccupiedTarget) {
      setToast({ isOpen: true, type: "error", message: "התא כבר תפוס" });
      return;
    }

    await page.handleAssign(cell, item);
  }

  if (page.loading) {
    return (
      <CompetitionWorkspaceLayout activeItemKey="stalls">
        <div className="flex h-64 items-center justify-center text-[#8D6E63]">
          טוען נתוני תאים...
        </div>
      </CompetitionWorkspaceLayout>
    );
  }

  return (
    <CompetitionWorkspaceLayout activeItemKey="stalls">
      <div className="space-y-5 p-6" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#3F312B]">תאים</h1>

            <p className="text-sm text-[#8D6E63]">
              ניהול הזמנות תאים ושיבוץ במפת התחרות
            </p>

            <div className="mt-2">
              {page.publishStatus?.isPublished ? (
                <span className="inline-flex items-center rounded-full border border-[#B9D9C0] bg-[#E7F4EA] px-3 py-1 text-xs font-bold text-[#2F6B3B]">
                  מפת התאים פורסמה למשתמשים
                  {page.publishStatus.publishedAt
                    ? " · " + formatPublishDate(page.publishStatus.publishedAt)
                    : ""}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-[#E8C99A] bg-[#F7E7CF] px-3 py-1 text-xs font-bold text-[#9A6700]">
                  מפת התאים עדיין לא פורסמה למשתמשים
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {page.mode === "overview" ? (
              <button
                type="button"
                onClick={page.openAssignmentMode}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#7B5A4D] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6D4C41]"
              >
                <MapPinned size={16} />
                מצב שיבוץ תאים
              </button>
            ) : (
              <button
                type="button"
                onClick={page.openOverviewMode}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#D7CCC8] bg-white px-4 py-2 text-sm font-semibold text-[#5D4037] transition hover:bg-[#FAF5F1]"
              >
                <ArrowRight size={16} />
                חזרה לרשימת הזמנות
              </button>
            )}

            {page.publishStatus?.isPublished ? (
              <button
                type="button"
                onClick={page.handleUnpublishStallMap}
                disabled={page.publishLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#E7BABA] bg-[#F9E5E5] px-4 py-2 text-sm font-semibold text-[#A54848] transition hover:bg-[#F4D7D7] disabled:opacity-60"
              >
                <EyeOff size={16} />
                בטל פרסום מפה
              </button>
            ) : (
              <button
                type="button"
                onClick={function () {
                  page.handlePublishStallMap(user?.personId);
                }}
                disabled={page.publishLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#B9D9C0] bg-[#E7F4EA] px-4 py-2 text-sm font-semibold text-[#2F6B3B] transition hover:bg-[#D9EBDD] disabled:opacity-60"
              >
                <Eye size={16} />
                פרסם מפת תאים
              </button>
            )}
          </div>
        </div>

        {page.error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
            {page.error}
          </div>
        )}

        {page.mode === "overview" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#5D4037]">
              <ClipboardList size={18} />
              <h2 className="text-base font-bold">רשימת הזמנות תאים</h2>
            </div>

            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={function () {
                  setCreateModalOpen(true);
                }}
                className="rounded-2xl bg-[#7B5A4D] px-4 py-2 text-sm font-black text-white hover:bg-[#6B4D42]"
              >
                + הוסף תא
              </button>
            </div>

            <StallBookingsOverviewTable
              items={page.overviewItems}
              compounds={page.compounds}
              onDeleteBooking={handleDeleteBooking}
              onEditBooking={handleEditBooking}
            />
          </div>
        )}

        {page.mode === "assignment" && (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#EFE5DF] bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-[#3F312B]">
                      מצב שיבוץ תאים
                    </h2>

                    <p className="text-xs text-[#8D6E63]">
                      בחרי חווה, גררי סוס או תא ציוד לתא פנוי במפה
                    </p>
                  </div>
                </div>

                <StallAssignmentRanchTabs
                  ranchGroups={page.ranchGroups}
                  selectedRanchId={page.selectedRanchId}
                  onSelectRanch={page.setSelectedRanchId}
                />
              </div>

              {page.compounds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {page.compounds.map(function (compound) {
                    return (
                      <button
                        key={compound.compoundId}
                        type="button"
                        onClick={function () {
                          page.setActiveCompoundId(compound.compoundId);
                        }}
                        className={[
                          "rounded-2xl px-4 py-2 text-sm font-semibold transition-all",
                          page.activeCompoundId === compound.compoundId
                            ? "bg-[#7B5A4D] text-white shadow-sm"
                            : "border border-[#D7CCC8] bg-white text-[#5D4037] hover:bg-[#FAF5F1]",
                        ].join(" ")}
                      >
                        {compound.compoundName}
                      </button>
                    );
                  })}
                </div>
              )}

              {page.compounds.length === 0 ? (
                <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-[#D7CCC8] bg-[#FAF5F1]">
                  <p className="text-sm text-[#BCAAA4]">
                    לא הוגדרו מתחמים לחווה זו
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-[320px_minmax(0,1fr)] items-stretch gap-5">
                  <div className="flex h-[70vh] min-h-0 overflow-hidden rounded-2xl border border-[#EFE5DF] bg-white p-3">
                    <StallAssignmentSidebar items={page.selectedRanchItems} />
                  </div>

                  <div className="min-w-0 space-y-3">
                    {page.activeCompound && (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h2 className="text-base font-bold text-[#3F312B]">
                            {page.activeCompound.compoundName}
                          </h2>

                          <StallMapUploader
                            compound={page.activeCompound}
                            onLayoutParsed={function (layout) {
                              page.handleLayoutParsed(
                                page.activeCompound,
                                layout,
                              );
                            }}
                          />
                        </div>

                        <div className="h-[70vh] min-h-0">
                          <StallMapGrid
                            compound={page.activeCompound}
                            assignments={page.activeAssignments}
                            onUnassign={page.handleUnassign}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <DragOverlay>
                {activeItem ? (
                  <div className="flex flex-col items-center rounded-xl border-2 border-[#795548] bg-[#F5EDE8] px-3 py-2 shadow-xl">
                    <StallBookingLabel item={activeItem} />
                  </div>
                ) : null}
              </DragOverlay>
            </div>
          </DndContext>
        )}
      </div>

      <ToastMessage
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={function () {
          setToast(function (current) {
            return { ...current, isOpen: false };
          });
        }}
      />

      <SecretaryCreateStallBookingModal
        isOpen={createModalOpen}
        competitionId={Number(competitionId)}
        ranchId={ranchId}
        ranchOptions={ranchOptions}
        onClose={function () {
          setCreateModalOpen(false);
        }}
        onSubmit={handleSubmitCreate}
      />

      <SecretaryUpdateStallBookingModal
        isOpen={!!editTarget}
        booking={editTarget}
        competitionId={Number(competitionId)}
        ranchId={ranchId}
        onClose={function () {
          setEditTarget(null);
        }}
        onSubmit={handleSubmitUpdate}
      />
    </CompetitionWorkspaceLayout>
  );
}
