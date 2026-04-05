import { apiFetch } from "./api";
import type {
  ManualPaymentConfig,
  ManualPaymentOrder,
  PaymentPlan,
} from "@/types";

export const paymentApi = {
  getConfig: () => apiFetch<ManualPaymentConfig>("/payments/config"),
  createOrder: (plan: PaymentPlan) =>
    apiFetch<ManualPaymentOrder>("/payments/orders", {
      method: "POST",
      body: JSON.stringify({ plan }),
    }),
  confirmOrder: (orderId: string) =>
    apiFetch<ManualPaymentOrder>(`/payments/orders/${orderId}/confirm`, {
      method: "POST",
    }),
  listMyOrders: () => apiFetch<ManualPaymentOrder[]>("/payments/my-orders"),
};
