import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Departments from "./pages/Departments";
import Inventory from "./pages/Inventory";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import RequestDetail from "./pages/RequestDetail";
import Profile from "./pages/Profile";
import MyRequests from "./pages/MyRequests";
import Realtime from "./pages/Realtime";
import OwnerInbox from "./pages/OwnerInbox";
import HeadmasterInbox from "./pages/HeadmasterInbox";
import ManageInventory from "./pages/ManageInventory";
import AddItem from "./pages/AddItem";
import BulkUploadItems from "./pages/BulkUploadItems";
import AdminPage from "./pages/AdminPage";
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
          <Route path="/landing" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          
          {/* Protected Routes - New Mobile-First Navigation */}
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/departments" element={<ProtectedRoute><Departments /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/orders/:requestId" element={<ProtectedRoute><RequestDetail /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/my-requests" element={<ProtectedRoute><MyRequests /></ProtectedRoute>} />
          <Route path="/realtime" element={<ProtectedRoute><Realtime /></ProtectedRoute>} />
          
          {/* Admin/Owner Routes */}
          <Route path="/owner-inbox" element={<ProtectedRoute><OwnerInbox /></ProtectedRoute>} />
          <Route path="/headmaster-inbox" element={<ProtectedRoute><HeadmasterInbox /></ProtectedRoute>} />
          <Route path="/manage-inventory" element={<ProtectedRoute><ManageInventory /></ProtectedRoute>} />
          <Route path="/add-item" element={<ProtectedRoute><AddItem /></ProtectedRoute>} />
          <Route path="/edit-item/:id" element={<ProtectedRoute><AddItem /></ProtectedRoute>} />
          <Route path="/bulk-upload-items" element={<ProtectedRoute><BulkUploadItems /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
