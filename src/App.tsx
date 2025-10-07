import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/new-request" element={<NewRequest />} />
          <Route path="/my-requests" element={<MyRequests />} />
          <Route path="/owner-inbox" element={<OwnerInbox />} />
          <Route path="/headmaster-inbox" element={<HeadmasterInbox />} />
          <Route path="/active-loans" element={<ActiveLoans />} />
          <Route path="/public-board" element={<PublicBoard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
