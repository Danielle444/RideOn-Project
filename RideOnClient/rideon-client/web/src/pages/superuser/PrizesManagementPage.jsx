import SuperUserLayout from "../../components/superuser/SuperUserLayout";

export default function PrizesManagementPage() {
  return (
    <SuperUserLayout activeItemKey="prizes">
      <div className="bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-bold">ניהול פרסים</h1>
      </div>
    </SuperUserLayout>
  );
}