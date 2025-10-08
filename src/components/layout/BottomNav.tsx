import { useNavigate, useLocation } from "react-router-dom";
import { Package, FileText, Radio, Inbox, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    const fetchUserRoles = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (roles) {
        setUserRoles(roles.map(r => r.role));
      }
    };

    fetchUserRoles();
  }, []);

  const isActive = (path: string) => location.pathname === path;
  
  const showInbox = userRoles.includes('owner') || userRoles.includes('headmaster') || userRoles.includes('admin');

  return (
    <div className="bottom-nav">
      <div className="flex items-center justify-around h-16">
        <button
          onClick={() => navigate("/inventory")}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            isActive("/inventory") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Package className="h-6 w-6" />
          <span className="text-xs mt-1">Inventory</span>
        </button>

        <button
          onClick={() => navigate("/my-requests")}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            isActive("/my-requests") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <FileText className="h-6 w-6" />
          <span className="text-xs mt-1">Requests</span>
        </button>

        <button
          onClick={() => navigate("/realtime-data")}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            isActive("/realtime-data") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Radio className="h-6 w-6" />
          <span className="text-xs mt-1">Public</span>
        </button>

        {showInbox && (
          <button
            onClick={() => {
              if (userRoles.includes('headmaster')) {
                navigate("/headmaster-inbox");
              } else {
                navigate("/owner-inbox");
              }
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${
              isActive("/owner-inbox") || isActive("/headmaster-inbox") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Inbox className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="cart-badge">{unreadCount}</span>
            )}
            <span className="text-xs mt-1">Inbox</span>
          </button>
        )}

        <button
          onClick={() => navigate("/dashboard")}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            isActive("/dashboard") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <User className="h-6 w-6" />
          <span className="text-xs mt-1">Profile</span>
        </button>
      </div>
    </div>
  );
};
