import SuperUserLayout from "../../components/superuser/SuperUserLayout";

export default function FinesManagementPage() {
  return (
    <SuperUserLayout activeItemKey="fines">
      <div className="bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-bold">ניהול קנסות</h1>
      </div>
    </SuperUserLayout>
  );
}