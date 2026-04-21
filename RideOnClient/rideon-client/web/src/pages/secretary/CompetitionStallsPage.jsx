import { useState } from "react";
import { useParams } from "react-router-dom";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import CompetitionWorkspaceLayout from "../../components/secretary/competition-workspace/CompetitionWorkspaceLayout";
import ToastMessage from "../../components/common/ToastMessage";
import StallMapGrid from "../../components/secretary/stall-map/StallMapGrid";
import StallMapUploader from "../../components/secretary/stall-map/StallMapUploader";
import HorseSidebar from "../../components/secretary/stall-map/HorseSidebar";
import useCompetitionStallsPage from "../../hooks/secretary/useCompetitionStallsPage";
import { useActiveRole } from "../../context/ActiveRoleContext";

export default function CompetitionStallsPage() {
  const { competitionId } = useParams();
  const { activeRole } = useActiveRole();
  const ranchId = activeRole?.ranchId || null;

  const page = useCompetitionStallsPage(Number(competitionId), ranchId);
  const [activeHorse, setActiveHorse] = useState(null);
  const [toast, setToast] = useState({ isOpen: false, type: "success", message: "" });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event) {
    const horse = event.active.data.current?.horse;
    if (horse) setActiveHorse(horse);
  }

  async function handleDragEnd(event) {
    setActiveHorse(null);
    const horse = event.active.data.current?.horse;
    const cell  = event.over?.data.current?.cell;
    if (!horse || !cell || !cell.stallId) return;
    await page.handleAssign(cell, horse);
  }

  if (page.loading) {
    return (
      <CompetitionWorkspaceLayout activeItemKey="stalls">
        <div className="flex items-center justify-center h-64 text-[#8D6E63]">טוען מפת תאים...</div>
      </CompetitionWorkspaceLayout>
    );
  }

  return (
    <CompetitionWorkspaceLayout activeItemKey="stalls">
      <div className="p-6 space-y-5" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#3F312B]">מפת תאים</h1>
            <p className="text-sm text-[#8D6E63]">שיבוץ סוסים לתאים עבור התחרות</p>
          </div>
        </div>

        {page.error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-right">
            {page.error}
          </div>
        )}

        {/* Compound tabs */}
        {page.compounds.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {page.compounds.map(function (c) {
              return (
                <button
                  key={c.compoundId}
                  type="button"
                  onClick={function () { page.setActiveCompoundId(c.compoundId); }}
                  className={[
                    "px-4 py-2 rounded-2xl text-sm font-semibold transition-all",
                    page.activeCompoundId === c.compoundId
                      ? "bg-[#7B5A4D] text-white shadow-sm"
                      : "bg-white border border-[#D7CCC8] text-[#5D4037] hover:bg-[#FAF5F1]",
                  ].join(" ")}
                >
                  {c.compoundName}
                </button>
              );
            })}
          </div>
        )}

        {page.compounds.length === 0 ? (
          <div className="flex items-center justify-center h-40 rounded-2xl border border-dashed border-[#D7CCC8] bg-[#FAF5F1]">
            <p className="text-sm text-[#BCAAA4]">לא הוגדרו מתחמים לחווה זו</p>
          </div>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-5 items-start">
              {/* Map area */}
              <div className="flex-1 min-w-0 space-y-3">
                {page.activeCompound && (
                  <>
                    <div className="flex items-center justify-between flex-wrap gap-2">
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

              {/* Horse sidebar */}
              <div className="w-56 shrink-0 rounded-2xl border border-[#EFE5DF] bg-white p-3 max-h-[70vh] sticky top-6">
                <HorseSidebar horses={page.horses} assignments={page.assignments} />
              </div>
            </div>

            <DragOverlay>
              {activeHorse ? (
                <div className="px-3 py-2 rounded-xl border-2 border-[#795548] bg-[#F5EDE8] shadow-xl text-sm font-semibold text-[#3F312B]">
                  🐴 {activeHorse.barnName || activeHorse.horseName}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <ToastMessage
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={function () { setToast(function (t) { return { ...t, isOpen: false }; }); }}
      />
    </CompetitionWorkspaceLayout>
  );
}
