import SectionCard from "./SectionCard";
import PaidTimeSlotsInCompetitionSection from "../PaidTimeSlotsInCompetitionSection";

export default function CompetitionPaidTimeStep(props) {
  return (
    <SectionCard
      title="3. פייד־טיים"
      isOpen={props.isOpen}
      isDisabled={props.isDisabled}
      onToggle={props.onToggle}
      statusText={props.competitionId ? "אופציונלי" : "לא נשמר"}
    >
      <div className="space-y-6">
        <PaidTimeSlotsInCompetitionSection
          competitionId={props.competitionId}
          items={props.items}
          loading={props.loading}
          baseSlots={props.baseSlots}
          arenas={props.arenas}
          onAdd={props.onAdd}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
        />

        {props.competitionId ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-[#EFE5DF] pt-4">
            <button
              type="button"
              onClick={props.onSkip}
              className="rounded-xl border border-[#D7CCC8] px-5 py-3 font-semibold text-[#5D4037] transition-colors hover:bg-[#F8F5F2]"
            >
              דלג על השלב כרגע
            </button>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}