// Secretary shavings page — Spec 2 (component-structure.md).
//
// Rebuilt on Spec 1's shipped Pending → Seen → Delivered model: every order for the competition,
// grouped by participating ranch or by derived status (URL-bound), delayed orders flagged and
// pinned into a needs-attention section, plus a web add-order form. No approval anywhere.
import { useState } from "react";

import CompetitionWorkspaceLayout from "../../components/secretary/competition-workspace/CompetitionWorkspaceLayout";
import { useActiveRole } from "../../context/ActiveRoleContext";
import useCompetitionShavingsPage from "../../hooks/secretary/useCompetitionShavingsPage";
import ToastMessage from "../../components/common/ToastMessage";
import ShavingsGroupingToggle from "../../components/secretary/shavings/ShavingsGroupingToggle";
import ShavingsNeedsAttentionSection from "../../components/secretary/shavings/ShavingsNeedsAttentionSection";
import ShavingsGroup from "../../components/secretary/shavings/ShavingsGroup";
import AddShavingsOrderModal from "../../components/secretary/shavings/AddShavingsOrderModal";

function ShavingsContent(props) {
  const competitionId = props.competitionId;
  const ranchId = props.ranchId;

  const shavings = useCompetitionShavingsPage(competitionId, ranchId);
  const [toast, setToast] = useState({ isOpen: false, type: "success", message: "" });

  function showToast(type, message) {
    setToast({ isOpen: true, type: type, message: message });
  }

  function closeToast() {
    setToast(function (prev) {
      return { ...prev, isOpen: false };
    });
  }

  async function handleOrderCreated() {
    await shavings.handleOrderCreated();
    showToast("success", "הזמנת הנסורת נוספה בהצלחה");
  }

  async function handleCancelOrder(order) {
    const result = await shavings.handleCancelOrder(order);

    if (result === true) {
      showToast("success", "הזמנת הנסורת בוטלה");
    } else if (result === false) {
      showToast("error", shavings.cancelErrorMessage);
    }
  }

  const hasOrders = shavings.orders.length > 0;

  return (
    <div className="mx-auto max-w-[1450px]">
      <ToastMessage
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={closeToast}
      />

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[2rem] font-bold text-[#3F312B]">הזמנות נסורת</h1>
          <p className="mt-1 text-sm text-[#8A7268]">
            כל הזמנות הנסורת לתחרות, מקובצות לפי חווה או לפי סטטוס
          </p>
        </div>

        <button
          type="button"
          onClick={shavings.openAdd}
          className="rounded-2xl bg-[#6D4C41] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#5D4037]"
        >
          הוסף הזמנה
        </button>
      </div>

      {/* Loading */}
      {shavings.loading ? (
        <div className="rounded-2xl border border-[#E3D7D0] bg-[#FCFAF8] px-6 py-16 text-center text-[#7B5A4D]">
          טוען הזמנות...
        </div>
      ) : null}

      {/* Error */}
      {!shavings.loading && shavings.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          {shavings.errorMessage}
        </div>
      ) : null}

      {/* Loaded */}
      {!shavings.loading && !shavings.error ? (
        <div className="space-y-5">
          <ShavingsGroupingToggle
            group={shavings.group}
            onChange={shavings.setGroup}
          />

          <ShavingsNeedsAttentionSection
            overdueOrders={shavings.needsAttentionOverdue}
            dueTodayOrders={shavings.needsAttentionDueToday}
            onCancelOrder={handleCancelOrder}
            cancellingId={shavings.cancellingId}
          />

          {!hasOrders ? (
            <div className="rounded-2xl border border-dashed border-[#D8CBC3] bg-white px-6 py-16 text-center text-sm text-[#8A7268]">
              אין הזמנות נסורת לתחרות זו
            </div>
          ) : (
            <div className="space-y-5">
              {shavings.groups.map(function (group) {
                return (
                  <ShavingsGroup
                    key={group.key}
                    title={group.title}
                    stats={group.stats}
                    orders={group.orders}
                    onCancelOrder={handleCancelOrder}
                    cancellingId={shavings.cancellingId}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      <AddShavingsOrderModal
        isOpen={shavings.isAddOpen}
        onClose={shavings.closeAdd}
        competitionId={competitionId}
        ranchOptions={shavings.ranchOptions}
        // ranchId here is the page's own ranch (activeRole.ranchId), which
        // is always the competition's host ranch — proc 172 validates
        // c.hostranchid = p_ranchid, so the page could not have loaded
        // otherwise. Shavings pricing is host-ranch-scoped (ranch-model
        // fix), independent of whichever requesting ranch is selected in
        // the modal's own dropdown.
        hostRanchId={ranchId}
        onCreated={handleOrderCreated}
      />
    </div>
  );
}

export default function CompetitionShavingsPage() {
  const activeRoleContext = useActiveRole();
  const activeRole = activeRoleContext.activeRole;

  return (
    <CompetitionWorkspaceLayout activeItemKey="shavings">
      {function (ctx) {
        return (
          <ShavingsContent
            competitionId={ctx.competitionId}
            ranchId={activeRole ? activeRole.ranchId : null}
          />
        );
      }}
    </CompetitionWorkspaceLayout>
  );
}
