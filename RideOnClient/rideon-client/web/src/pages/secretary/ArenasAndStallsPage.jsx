import { ChevronUp, ChevronDown } from "lucide-react";
import SecretaryLayout from "../../components/secretary/SecretaryLayout";
import ConfirmDialog from "../../components/superuser/ConfirmDialog";
import ToastMessage from "../../components/common/ToastMessage";
import secretaryGeneralMenu from "../../components/secretary/secretaryGeneralMenu";
import { getActiveRole, getUser } from "../../services/storageService";
import { getSecretaryDisplayName } from "../../utils/secretaryDisplay.utils";
import useArenasAndStallsPage from "../../hooks/secretary/useArenasAndStallsPage";
import ArenasTable from "../../components/secretary/arenas-stalls/ArenasTable";
import ArenaModal from "../../components/secretary/arenas-stalls/ArenaModal";
import StallCompoundsTable from "../../components/secretary/arenas-stalls/StallCompoundsTable";
import StallCompoundModal from "../../components/secretary/arenas-stalls/StallCompoundModal";

function SectionHeader(props) {
  return (
    <div className="flex flex-row-reverse items-center justify-between border-b border-[#EFE5DF] px-8 py-6">
      <button
        type="button"
        onClick={props.onToggle}
        className="text-[#8B6352] hover:text-[#704D40]"
      >
        {props.expanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
      </button>

      <div className="flex items-center gap-4">
        <h2 className="text-[1.8rem] font-bold text-[#3F312B]">
          {props.title}
        </h2>
        <span className="rounded-lg bg-[#F3EEEA] px-3 py-1 text-sm font-semibold text-[#6B574F]">
          {props.countLabel}
        </span>
      </div>
    </div>
  );
}

export default function ArenasAndStallsPage() {
  const page = useArenasAndStallsPage();

  const activeRole = getActiveRole();
  const user = getUser();

  const userName = getSecretaryDisplayName(user);

  const subtitle = activeRole
    ? `${activeRole.roleName || ""} • ${activeRole.ranchName || ""}`
    : "מזכירת חווה מארחת";

  return (
    <SecretaryLayout
      userName={userName}
      subtitle={subtitle}
      menuItems={secretaryGeneralMenu}
      activeItemKey="arenas-and-stalls"
      notificationCount={0}
      notificationsOpen={false}
      notificationItems={[]}
    >
      <div className="overflow-hidden rounded-[26px] border border-[#E6DCD5] bg-white shadow-sm">
        <div className="border-b border-[#EFE5DF] px-8 py-7">
          <h1 className="text-[2rem] font-bold text-[#3F312B]">מגרשים ותאים</h1>
          <p className="mt-2 text-sm text-[#8A7268]">
            ניהול מגרשים ומתחמי תאים בחווה
          </p>
        </div>

        <div className="space-y-8 p-6">
          <div className="overflow-hidden rounded-[24px] border border-[#E6DCD5] bg-white shadow-sm">
            <SectionHeader
              title="מגרשים"
              countLabel={`${page.arenasCount} מגרשים`}
              expanded={page.arenasExpanded}
              onToggle={function () {
                page.setArenasExpanded(!page.arenasExpanded);
              }}
            />

            {page.arenasExpanded && (
              <ArenasTable
                items={page.arenas}
                loading={page.loadingArenas}
                onCreate={page.openCreateArena}
                onEdit={page.openEditArena}
                onDelete={page.handleArenaDelete}
              />
            )}
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[#E6DCD5] bg-white shadow-sm">
            <SectionHeader
              title="תאים"
              countLabel={`${page.compoundsCount} מתחמים`}
              expanded={page.compoundsExpanded}
              onToggle={function () {
                page.setCompoundsExpanded(!page.compoundsExpanded);
              }}
            />

            {page.compoundsExpanded && (
              <StallCompoundsTable
                items={page.compounds}
                loading={page.loadingCompounds}
                onCreate={function () {}}
                onEdit={function () {}}
                onDelete={function () {}}
                onLayoutParsed={page.handleCompoundLayoutParsed}
              />
            )}
          </div>
        </div>
      </div>

      <ArenaModal
        isOpen={page.arenaModalOpen}
        onClose={page.closeArenaModal}
        onSubmit={page.handleArenaSubmit}
        initialItem={page.editingArena}
        isEdit={!!page.editingArena}
        error={page.arenaError}
      />

      <StallCompoundModal
        isOpen={page.compoundModalOpen}
        onClose={page.closeCompoundModal}
        onSubmit={page.handleCompoundSubmit}
        initialItem={page.editingCompound}
        isEdit={!!page.editingCompound}
        error={page.compoundError}
        stallTypeOptions={page.stallTypeOptions}
      />

      <ConfirmDialog
        isOpen={page.confirmDialog.isOpen}
        title={page.confirmDialog.title}
        message={page.confirmDialog.message}
        onCancel={page.closeConfirmDialog}
        onConfirm={page.confirmDialog.onConfirm}
      />

      <ToastMessage
        isOpen={page.toast?.isOpen || false}
        type={page.toast?.type || "success"}
        message={page.toast?.message || ""}
        onClose={page.closeToast}
      />
    </SecretaryLayout>
  );
}
