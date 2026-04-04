import { apiFetch } from "./api";
import type {
  AdminStats,
  AdminUser,
  AdminChapter,
  AdminLesson,
  AdminBoss,
  AdminPayment,
  AdminPaymentConfig,
  AdminConversation,
  AdminEnergyLog,
  AdminAchievement,
  AdminBossConfig,
} from "@/types";

export type {
  AdminStats,
  AdminUser,
  AdminChapter,
  AdminLesson,
  AdminBoss,
  AdminPayment,
  AdminPaymentConfig,
  AdminConversation,
  AdminEnergyLog,
  AdminAchievement,
  AdminBossConfig,
};

export const adminApi = {
  getStats: () => apiFetch<AdminStats>("/admin/stats"),

  listUsers: (skip = 0, limit = 50) =>
    apiFetch<AdminUser[]>(`/admin/users?skip=${skip}&limit=${limit}`),
  createUser: (body: object) =>
    apiFetch<AdminUser>("/admin/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateUser: (
    id: string,
    body: Partial<Pick<AdminUser, "role" | "plan" | "energy">>,
  ) =>
    apiFetch<AdminUser>(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteUser: (id: string) =>
    apiFetch<void>(`/admin/users/${id}`, { method: "DELETE" }),

  // Chapters
  listChapters: () => apiFetch<AdminChapter[]>("/admin/chapters"),
  createChapter: (body: object) =>
    apiFetch<AdminChapter>("/admin/chapters", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateChapter: (id: string, body: object) =>
    apiFetch<AdminChapter>(`/admin/chapters/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteChapter: (id: string) =>
    apiFetch<void>(`/admin/chapters/${id}`, { method: "DELETE" }),

  // Lessons
  listLessons: (chapterId: string) =>
    apiFetch<AdminLesson[]>(`/admin/chapters/${chapterId}/lessons`),
  createLesson: (chapterId: string, body: object) =>
    apiFetch<AdminLesson>(`/admin/chapters/${chapterId}/lessons`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateLesson: (id: string, body: object) =>
    apiFetch<AdminLesson>(`/admin/lessons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteLesson: (id: string) =>
    apiFetch<void>(`/admin/lessons/${id}`, { method: "DELETE" }),

  // Bosses
  listBosses: () => apiFetch<AdminBoss[]>("/admin/bosses"),
  createBoss: (chapterId: string, body: object) =>
    apiFetch<AdminBoss>(`/admin/chapters/${chapterId}/boss`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateBoss: (id: string, body: object) =>
    apiFetch<AdminBoss>(`/admin/bosses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteBoss: (id: string) =>
    apiFetch<void>(`/admin/bosses/${id}`, { method: "DELETE" }),

  // Payments
  listPayments: (skip = 0, limit = 50) =>
    apiFetch<AdminPayment[]>(`/admin/payments?skip=${skip}&limit=${limit}`),
  getPaymentConfig: () => apiFetch<AdminPaymentConfig>("/admin/payment-config"),
  updatePaymentConfig: (
    body: Partial<Omit<AdminPaymentConfig, "updated_at">>,
  ) =>
    apiFetch<AdminPaymentConfig>("/admin/payment-config", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  reviewPayment: (
    id: string,
    body: {
      status: "pending" | "paid" | "failed" | "cancelled";
      admin_note?: string | null;
    },
  ) =>
    apiFetch<AdminPayment>(`/admin/payments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  // Conversations
  listConversations: (skip = 0, limit = 20) =>
    apiFetch<AdminConversation[]>(
      `/admin/conversations?skip=${skip}&limit=${limit}`,
    ),

  // Energy logs
  listEnergyLogs: (skip = 0, limit = 100) =>
    apiFetch<AdminEnergyLog[]>(
      `/admin/energy-logs?skip=${skip}&limit=${limit}`,
    ),

  // Achievements
  listAchievements: () => apiFetch<AdminAchievement[]>("/admin/achievements"),
  createAchievement: (body: object) =>
    apiFetch<AdminAchievement>("/admin/achievements", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateAchievement: (id: string, body: object) =>
    apiFetch<AdminAchievement>(`/admin/achievements/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteAchievement: (id: string) =>
    apiFetch<void>(`/admin/achievements/${id}`, { method: "DELETE" }),

  // Boss Configs (real API)
  listBossConfigs: () =>
    apiFetch<AdminBossConfig[]>("/admin/boss-configs"),
  createBossConfig: (body: Omit<AdminBossConfig, "id" | "created_at">) =>
    apiFetch<AdminBossConfig>("/admin/boss-configs", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateBossConfig: (id: string, body: Partial<AdminBossConfig>) =>
    apiFetch<AdminBossConfig>(`/admin/boss-configs/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteBossConfig: (id: string) =>
    apiFetch<void>(`/admin/boss-configs/${id}`, { method: "DELETE" }),

  // Cloudinary
  getUploadSignature: (resourceType = "video", folder?: string) => {
    let url = `/admin/upload-signature?resource_type=${resourceType}`;
    if (folder) url += `&folder=${encodeURIComponent(folder)}`;
    return apiFetch<{
      cloud_name: string;
      api_key: string;
      timestamp: number;
      signature: string;
      folder: string;
      upload_url: string;
    }>(url, { method: "POST" });
  },
};
