import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/components/ui/use-toast";

type PlanType = "monthly" | "annual";

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { plan } = location.state || { plan: "monthly" };
  
  const [selectedMethod, setSelectedMethod] = useState<"momo" | "vnpay" | null>(null);

  const planDetails = {
    monthly: {
      name: "Gói Tháng",
      price: "99,000đ",
      duration: "/tháng"
    },
    annual: {
      name: "Gói Năm",
      price: "999,000đ",
      duration: "/năm"
    }
  };

  const currentPlan = planDetails[plan as PlanType] || planDetails.monthly;

  const handlePaymentMethodSelect = (method: "momo" | "vnpay") => {
    setSelectedMethod(method);
  };

  const handleConfirmPayment = () => {
    // Simulate payment processing
    toast({
      title: "Đang xử lý thanh toán...",
      description: "Vui lòng quét mã QR để hoàn tất giao dịch.",
    });
  };

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
                <h2 className="text-xl font-black text-foreground">{currentPlan.name}</h2>
                <p className="text-sm text-muted-foreground">Gói cao cấp</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-primary">{currentPlan.price}</div>
              <div className="text-xs text-muted-foreground">{currentPlan.duration}</div>
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

        {/* Payment Methods */}
        <div className="bg-card neo-border neo-shadow rounded-sm p-6 mb-6">
          <h2 className="text-xl font-black text-foreground mb-4">
            Chọn phương thức thanh toán
          </h2>

          <div className="space-y-4">
            {/* Momo */}
            <button
              onClick={() => handlePaymentMethodSelect("momo")}
              className={`w-full p-4 rounded-sm neo-border transition-all ${
                selectedMethod === "momo"
                  ? "bg-primary/10 border-primary"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#A50064] rounded-sm flex items-center justify-center">
                  <span className="text-white font-black text-xl">M</span>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-black text-foreground">Momo</h3>
                  <p className="text-sm text-muted-foreground">Ví điện tử Momo</p>
                </div>
                {selectedMethod === "momo" && (
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                )}
              </div>
            </button>

            {/* VNPay */}
            <button
              onClick={() => handlePaymentMethodSelect("vnpay")}
              className={`w-full p-4 rounded-sm neo-border transition-all ${
                selectedMethod === "vnpay"
                  ? "bg-primary/10 border-primary"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#0066B3] rounded-sm flex items-center justify-center">
                  <span className="text-white font-black text-sm">VNPay</span>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-black text-foreground">VNPay</h3>
                  <p className="text-sm text-muted-foreground">Cổng thanh toán VNPay</p>
                </div>
                {selectedMethod === "vnpay" && (
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* QR Code Display */}
        {selectedMethod && (
          <div className="bg-card neo-border neo-shadow rounded-sm p-6 mb-6">
            <h2 className="text-xl font-black text-foreground mb-4 text-center">
              Quét mã QR để thanh toán
            </h2>
            
            <div className="flex flex-col items-center">
              <div className="w-64 h-64 bg-muted neo-border rounded-sm flex items-center justify-center mb-4">
                <div className="text-center">
                  <div className="text-6xl mb-2">📱</div>
                  <p className="text-sm font-bold text-muted-foreground">
                    Mã QR {selectedMethod === "momo" ? "Momo" : "VNPay"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    (Demo - sẽ tích hợp API thật)
                  </p>
                </div>
              </div>
              
              <div className="text-center mb-4">
                <p className="text-sm font-bold text-foreground mb-1">
                  Số tiền: <span className="text-primary text-lg">{currentPlan.price}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Mở ứng dụng {selectedMethod === "momo" ? "Momo" : "VNPay"} và quét mã
                </p>
              </div>

              <Button 
                onClick={handleConfirmPayment}
                className="w-full max-w-xs"
                variant="secondary"
              >
                Tôi đã thanh toán
              </Button>
            </div>
          </div>
        )}

        {/* Confirm Button */}
        {!selectedMethod && (
          <Button 
            disabled
            className="w-full"
            variant="secondary"
          >
            Chọn phương thức thanh toán
          </Button>
        )}
      </div>
    </div>
  );
};

export default Payment;
