import AppLayout from "../../components/layout/AppLayout";
import secretaryGeneralMenu from "../../components/secretary/secretaryGeneralMenu";
import ToastMessage from "../../components/common/ToastMessage";
import CompetitionDetailsSection from "../../components/secretary/competition-form/CompetitionDetailsSection";
import CompetitionClassesStep from "../../components/secretary/competition-form/CompetitionClassesStep";
import CompetitionPaidTimeStep from "../../components/secretary/competition-form/CompetitionPaidTimeStep";
import CompetitionFormHeader from "../../components/secretary/competition-form/CompetitionFormHeader";
import ClassInCompetitionModal from "../../components/secretary/ClassInCompetitionModal";
import PaidTimeSlotInCompetitionModal from "../../components/secretary/PaidTimeSlotInCompetitionModal";
import { useUser } from "../../context/UserContext";
import { useActiveRole } from "../../context/ActiveRoleContext";
import useCompetitionFormPage from "../../hooks/secretary/useCompetitionFormPage";

export default function CompetitionFormPage(props) {
  var userContext = useUser();
  var activeRoleContext = useActiveRole();

  var user = userContext.user;
  var activeRole = activeRoleContext.activeRole;

  var page = useCompetitionFormPage({
    mode: props.mode,
    currentRanchId: activeRole?.ranchId || null,
  });

  var userName = ((user?.firstName || "") + " " + (user?.lastName || "")).trim();
  var subtitle =
    [activeRole?.roleName, activeRole?.ranchName].filter(Boolean).join(" · ") ||
    "לא נבחר תפקיד וחווה";

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
          page.navigate("/competitions");
          return;
        }

        page.handleSkipPaidTimeStep();
      }}
    >
      <div className="mx-auto max-w-[1500px] space-y-8">
        <CompetitionFormHeader
          competitionId={page.competitionId}
          onBack={function () {
            page.navigate("/competitions");
          }}
        />

        <CompetitionDetailsSection
          isOpen={page.activeStep === "details"}
          onToggle={function () {
            page.setActiveStep("details");
          }}
          loadingPage={page.loadingPage}
          competitionId={page.competitionId}
          currentStatus={page.currentStatus}
          detailsForm={page.detailsForm}
          fields={page.fields || []}
          judges={page.judges || []}
          selectedCompetitionJudgeIds={page.selectedCompetitionJudgeIds || []}
          onToggleCompetitionJudge={page.toggleCompetitionJudge}
          onJudgesReloaded={page.setJudgesManually}
          onChange={page.handleDetailsChange}
          savingDetails={page.savingDetails}
          onSaveDraft={function () {
            page.handleSaveDetails("draft");
          }}
          onSaveAndContinue={function () {
            page.handleSaveDetails("continue");
          }}
        />

        <CompetitionClassesStep
          isOpen={page.activeStep === "classes"}
          onToggle={function () {
            if (!page.competitionId) {
              return;
            }

            page.setActiveStep("classes");
          }}
          isDisabled={!page.competitionId}
          competitionId={page.competitionId}
          items={page.classesInCompetition}
          loading={page.loadingClasses}
          classTypes={page.classTypes}
          judges={page.judges}
          arenas={page.arenas}
          competitionStartDate={page.detailsForm.competitionStartDate}
          competitionEndDate={page.detailsForm.competitionEndDate}
          onAdd={page.openCreateClassModal}
          onEdit={page.openEditClassModal}
          onDelete={page.handleDeleteClass}
          onFinishStep={page.handleFinishClassesStep}
          shouldShowPaidTimeStep={page.shouldShowPaidTimeStep}
          onSaveDraft={function () {
            page.handleSaveDetails("draft");
          }}
          onPublish={function () {
            page.handleSaveDetails("publish");
          }}
          canPublishCompetition={page.canPublishCompetition}
        />

        {page.shouldShowPaidTimeStep ? (
          <CompetitionPaidTimeStep
            isOpen={page.activeStep === "paidTime"}
            onToggle={function () {
              if (!page.competitionId) {
                return;
              }

              page.setActiveStep("paidTime");
            }}
            isDisabled={!page.competitionId}
            competitionId={page.competitionId}
            items={page.paidTimeSlotsInCompetition}
            loading={page.loadingPaidTime}
            baseSlots={page.paidTimeBaseSlots}
            arenas={page.arenas}
            onAdd={page.openCreatePaidTimeModal}
            onEdit={page.openEditPaidTimeModal}
            onDelete={page.handleDeletePaidTime}
            onSkip={page.handleSkipPaidTimeStep}
          />
        ) : null}
      </div>

      <ClassInCompetitionModal
        isOpen={page.classModalOpen}
        onClose={page.closeClassModal}
        onSubmit={page.handleSubmitClass}
        initialValue={page.editClassItem}
        defaultDate={page.createClassDefaultDate}
        defaultJudgeIds={page.selectedCompetitionJudgeIds || []}
        classTypes={page.classTypes || []}
        judges={page.judges || []}
        prizeTypes={page.prizeTypes || []}
        arenas={page.arenas || []}
        fieldId={page.detailsForm.fieldId}
        error={page.classModalError}
        saving={page.savingClass}
      />

      <PaidTimeSlotInCompetitionModal
        isOpen={page.paidTimeModalOpen}
        onClose={page.closePaidTimeModal}
        onSubmit={page.handleSubmitPaidTime}
        initialValue={page.editPaidTimeItem}
        baseSlots={page.paidTimeBaseSlots}
        arenas={page.arenas}
        error={page.paidTimeModalError}
        saving={page.savingPaidTime}
      />

      <ToastMessage
        isOpen={page.toast.isOpen}
        type={page.toast.type}
        message={page.toast.message}
        onClose={page.closeToast}
      />
    </AppLayout>
  );
}