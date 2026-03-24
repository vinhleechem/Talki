import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";

const AdminRedirect = () => {
  const { profile, loading } = useUser();
  const navigate = useNavigate();
  const redirected = useRef(false);

  useEffect(() => {
    if (!loading && profile?.role === "admin" && !redirected.current) {
      redirected.current = true;
      navigate("/admin", { replace: true });
    }
  }, [loading, profile, navigate]);

  return null;
};

export default AdminRedirect;
