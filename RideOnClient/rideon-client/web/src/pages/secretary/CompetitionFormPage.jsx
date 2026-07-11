import SecretaryLayout from "../../components/secretary/SecretaryLayout";
import secretaryGeneralMenu from "../../components/secretary/secretaryGeneralMenu";
import ToastMessage from "../../components/common/ToastMessage";
import CompetitionDetailsSection from "../../components/secretary/competition-form/CompetitionDetailsSection";
import CompetitionClassesStep from "../../components/secretary/competition-form/CompetitionClassesStep";
import CompetitionPaidTimeStep from "../../components/secretary/competition-form/CompetitionPaidTimeStep";
import CompetitionFormHeader from "../../components/secretary/competition-form/CompetitionFormHeader";
import DuplicateCompetitionSetupSection from "../../components/secretary/competition-form/DuplicateCompetitionSetupSection";
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

  var userName = (
    (user?.firstName || "") +
    " " +
    (user?.lastName || "")
  ).trim();
  var subtitle =
    [activeRole?.roleName, activeRole?.ranchName].filter(Boolean).join(" · ") ||
    "לא נבחר תפקיד וחווה";

  var selectedField = (page.fields || []).find(function (field) {
    return String(field.fieldId) === String(page.detailsForm.fieldId);
  });

  var selectedFieldName = selectedField?.fieldName || "";
  var isReiningField = String(selectedFieldName || "").trim() === "ריינינג";
  var isCreateMode = !page.competitionId && props.mode !== "edit";

  if (!activeRole) {
    return null;
  }

  return (
    <SecretaryLayout
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

        {isCreateMode ? (
          <div className="rounded-[28px] border border-[#E8DDD7] bg-[#FFFCFA] p-5">
            <h2 className="mb-4 text-xl font-bold text-[#3F312B]">
              איך תרצי להקים את התחרות?
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={function () {
                  page.setCreationMode("manual");
                }}
                className={
                  "rounded-3xl border px-5 py-5 text-right transition-colors " +
                  (page.creationMode === "manual"
                    ? "border-[#8B6352] bg-white shadow-sm"
                    : "border-[#E8DDD7] bg-[#FAF7F5] hover:bg-white")
                }
              >
                <div className="text-lg font-bold text-[#3F312B]">
                  הקמה ידנית
                </div>
                <div className="mt-2 text-sm text-[#8A7268]">
                  מילוי פרטי התחרות, שמירה כטיוטה ולאחר מכן הוספת מקצים
                  ופייד־טיים.
                </div>
              </button>

              <button
                type="button"
                onClick={function () {
                  page.setCreationMode("duplicate");
                }}
                className={
                  "rounded-3xl border px-5 py-5 text-right transition-colors " +
                  (page.creationMode === "duplicate"
                    ? "border-[#8B6352] bg-white shadow-sm"
                    : "border-[#E8DDD7] bg-[#FAF7F5] hover:bg-white")
                }
              >
                <div className="text-lg font-bold text-[#3F312B]">
                  שכפול מתחרות קיימת
                </div>
                <div className="mt-2 text-sm text-[#8A7268]">
                  יצירת טיוטה חדשה על בסיס תחרות קיימת, כולל מקצים, מחירים,
                  פרסים ופייד־טיים לפי בחירה.
                </div>
              </button>
            </div>
          </div>
        ) : null}

        {isCreateMode && page.creationMode === "duplicate" ? (
          <DuplicateCompetitionSetupSection
            currentRanchId={activeRole?.ranchId || null}
            fields={page.fields || []}
            sourceCompetitions={page.duplicateSourceCompetitions}
            loading={page.loadingDuplicateSources}
            saving={page.savingDuplicate}
            error={page.duplicateError}
            onSubmit={page.handleDuplicateCompetition}
          />
        ) : null}

        {page.creationMode === "manual" || !isCreateMode ? (
          <>
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
              selectedCompetitionJudgeIds={
                page.selectedCompetitionJudgeIds || []
              }
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
              onPublish={
                page.shouldShowPaidTimeStep
                  ? null
                  : function () {
                      page.handleSaveDetails("publish");
                    }
              }
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
                onPublish={function () {
                  page.handleSaveDetails("publish");
                }}
              />
            ) : null}
          </>
        ) : null}
      </div>

      <ClassInCompetitionModal
        isOpen={page.classModalOpen}
        onClose={page.closeClassModal}
        onSubmit={page.handleSubmitClass}
        onShowToast={page.showToast}
        initialValue={page.editClassItem}
        defaultDate={page.createClassDefaultDate}
        defaultJudgeIds={page.selectedCompetitionJudgeIds || []}
        classTypes={page.classTypes || []}
        judges={page.judges || []}
        prizeTypes={page.prizeTypes || []}
        patterns={page.patterns || []}
        arenas={page.arenas || []}
        fieldName={selectedFieldName}
        isReiningField={isReiningField}
        fieldId={page.detailsForm.fieldId}
        competitionStartDate={page.detailsForm.competitionStartDate}
        competitionEndDate={page.detailsForm.competitionEndDate}
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
    </SecretaryLayout>
  );
}
