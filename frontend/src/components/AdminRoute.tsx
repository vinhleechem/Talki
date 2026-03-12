import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { userService } from "@/services/userService";

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const [status, setStatus] = useState<"loading" | "admin" | "unauthorized" | "unauthenticated">("loading");

  useEffect(() => {
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setStatus("unauthenticated");
        return;
      }
      try {
        const profile = await userService.getMe();
        setStatus(profile.role === "admin" ? "admin" : "unauthorized");
      } catch {
        setStatus("unauthorized");
      }
    };
    check();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-black">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") return <Navigate to="/login" replace />;
  if (status === "unauthorized") return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default AdminRoute;
