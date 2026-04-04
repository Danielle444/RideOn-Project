import SuperUserLayout from "../../components/superuser/SuperUserLayout";

export default function ClassesManagementPage() {
  return (
    <SuperUserLayout activeItemKey="classes">
      <div className="bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-bold">ניהול מקצים</h1>
      </div>
    </SuperUserLayout>
  );
}