import { useEffect, useState } from "react";
import { Check, ImageOff } from "lucide-react";
import CompetitionWorkspaceLayout from "../../components/secretary/competition-workspace/CompetitionWorkspaceLayout";
import { useActiveRole } from "../../context/ActiveRoleContext";
import {
  getPendingDeliveryApprovals,
  approveDelivery,
} from "../../services/shavingsOrderService";
import ConfirmDialog from "../../components/superuser/ConfirmDialog";

export default function CompetitionShavingsPage() {
  const { activeRole } = useActiveRole();

  return (
    <CompetitionWorkspaceLayout activeItemKey="shavings">
      {function (layout) {
        return (
          <ShavingsContent
            ranchId={activeRole?.ranchId || null}
            competitionId={layout.competitionId}
          />
        );
      }}
    </CompetitionWorkspaceLayout>
  );
}

function ShavingsContent({ ranchId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  useEffect(
    function () {
      if (!ranchId) return;
      loadOrders();
    },
    [ranchId],
  );

  async function loadOrders() {
    try {
      setLoading(true);
      const response = await getPendingDeliveryApprovals(ranchId);
      setOrders(response.data?.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  function handleApproveClick(order) {
    setConfirmDialog({
      isOpen: true,
      title: "אישור אספקה",
      message: `האם לאשר את אספקת הזמנה #${order.shavingsOrderId}? ההזמנה תסומן כסגורה.`,
      onConfirm: async function () {
        try {
          setActionLoadingId(order.shavingsOrderId);
          await approveDelivery(order.shavingsOrderId);
          closeConfirmDialog();
          await loadOrders();
        } catch {
          alert("שגיאה באישור ההזמנה");
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  }

  function closeConfirmDialog() {
    setConfirmDialog({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: null,
    });
  }

  return (
    <>
      <div className="mx-auto max-w-[1450px] space-y-6">
        <div className="rounded-[28px] border border-[#E6DCD5] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#EFE5DF] px-8 py-7">
            <h1 className="text-[2rem] font-bold text-[#3F312B]">
              הזמנות נסורת
            </h1>
            <p className="mt-1 text-sm text-[#8A7268]">
              הזמנות שסופקו ומחכות לאישור מזכירה
            </p>
          </div>

          <div className="px-6 py-6">
            {loading && (
              <p className="text-center text-[#8A7268] py-10">טוען הזמנות...</p>
            )}

            {!loading && orders.length === 0 && (
              <div className="text-center py-16">
                <p className="text-[#8A7268] text-sm">
                  אין הזמנות הממתינות לאישור
                </p>
              </div>
            )}

            {!loading && orders.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {orders.map(function (order) {
                  const isLoading = actionLoadingId === order.shavingsOrderId;

                  return (
                    <div
                      key={order.shavingsOrderId}
                      className="rounded-[20px] border border-[#E6DCD5] bg-[#FCFAF8] p-5 flex flex-col gap-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#8A7268] bg-[#F1E8E3] px-3 py-1 rounded-full">
                          הזמנה #{order.shavingsOrderId}
                        </span>
                        <span className="text-xs text-[#8A7268]">
                          {order.deliveryPhotoDate
                            ? new Date(
                                order.deliveryPhotoDate,
                              ).toLocaleDateString("he-IL")
                            : ""}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-[#3F312B]">
                        <div className="flex justify-between">
                          <span className="text-[#8A7268]">משלם:</span>
                          <span className="font-medium">
                            {order.payerFirstName} {order.payerLastName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8A7268]">תא:</span>
                          <span>{order.stallNumber || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8A7268]">עובד:</span>
                          <span>
                            {order.workerFirstName} {order.workerLastName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8A7268]">כמות שקים:</span>
                          <span>{order.bagQuantity}</span>
                        </div>
                      </div>

                      {order.deliveryPhotoUrl ? (
                        <button
                          onClick={function () {
                            setSelectedPhoto(order.deliveryPhotoUrl);
                          }}
                          className="w-full overflow-hidden rounded-[14px] border border-[#E6DCD5] cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          <img
                            src={order.deliveryPhotoUrl}
                            alt="תמונת אספקה"
                            className="w-full h-40 object-cover"
                          />
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-2 h-40 rounded-[14px] border border-dashed border-[#D8CBC3] bg-white text-[#8A7268] text-sm">
                          <ImageOff size={18} />
                          <span>אין תמונה</span>
                        </div>
                      )}

                      <button
                        onClick={function () {
                          handleApproveClick(order);
                        }}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 w-full rounded-[12px] bg-[#4CAF50] hover:bg-[#43A047] text-white text-sm font-semibold py-2.5 transition-colors disabled:opacity-60"
                      >
                        <Check size={16} />
                        {isLoading ? "מאשר..." : "אשר אספקה"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={function () {
            setSelectedPhoto(null);
          }}
        >
          <img
            src={selectedPhoto}
            alt="תמונת אספקה מוגדלת"
            className="max-w-[90vw] max-h-[90vh] rounded-[16px] shadow-2xl"
            onClick={function (e) {
              e.stopPropagation();
            }}
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onCancel={closeConfirmDialog}
        onConfirm={confirmDialog.onConfirm}
      />
    </>
  );
}
