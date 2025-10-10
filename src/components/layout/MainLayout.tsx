import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { 
  Package, 
  FileText, 
  Inbox, 
  CheckCircle2, 
  LayoutDashboard, 
  LogOut, 
  User,
  Menu,
  X,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [profile, setProfile] = useState<{full_name?: string; avatar_url?: string; unit?: string} | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setUserRoles([]);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    // Fetch roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    if (roles) {
      setUserRoles(roles.map((r) => r.role));
    }

    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (profileData) {
      setProfile(profileData);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/inventory", icon: Package, label: "Inventaris" },
    { path: "/my-requests", icon: FileText, label: "Pengajuan Saya" },
    ...(userRoles.includes("owner") 
      ? [{ path: "/owner-inbox", icon: Inbox, label: "Kotak Masuk" }] 
      : []),
    ...(userRoles.includes("headmaster")
      ? [{ path: "/headmaster-inbox", icon: Inbox, label: "Persetujuan" }]
      : []),
    { path: "/active-loans", icon: CheckCircle2, label: "Pinjaman Aktif" },
    { path: "/public-board", icon: LayoutDashboard, label: "Papan Publik" },
    ...(userRoles.includes("admin") || userRoles.includes("owner")
      ? [{ path: "/manage-inventory", icon: Package, label: "Kelola Inventaris" }]
      : []),
    ...(userRoles.includes("admin")
      ? [{ path: "/admin", icon: Settings, label: "Panel Admin" }]
      : []),
  ];

  if (!session) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground mb-4">Memuat...</p>
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="neu-raised p-2 rounded-xl">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <span className="font-bold text-xl hidden sm:block">ItemGrant</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive(item.path) ? "default" : "ghost"}
                    size="sm"
                    className={isActive(item.path) ? "neu-pressed" : ""}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">{profile?.unit}</p>
              </div>
              
              <div className="neu-raised p-1 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {profile?.full_name?.charAt(0) || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="neu-flat hover:neu-pressed"
              >
                <LogOut className="h-4 w-4" />
              </Button>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-lg">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant={isActive(item.path) ? "default" : "ghost"}
                    className="w-full justify-start"
                  >
                    <item.icon className="h-4 w-4 mr-3" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}