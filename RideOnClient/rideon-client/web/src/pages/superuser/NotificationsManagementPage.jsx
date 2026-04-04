import SuperUserLayout from "../../components/superuser/SuperUserLayout";

export default function NotificationsManagementPage() {
  return (
    <SuperUserLayout activeItemKey="notifications">
      <div className="bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-bold">ניהול התראות</h1>
      </div>
    </SuperUserLayout>
  );
}