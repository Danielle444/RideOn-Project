import SuperUserLayout from "../../components/superuser/SuperUserLayout";

export default function JudgesManagementPage() {
  return (
    <SuperUserLayout activeItemKey="judges">
      <div className="bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-bold">ניהול שופטים</h1>
      </div>
    </SuperUserLayout>
  );
}