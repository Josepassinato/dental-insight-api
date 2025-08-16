import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import EmbedViewer from "./pages/EmbedViewer";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import Integrations from "./pages/Integrations";
import BackupExport from "./pages/BackupExport";
import ExamDetail from "./pages/ExamDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/backup" element={<BackupExport />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/exam/:examId" element={<ExamDetail />} />
          <Route path="/embed/viewer/:examId" element={<EmbedViewer />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
