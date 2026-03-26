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

  // Boss Configs (MOCK)
  listBossConfigs: async (): Promise<AdminBossConfig[]> => {
    // Return mock data for now
    return [
      {
        id: "mock-1",
        target_id: "Giao tiếp cơ bản",
        config_type: "stage",
        scenarios: [
          "Bạn đang tham dự một workshop về tài chính và bất ngờ gặp lại người bạn cũ ngồi cạnh",
          "Bạn gặp người lạ tò mò hỏi về công việc của bạn",
        ],
        personalities: [
          "friendly and enthusiastic - người bạn vui vẻ",
          "curious and talkative - người tọc mạch",
        ],
        created_at: new Date().toISOString(),
      },
    ];
  },
  createBossConfig: async (body: Omit<AdminBossConfig, "id" | "created_at">): Promise<AdminBossConfig> => {
    console.log("Mock create boss config", body);
    return { id: "new-mock-id", ...body, created_at: new Date().toISOString() };
  },
  updateBossConfig: async (id: string, body: Partial<AdminBossConfig>): Promise<AdminBossConfig> => {
    console.log("Mock update boss config", id, body);
    return { id, ...body } as AdminBossConfig;
  },
  deleteBossConfig: async (id: string): Promise<void> => {
    console.log("Mock delete boss config", id);
  },

  // Cloudinary
  getUploadSignature: (resourceType = "video") =>
    apiFetch<{
      cloud_name: string;
      api_key: string;
      timestamp: number;
      signature: string;
      folder: string;
      upload_url: string;
    }>(`/admin/upload-signature?resource_type=${resourceType}`, {
      method: "POST",
    }),
};
