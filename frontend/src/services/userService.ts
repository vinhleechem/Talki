import { apiFetch } from "./api";
import type { UserProfile, UserMistake } from "@/types";

export const userService = {
  getMe(): Promise<UserProfile> {
    return apiFetch<UserProfile>("/users/me");
  },

  updateMe(data: { display_name?: string; avatar_url?: string }): Promise<UserProfile> {
    return apiFetch<UserProfile>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};
