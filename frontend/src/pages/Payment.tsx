import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown, CheckCircle2, Copy, RefreshCw } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/components/ui/use-toast";
import { paymentApi } from "@/services/paymentService";
import type { ManualPaymentOrder, PaymentPlan } from "@/types";

type RoutePlan = "monthly" | "annual" | "yearly";
type PaymentStatus = "pending" | "paid" | "failed" | "cancelled";

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { plan } = (location.state as { plan?: RoutePlan }) || {
    plan: "monthly",
  };

  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [refreshingOrders, setRefreshingOrders] = useState(false);
  const [activeOrder, setActiveOrder] = useState<ManualPaymentOrder | null>(
    null,
  );
  const [orders, setOrders] = useState<ManualPaymentOrder[]>([]);

  const normalizedPlan = useMemo<PaymentPlan>(() => {
    if (plan === "annual") return "yearly";
    if (plan === "yearly") return "yearly";
    return "monthly";
  }, [plan]);

  const planDetails: Record<
    PaymentPlan,
    { name: string; price: string; duration: string }
  > = {
    monthly: {
      name: "Gói Tháng",
      price: "99,000đ",
      duration: "/tháng",
    },
    yearly: {
      name: "Gói Năm",
      price: "999,000đ",
      duration: "/năm",
    },
  };

  const currentPlan = planDetails[normalizedPlan];

  const statusLabel: Record<PaymentStatus, string> = {
    pending: "Chờ duyệt",
    paid: "Đã duyệt",
    failed: "Thất bại",
    cancelled: "Đã hủy",
  };

  const statusClass: Record<PaymentStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-slate-100 text-slate-700",
  };

  async function loadOrders(showLoading = false) {
    if (showLoading) setRefreshingOrders(true);
    try {
      const orderList = await paymentApi.listMyOrders();
      setOrders(orderList);
      const pending = orderList.find((o) => o.status === "pending");
      setActiveOrder((prev) => prev ?? pending ?? orderList[0] ?? null);
    } catch (error) {
      toast({
        title: "Không tải được đơn thanh toán",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      if (showLoading) setRefreshingOrders(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      try {
        const orderList = await paymentApi.listMyOrders();
        if (!mounted) return;
        setOrders(orderList);
        const pending = orderList.find((o) => o.status === "pending");
        setActiveOrder(pending ?? orderList[0] ?? null);
      } catch (error) {
        if (!mounted) return;
        toast({
          title: "Không tải được dữ liệu thanh toán",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const handleCreateOrder = async () => {
    setCreatingOrder(true);
    try {
      const created = await paymentApi.createOrder(normalizedPlan);
      setActiveOrder(created);
      setOrders((prev) => [
        created,
        ...prev.filter((o) => o.id !== created.id),
      ]);
      toast({
        title: "Đã tạo đơn thanh toán",
        description:
          "Vui lòng chuyển khoản đúng nội dung để admin duyệt nhanh hơn.",
      });
    } catch (error) {
      toast({
        title: "Tạo đơn thất bại",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleConfirmPayment = async () => {
    await loadOrders(true);
    toast({
      title: "Đã ghi nhận yêu cầu",
      description: "Hệ thống sẽ cập nhật khi admin duyệt giao dịch của bạn.",
    });
  };

  const copyText = async (text?: string | null) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Đã sao chép", description: text });
    } catch {
      toast({ title: "Không thể sao chép", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 max-w-2xl">
          <div className="bg-card neo-border neo-shadow rounded-sm p-6">
            Đang tải thông tin thanh toán...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Navbar />

      <div className="container mx-auto px-4 pt-24 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/profile")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              Thanh toán
            </h1>
            <p className="text-sm font-bold text-muted-foreground">
              Hoàn tất đăng ký gói học
            </p>
          </div>
        </div>

        {/* Plan Summary */}
        <div className="bg-card neo-border neo-shadow rounded-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-xl font-black text-foreground">
                  {currentPlan.name}
                </h2>
                <p className="text-sm text-muted-foreground">Gói cao cấp</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-primary">
                {currentPlan.price}
              </div>
              <div className="text-xs text-muted-foreground">
                {currentPlan.duration}
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Mở khóa tất cả các giai đoạn</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Tất cả các Boss nâng cao</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Hỗ trợ ưu tiên</span>
            </div>
          </div>
        </div>

        <div className="bg-card neo-border neo-shadow rounded-sm p-6 mb-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-foreground">
              Tạo đơn chuyển khoản
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadOrders(true)}
              disabled={refreshingOrders}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${refreshingOrders ? "animate-spin" : ""}`}
              />
              Làm mới
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            Mỗi lần nâng cấp sẽ tạo một mã nội dung chuyển khoản riêng để đối
            soát tự động.
          </p>
          <Button
            onClick={handleCreateOrder}
            className="w-full"
            variant="secondary"
            disabled={creatingOrder}
          >
            {creatingOrder ? "Đang tạo đơn..." : `Tạo đơn ${currentPlan.name}`}
          </Button>
        </div>

        {activeOrder && (
          <div className="bg-card neo-border neo-shadow rounded-sm p-6 mb-6">
            <h2 className="text-xl font-black text-foreground mb-4 text-center">
              Quét mã QR để thanh toán
            </h2>

            <div className="flex flex-col items-center">
              <div className="w-64 h-64 bg-muted neo-border rounded-sm flex items-center justify-center mb-4 overflow-hidden">
                {activeOrder.qr_image_url ? (
                  <img
                    src={activeOrder.qr_image_url}
                    alt="QR chuyển khoản"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <p className="text-xs font-bold text-muted-foreground px-4 text-center">
                    Admin chưa cấu hình ảnh QR. Vui lòng liên hệ hỗ trợ.
                  </p>
                )}
              </div>

              <div className="text-center mb-4">
                <p className="text-sm font-bold text-foreground mb-1">
                  Số tiền:{" "}
                  <span className="text-primary text-lg">
                    {activeOrder.amount_vnd.toLocaleString()}đ
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mb-1">
                  Ngân hàng: {activeOrder.bank_name || "(chưa cấu hình)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Số tài khoản:{" "}
                  {activeOrder.account_number || "(chưa cấu hình)"}
                </p>
              </div>

              <div className="w-full max-w-md bg-muted neo-border rounded-sm p-4 mb-4">
                <p className="text-xs font-bold text-muted-foreground mb-2">
                  Nội dung chuyển khoản
                </p>
                <div className="flex items-center gap-2">
                  <p className="flex-1 font-black text-sm break-all">
                    {activeOrder.transfer_note || "(chưa có)"}
                  </p>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyText(activeOrder.transfer_note)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Hết hạn:{" "}
                  {new Date(activeOrder.expires_at).toLocaleString("vi-VN")}
                </p>
                {activeOrder.instructions && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {activeOrder.instructions}
                  </p>
                )}
              </div>

              <Button
                onClick={handleConfirmPayment}
                className="w-full max-w-xs"
                variant="secondary"
              >
                Tôi đã chuyển khoản
              </Button>
            </div>
          </div>
        )}

        <div className="bg-card neo-border neo-shadow rounded-sm p-6 mb-6">
          <h2 className="text-xl font-black text-foreground mb-4">
            Lịch sử đơn gần đây
          </h2>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Bạn chưa có đơn thanh toán nào.
            </p>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => {
                const status = (order.status as PaymentStatus) || "pending";
                return (
                  <button
                    key={order.id}
                    onClick={() => setActiveOrder(order)}
                    className="w-full bg-muted neo-border rounded-sm p-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-black text-sm uppercase">
                        {order.plan}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded-sm font-black ${statusClass[status] || statusClass.pending}`}
                      >
                        {statusLabel[status] || order.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {order.amount_vnd.toLocaleString()}đ
                    </p>
                    <p className="text-xs text-muted-foreground break-all">
                      {order.transfer_note || "(không có mã)"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payment;
