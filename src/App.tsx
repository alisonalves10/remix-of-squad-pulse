import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Squads from "./pages/Squads";
import SprintDetail from "./pages/Sprints";
import Professionals from "./pages/Professionals";
import Ranking from "./pages/Ranking";
import Roadmap from "./pages/Roadmap";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/squads" element={<ProtectedRoute><Squads /></ProtectedRoute>} />
            <Route path="/squads/:id" element={<ProtectedRoute><Squads /></ProtectedRoute>} />
            <Route path="/sprints" element={<ProtectedRoute><SprintDetail /></ProtectedRoute>} />
            <Route path="/sprints/:id" element={<ProtectedRoute><SprintDetail /></ProtectedRoute>} />
            <Route path="/professionals" element={<ProtectedRoute><Professionals /></ProtectedRoute>} />
            <Route path="/ranking" element={<ProtectedRoute><Ranking /></ProtectedRoute>} />
            <Route path="/roadmap" element={<ProtectedRoute><Roadmap /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
