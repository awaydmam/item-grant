import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Inventory from "./pages/Inventory";
import NewRequest from "./pages/NewRequest";
import MyRequests from "./pages/MyRequests";
import OwnerInbox from "./pages/OwnerInbox";
import HeadmasterInbox from "./pages/HeadmasterInbox";
import ActiveLoans from "./pages/ActiveLoans";
import PublicBoard from "./pages/PublicBoard";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/realtime-data" element={<PublicBoard />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
          <Route path="/new-request" element={<ProtectedRoute><NewRequest /></ProtectedRoute>} />
          <Route path="/my-requests" element={<ProtectedRoute><MyRequests /></ProtectedRoute>} />
          <Route path="/owner-inbox" element={<ProtectedRoute><OwnerInbox /></ProtectedRoute>} />
          <Route path="/headmaster-inbox" element={<ProtectedRoute><HeadmasterInbox /></ProtectedRoute>} />
          <Route path="/active-loans" element={<ProtectedRoute><ActiveLoans /></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
