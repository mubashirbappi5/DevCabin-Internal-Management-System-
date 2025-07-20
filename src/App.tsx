import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Resource from "./pages/Resource";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Auth from "@/pages/Auth";
import NotFound from "./pages/NotFound";
import Team from "@/pages/Team";
import Projects from "@/pages/Projects";
import Tasks from "@/pages/Tasks";
import Clients from "@/pages/Clients";
import Finance from "@/pages/Finance";
import Messages from "@/pages/Messages";
import Settings from "@/pages/Settings";
import WorkSubmissions from "@/pages/WorkSubmissions";
import Attendance from "@/pages/Attendance";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Layout><Dashboard /></Layout>} />
            <Route path="/team" element={<Layout><Team /></Layout>} />
            <Route path="/projects" element={<Layout><Projects /></Layout>} />
            <Route path="/tasks" element={<Layout><Tasks /></Layout>} />
            <Route path="/clients" element={<Layout><Clients /></Layout>} />
            <Route path="/finance" element={<Layout><Finance /></Layout>} />
            <Route path="/messages" element={<Layout><Messages /></Layout>} />
            <Route path="/work-submissions" element={<Layout><WorkSubmissions /></Layout>} />
            <Route path="/attendance" element={<Layout><Attendance /></Layout>} />
            <Route path="/settings" element={<Layout><Settings /></Layout>} />
            <Route path="/resource" element={<Layout><Resource /></Layout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
