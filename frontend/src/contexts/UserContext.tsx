import React, { createContext, useContext, useEffect, useState } from "react";
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

  const fetchProfile = async () => {
    try {
      const data = await userService.getMe();
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) fetchProfile();
      else {
        setProfile(null);
        setLoading(false);
      }
    });
  }, []);

  return (
    <UserContext.Provider value={{ profile, hearts: profile?.hearts ?? 0, loading, refresh: fetchProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
