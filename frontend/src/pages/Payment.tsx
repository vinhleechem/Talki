import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown, CheckCircle2, Copy, RefreshCw } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/components/ui/use-toast";
import { paymentApi } from "@/services/paymentService";
import type {
  ManualPaymentConfig,
  ManualPaymentOrder,
  PaymentPlan,
} from "@/types";

type RoutePlan = "monthly" | "annual" | "yearly";
type PaymentStatus = "created" | "pending" | "paid" | "failed" | "cancelled";

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { plan } = (location.state as { plan?: RoutePlan }) || {
    plan: "monthly",
  };

  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const [refreshingOrders, setRefreshingOrders] = useState(false);
  const [activeOrder, setActiveOrder] = useState<ManualPaymentOrder | null>(
    null,
  );
  const [orders, setOrders] = useState<ManualPaymentOrder[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<ManualPaymentConfig | null>(null);

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
      price: paymentConfig ? `${paymentConfig.monthly_price.toLocaleString()}đ` : "99,000đ",
      duration: "/tháng",
    },
    yearly: {
      name: "Gói Năm",
      price: paymentConfig ? `${paymentConfig.yearly_price.toLocaleString()}đ` : "999,000đ",
      duration: "/năm",
    },
  };

  const currentPlan = planDetails[normalizedPlan];

  const statusLabel: Record<PaymentStatus, string> = {
    created: "Mới tạo",
    pending: "Chờ duyệt",
    paid: "Đã duyệt",
    failed: "Thất bại",
    cancelled: "Đã hủy",
  };

  const statusClass: Record<PaymentStatus, string> = {
    created: "bg-blue-100 text-blue-800",
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-slate-100 text-slate-700",
  };

  const inProgressOrder = useMemo(
    () =>
      orders.find((o) => o.status === "created" || o.status === "pending") ??
      null,
    [orders],
  );

  const loadOrders = useCallback(
    async (showLoading = false) => {
      if (showLoading) setRefreshingOrders(true);
      try {
        const orderList = await paymentApi.listMyOrders();
        setOrders(orderList);
        const inProgress = orderList.find(
          (o) => o.status === "created" || o.status === "pending",
        );
        setActiveOrder((prev) => prev ?? inProgress ?? null);
      } catch (error) {
        toast({
          title: "Không tải được đơn thanh toán",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      } finally {
        if (showLoading) setRefreshingOrders(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      try {
        const [config, orderList] = await Promise.all([
          paymentApi.getConfig(),
          paymentApi.listMyOrders(),
        ]);
        if (!mounted) return;
        setPaymentConfig(config);
        setOrders(orderList);
        const inProgress = orderList.find(
          (o) => o.status === "created" || o.status === "pending",
        );
        setActiveOrder(inProgress ?? null);
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

  useEffect(() => {
    if (!inProgressOrder || inProgressOrder.status !== "pending") return;
    const intervalId = window.setInterval(() => {
      loadOrders(false);
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [inProgressOrder, loadOrders]);

  const handleCreateOrder = async () => {
    setCreatingOrder(true);
    try {
      const existingIds = new Set(orders.map((o) => o.id));
      const created = await paymentApi.createOrder(normalizedPlan);
      setActiveOrder(created);
      setOrders((prev) => [
        created,
        ...prev.filter((o) => o.id !== created.id),
      ]);
      toast({
        title: existingIds.has(created.id)
          ? "Đang dùng đơn hiện có"
          : "Đã tạo đơn thanh toán",
        description: existingIds.has(created.id)
          ? "Bạn đã có đơn đang xử lý. Hoàn tất chuyển khoản rồi bấm xác nhận thanh toán."
          : "Vui lòng chuyển khoản đúng nội dung để admin duyệt nhanh hơn.",
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

  const handleConfirmPaid = async () => {
    if (!activeOrder || activeOrder.status !== "created") return;
    setConfirmingOrder(true);
    try {
      const confirmed = await paymentApi.confirmOrder(activeOrder.id);
      setActiveOrder(confirmed);
      setOrders((prev) => [
        confirmed,
        ...prev.filter((o) => o.id !== confirmed.id),
      ]);
      toast({
        title: "Đã gửi xác nhận thanh toán",
        description: "Đơn đã được chuyển sang hàng chờ admin duyệt.",
      });
    } catch (error) {
      toast({
        title: "Xác nhận thanh toán thất bại",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setConfirmingOrder(false);
    }
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

  const qrUrl = useMemo(() => {
    if (!activeOrder) return null;
    let base = activeOrder.qr_image_url;
    if (!base && activeOrder.bank_name && activeOrder.account_number) {
        base = `https://img.vietqr.io/image/${activeOrder.bank_name.trim()}-${activeOrder.account_number.trim()}-compact2.png`;
    }
    if (!base) return null;

    if (base.includes("img.vietqr.io")) {
        try {
            const url = new URL(base);
            url.searchParams.set("amount", activeOrder.amount_vnd.toString());
            if (activeOrder.transfer_note) {
                url.searchParams.set("addInfo", activeOrder.transfer_note);
            }
            if (activeOrder.account_name) {
                url.searchParams.set("accountName", activeOrder.account_name);
            }
            return url.toString();
        } catch {
            return base;
        }
    }
    return base;
  }, [activeOrder]);

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
            Bấm tạo đơn để lấy mã chuyển khoản. Chỉ khi bạn bấm xác nhận thanh
            toán thì đơn mới được chuyển qua admin duyệt.
          </p>
          <Button
            onClick={handleCreateOrder}
            className="w-full"
            variant="secondary"
            disabled={creatingOrder || !!inProgressOrder}
          >
            {creatingOrder
              ? "Đang tạo đơn..."
              : inProgressOrder
                ? "Đã có đơn đang xử lý"
                : `Tạo đơn ${currentPlan.name}`}
          </Button>
        </div>

        {activeOrder && (
          <div className="bg-card neo-border neo-shadow rounded-sm p-6 mb-6">
            <h2 className="text-xl font-black text-foreground mb-4 text-center">
              Quét mã QR để thanh toán
            </h2>

            <div className="flex flex-col items-center">
              <div className="w-64 h-64 bg-muted neo-border rounded-sm flex items-center justify-center mb-4 overflow-hidden">
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt="QR chuyển khoản"
                    className="w-full h-full object-contain p-2"
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
                {activeOrder.status === "pending" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Trạng thái sẽ tự cập nhật mỗi 15 giây khi đơn đang chờ
                    duyệt.
                  </p>
                )}
                {activeOrder.admin_note && (
                  <div className="mt-3 p-2 bg-primary/10 border border-primary/20 rounded-sm">
                    <p className="text-[10px] font-black uppercase text-primary mb-1">Ghi chú từ Admin:</p>
                    <p className="text-sm font-bold text-foreground italic">"{activeOrder.admin_note}"</p>
                  </div>
                )}
              </div>

              {activeOrder.status === "created" && (
                <Button
                  onClick={handleConfirmPaid}
                  className="w-full max-w-xs"
                  variant="secondary"
                  disabled={confirmingOrder}
                >
                  {confirmingOrder
                    ? "Đang xác nhận..."
                    : "Xác nhận đã thanh toán"}
                </Button>
              )}

              {activeOrder.status === "pending" && (
                <p className="text-sm font-bold text-yellow-700">
                  Đơn đang chờ admin duyệt.
                </p>
              )}
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
                    {order.admin_note && (
                      <p className="text-[10px] font-bold text-primary mt-1 truncate">
                        Ghi chú: {order.admin_note}
                      </p>
                    )}
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
