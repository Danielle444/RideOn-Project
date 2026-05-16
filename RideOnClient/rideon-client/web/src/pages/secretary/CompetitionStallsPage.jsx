import { useState } from "react";
import { useParams } from "react-router-dom";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { ArrowRight, ClipboardList, MapPinned, Plus } from "lucide-react";

import CompetitionWorkspaceLayout from "../../components/secretary/competition-workspace/CompetitionWorkspaceLayout";
import ToastMessage from "../../components/common/ToastMessage";
import StallMapGrid from "../../components/secretary/stall-map/StallMapGrid";
import StallMapUploader from "../../components/secretary/stall-map/StallMapUploader";
import StallBookingsOverviewTable from "../../components/secretary/stall-map/StallBookingsOverviewTable";
import StallAssignmentSidebar from "../../components/secretary/stall-map/StallAssignmentSidebar";
import StallAssignmentRanchTabs from "../../components/secretary/stall-map/StallAssignmentRanchTabs";
import useCompetitionStallsPage from "../../hooks/secretary/useCompetitionStallsPage";
import { useActiveRole } from "../../context/ActiveRoleContext";

function getDragTitle(item) {
  if (!item) return "";

  if (item.isForTack) {
    return "תא ציוד #" + item.stallBookingId;
  }

  return item.barnName || item.horseName || "פריט לשיבוץ";
}

export default function CompetitionStallsPage() {
  const { competitionId } = useParams();
  const { activeRole } = useActiveRole();
  const ranchId = activeRole?.ranchId || null;

  const page = useCompetitionStallsPage(Number(competitionId), ranchId);
  const [activeItem, setActiveItem] = useState(null);
  const [toast, setToast] = useState({ isOpen: false, type: "success", message: "" });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragStart(event) {
    const item = event.active.data.current?.item;

    if (item) {
      setActiveItem(item);
    }
  }

  async function handleDragEnd(event) {
    setActiveItem(null);

    const item = event.active.data.current?.item;
    const cell = event.over?.data.current?.cell;

    if (!item || !cell || !cell.stallId) return;

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
      <div className="p-6 space-y-5" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#3F312B]">תאים</h1>
            <p className="text-sm text-[#8D6E63]">
              ניהול הזמנות תאים ושיבוץ במפת התחרות
            </p>
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

            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-2xl border border-[#E5D9D2] bg-[#F7F1ED] px-4 py-2 text-sm font-semibold text-[#BCAAA4]"
              title="יפותח בהמשך"
            >
              <Plus size={16} />
              הוסף תא
            </button>

            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-2xl border border-[#E5D9D2] bg-[#F7F1ED] px-4 py-2 text-sm font-semibold text-[#BCAAA4]"
              title="יפותח בהמשך"
            >
              <Plus size={16} />
              הוסף נסורת
            </button>
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

            <StallBookingsOverviewTable items={page.overviewItems} />
          </div>
        )}

        {page.mode === "assignment" && (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#EFE5DF] bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-[#3F312B]">מצב שיבוץ תאים</h2>
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
                  <p className="text-sm text-[#BCAAA4]">לא הוגדרו מתחמים לחווה זו</p>
                </div>
              ) : (
                <div className="flex items-start gap-5">
                  <div className="min-w-0 flex-1 space-y-3">
                    {page.activeCompound && (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h2 className="text-base font-bold text-[#3F312B]">
                            {page.activeCompound.compoundName}
                          </h2>

                          <StallMapUploader
                            compound={page.activeCompound}
                            onLayoutParsed={function (layout) {
                              page.handleLayoutParsed(page.activeCompound, layout);
                            }}
                          />
                        </div>

                        <StallMapGrid
                          compound={page.activeCompound}
                          assignments={page.activeAssignments}
                          onUnassign={page.handleUnassign}
                        />
                      </>
                    )}
                  </div>

                  <div className="sticky top-6 max-h-[70vh] w-80 shrink-0 rounded-2xl border border-[#EFE5DF] bg-white p-3">
                    <StallAssignmentSidebar items={page.selectedRanchItems} />
                  </div>
                </div>
              )}

              <DragOverlay>
                {activeItem ? (
                  <div className="rounded-xl border-2 border-[#795548] bg-[#F5EDE8] px-3 py-2 text-sm font-semibold text-[#3F312B] shadow-xl">
                    {getDragTitle(activeItem)}
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
    </CompetitionWorkspaceLayout>
  );
}