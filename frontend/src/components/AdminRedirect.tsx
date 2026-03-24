import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";

/**
 * Đặt trong BrowserRouter. Nếu user đã load xong và có role=admin,
 * tự động navigate sang /admin (trừ khi đã đang ở /admin rồi).
 */
const AdminRedirect = () => {
  const { profile, loading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && profile?.role === "admin" && location.pathname !== "/admin") {
      navigate("/admin", { replace: true });
    }
  }, [loading, profile, location.pathname, navigate]);

  return null;
};

export default AdminRedirect;
