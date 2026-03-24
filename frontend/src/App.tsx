import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "@/contexts/UserContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import RoadMap from "./pages/RoadMap";
import ProtectedRoute from "./components/ProtectedRoute";
import Practice from "./pages/Practice";
import BossChallengeWrapper from "./pages/BossChallengeWrapper";
import Achievements from "./pages/Achievements";
import Profile from "./pages/Profile";
import FeedbackHistory from "./pages/FeedbackHistory";
import PhoBan from "./pages/PhoBan";
import Payment from "./pages/Payment";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import AdminRoute from "./components/AdminRoute";
import AdminRedirect from "./components/AdminRedirect";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <UserProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AdminRedirect />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/roadmap"
              element={
                <ProtectedRoute>
                  <RoadMap />
                </ProtectedRoute>
              }
            />
            <Route
              path="/practice"
              element={
                <ProtectedRoute>
                  <Practice />
                </ProtectedRoute>
              }
            />
            <Route
              path="/boss-challenge"
              element={
                <ProtectedRoute>
                  <BossChallengeWrapper />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pho-ban"
              element={
                <ProtectedRoute>
                  <PhoBan />
                </ProtectedRoute>
              }
            />
            <Route
              path="/achievements"
              element={
                <ProtectedRoute>
                  <Achievements />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <FeedbackHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment"
              element={
                <ProtectedRoute>
                  <Payment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </UserProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
