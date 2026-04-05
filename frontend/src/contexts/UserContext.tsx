import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { userService } from "@/services/userService";
import type { UserProfile } from "@/types";
import { supabase } from "@/integrations/supabase/client";

interface UserContextValue {
  profile: UserProfile | null;
  hearts: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  profile: null,
  hearts: 0,
  loading: true,
  refresh: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await userService.getMe();
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Làm mới token không đổi profile; bỏ qua để tránh gọi /users/me lặp lại không cần thiết.
      if (event === "TOKEN_REFRESHED") return;
      if (session) void fetchProfile();
      else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const value = useMemo(
    () => ({
      profile,
      hearts: profile?.hearts ?? 0,
      loading,
      refresh: fetchProfile,
    }),
    [profile, loading, fetchProfile],
  );

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
