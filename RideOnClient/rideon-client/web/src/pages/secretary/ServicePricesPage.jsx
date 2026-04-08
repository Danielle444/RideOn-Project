import AppLayout from "../../components/layout/AppLayout";
import ConfirmDialog from "../../components/superuser/ConfirmDialog";
import ToastMessage from "../../components/common/ToastMessage";
import ServicePricesTable from "../../components/secretary/service-prices/ServicePricesTable";
import ServiceProductModal from "../../components/secretary/service-prices/ServiceProductModal";
import ServicePriceHistoryModal from "../../components/secretary/service-prices/ServicePriceHistoryModal";
import useServicePricesPage from "../../hooks/secretary/useServicePricesPage";
import secretaryGeneralMenu from "../../components/secretary/secretaryGeneralMenu";
import { getActiveRole, getUser } from "../../services/storageService";
import { getSecretaryDisplayName } from "../../utils/secretaryDisplay.utils";

export default function ServicePricesPage() {
  const page = useServicePricesPage();

  const activeRole = getActiveRole();
  const user = getUser();

  const userName = getSecretaryDisplayName(user);

  const subtitle = activeRole
    ? `${activeRole.roleName || ""} • ${activeRole.ranchName || ""}`
    : "מזכירת חווה מארחת";

  return (
    <AppLayout
      userName={userName}
      subtitle={subtitle}
      menuItems={secretaryGeneralMenu}
      activeItemKey="service-prices"
      notificationCount={0}
      notificationsOpen={false}
      notificationItems={[]}
    >
      <div className="rounded-[26px] border border-[#E6DCD5] bg-white shadow-sm overflow-hidden">
        <div className="px-8 pt-8 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-[2rem] font-bold text-[#3F312B]">
                מחירון שירותים
              </h1>
              <p className="mt-2 text-sm text-[#8A7268]">
                ניהול מחירים לפי החווה הפעילה
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-start">
            <input
              value={page.search}
              onChange={function (e) {
                page.setSearch(e.target.value);
              }}
              placeholder="חיפוש לפי קטגוריה או שם מוצר"
              className="h-11 w-[320px] rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm placeholder:text-[#A08D84] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
            />
          </div>
        </div>

        <div className="border-t border-[#EFE5DF] px-6 py-6">
          <div className="space-y-6">
            {page.sections.map(function (section) {
              return (
                <ServicePricesTable
                  key={section.categoryId}
                  categoryId={section.categoryId}
                  categoryName={section.categoryName}
                  items={section.items}
                  loading={page.loading}
                  onCreate={function () {
                    page.openCreate(section);
                  }}
                  onEdit={function (item) {
                    page.openEdit(item, section);
                  }}
                  onDeactivate={page.handleDeactivate}
                  onActivate={page.handleActivate}
                  onHistory={page.openHistory}
                  onDelete={page.handleDelete}
                />
              );
            })}
          </div>
        </div>
      </div>

      <ServiceProductModal
        isOpen={page.modalOpen}
        onClose={page.closeModal}
        onSubmit={page.handleSubmit}
        initialItem={page.editItem}
        isEdit={!!page.editItem}
        error={page.error}
        categoryId={page.selectedCategory?.categoryId}
        categoryName={page.selectedCategory?.categoryName}
      />

      <ServicePriceHistoryModal
        isOpen={page.historyOpen}
        onClose={page.closeHistory}
        historyItems={page.historyItems}
        loading={page.historyLoading}
        productName={page.historyProduct?.productName}
        onActivateHistoryItem={page.handleActivateHistoryItem}
      />

      <ConfirmDialog
        isOpen={page.confirmDialog.isOpen}
        title={page.confirmDialog.title}
        message={page.confirmDialog.message}
        onCancel={page.closeConfirmDialog}
        onConfirm={page.confirmDialog.onConfirm}
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