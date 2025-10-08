import { useNavigate, useLocation } from "react-router-dom";
import { Home, Building2, ShoppingCart, FileText, User, Package, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getTotalItems } = useCart();
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

  const totalItems = getTotalItems();
  const isOwnerOrAdmin = userRoles.includes("owner") || userRoles.includes("admin");

  const tabs = [
    {
      id: "home",
      label: "Home",
      icon: Home,
      path: "/",
      badge: null
    },
    {
      id: "departments",
      label: "Departments",
      icon: Building2,
      path: "/departments",
      badge: null
    },
    {
      id: "cart",
      label: "Cart",
      icon: ShoppingCart,
      path: "/cart",
      badge: totalItems > 0 ? totalItems : null
    },
    ...(isOwnerOrAdmin ? [{
      id: "manage",
      label: "Kelola",
      icon: Package,
      path: "/manage-inventory",
      badge: null
    }] : []),
    {
      id: "orders",
      label: "Orders",
      icon: FileText,
      path: "/orders",
      badge: null
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
      path: "/profile",
      badge: null
    }
  ];

  return (
    <div className="bottom-nav">
      <div className="flex items-center justify-around h-16 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 relative ${
              isActive(tab.path) ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <div className="relative">
              <tab.icon className="h-5 w-5" />
              {tab.badge && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </div>
            <span className="text-xs mt-1 font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
