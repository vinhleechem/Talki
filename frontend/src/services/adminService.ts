import { apiFetch } from "./api";
import type {
  AdminStats,
  AdminUser,
  AdminChapter,
  AdminLesson,
  AdminBoss,
  AdminPayment,
  AdminConversation,
  AdminEnergyLog,
  AdminAchievement,
} from "@/types";

export type {
  AdminStats,
  AdminUser,
  AdminChapter,
  AdminLesson,
  AdminBoss,
  AdminPayment,
  AdminConversation,
  AdminEnergyLog,
  AdminAchievement,
};

export const adminApi = {
  getStats: () => apiFetch<AdminStats>("/admin/stats"),

  listUsers: (skip = 0, limit = 50) => apiFetch<AdminUser[]>(`/admin/users?skip=${skip}&limit=${limit}`),
  createUser: (body: object) => apiFetch<AdminUser>("/admin/users", { method: "POST", body: JSON.stringify(body) }),
  updateUser: (id: string, body: Partial<Pick<AdminUser, "role" | "plan" | "energy">>) =>
    apiFetch<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteUser: (id: string) => apiFetch<void>(`/admin/users/${id}`, { method: "DELETE" }),

  // Chapters
  listChapters: () => apiFetch<AdminChapter[]>("/admin/chapters"),
  createChapter: (body: object) =>
    apiFetch<AdminChapter>("/admin/chapters", { method: "POST", body: JSON.stringify(body) }),
  updateChapter: (id: string, body: object) =>
    apiFetch<AdminChapter>(`/admin/chapters/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteChapter: (id: string) => apiFetch<void>(`/admin/chapters/${id}`, { method: "DELETE" }),

  // Lessons
  listLessons: (chapterId: string) => apiFetch<AdminLesson[]>(`/admin/chapters/${chapterId}/lessons`),
  createLesson: (chapterId: string, body: object) =>
    apiFetch<AdminLesson>(`/admin/chapters/${chapterId}/lessons`, { method: "POST", body: JSON.stringify(body) }),
  updateLesson: (id: string, body: object) =>
    apiFetch<AdminLesson>(`/admin/lessons/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteLesson: (id: string) => apiFetch<void>(`/admin/lessons/${id}`, { method: "DELETE" }),

  // Bosses
  listBosses: () => apiFetch<AdminBoss[]>("/admin/bosses"),
  createBoss: (chapterId: string, body: object) =>
    apiFetch<AdminBoss>(`/admin/chapters/${chapterId}/boss`, { method: "POST", body: JSON.stringify(body) }),
  updateBoss: (id: string, body: object) =>
    apiFetch<AdminBoss>(`/admin/bosses/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteBoss: (id: string) => apiFetch<void>(`/admin/bosses/${id}`, { method: "DELETE" }),

  // Payments
  listPayments: (skip = 0, limit = 50) => apiFetch<AdminPayment[]>(`/admin/payments?skip=${skip}&limit=${limit}`),

  // Conversations
  listConversations: (skip = 0, limit = 20) =>
    apiFetch<AdminConversation[]>(`/admin/conversations?skip=${skip}&limit=${limit}`),

  // Energy logs
  listEnergyLogs: (skip = 0, limit = 100) =>
    apiFetch<AdminEnergyLog[]>(`/admin/energy-logs?skip=${skip}&limit=${limit}`),

  // Achievements
  listAchievements: () => apiFetch<AdminAchievement[]>("/admin/achievements"),
  createAchievement: (body: object) =>
    apiFetch<AdminAchievement>("/admin/achievements", { method: "POST", body: JSON.stringify(body) }),
  updateAchievement: (id: string, body: object) =>
    apiFetch<AdminAchievement>(`/admin/achievements/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteAchievement: (id: string) => apiFetch<void>(`/admin/achievements/${id}`, { method: "DELETE" }),

  // Cloudinary
  getUploadSignature: (resourceType = "video") =>
    apiFetch<{
      cloud_name: string;
      api_key: string;
      timestamp: number;
      signature: string;
      folder: string;
      upload_url: string;
    }>(`/admin/upload-signature?resource_type=${resourceType}`, { method: "POST" }),
};
