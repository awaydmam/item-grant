import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, FileText, Inbox, CheckCircle2, Clock, AlertCircle, LogOut, User } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalItems: 0,
    myRequests: 0,
    pendingApprovals: 0,
    activeLoans: 0,
  });
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    fetchStats();
    fetchUserRoles();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (data) {
        setUserProfile(data);
      }
    }
  };

  const fetchUserRoles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      if (data) {
        setUserRoles(data.map((r) => r.role));
      }
    }
  };

  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Total items
    const { count: itemsCount } = await supabase
      .from("items")
      .select("*", { count: "exact", head: true })
      .eq("status", "available");

    // My requests
    const { count: requestsCount } = await supabase
      .from("borrow_requests")
      .select("*", { count: "exact", head: true })
      .eq("borrower_id", user.id);

    // Pending approvals (if owner or headmaster)
    const { count: pendingCount } = await supabase
      .from("borrow_requests")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending_owner", "pending_headmaster"]);

    // Active loans
    const { count: activeCount } = await supabase
      .from("borrow_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    setStats({
      totalItems: itemsCount || 0,
      myRequests: requestsCount || 0,
      pendingApprovals: pendingCount || 0,
      activeLoans: activeCount || 0,
    });
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Gagal logout");
    } else {
      toast.success("Berhasil logout");
      navigate("/auth");
    }
  };

  const quickActions = [
    {
      title: "Ajukan Peminjaman",
      description: "Cari dan ajukan peminjaman alat",
      icon: FileText,
      link: "/inventory",
      color: "text-primary",
    },
    {
      title: "Lihat Pengajuan",
      description: "Pantau status pengajuan Anda",
      icon: Clock,
      link: "/my-requests",
      color: "text-warning",
    },
    ...(userRoles.includes("owner") || userRoles.includes("headmaster")
      ? [{
          title: "Kotak Masuk",
          description: "Review pengajuan peminjaman",
          icon: Inbox,
          link: userRoles.includes("headmaster") ? "/headmaster-inbox" : "/owner-inbox",
          color: "text-accent",
        }]
      : []),
    {
      title: "Pinjaman Aktif",
      description: "Kelola peminjaman aktif",
      icon: CheckCircle2,
      link: "/realtime-data",
      color: "text-success",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="container-mobile pt-6 space-y-6">
        {/* User Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
            <p className="text-muted-foreground text-sm">
              Halo, {userProfile?.full_name || "User"}
            </p>
            {userProfile?.unit && (
              <p className="text-xs text-muted-foreground">{userProfile.unit}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="neu-flat"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Roles */}
        {userRoles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {userRoles.map((role) => (
              <span key={role} className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">
                {role === "borrower" ? "Peminjam" : 
                 role === "owner" ? "Pemilik Alat" :
                 role === "headmaster" ? "Kepala Sekolah" :
                 role === "admin" ? "Admin" : role}
              </span>
            ))}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="neu-flat">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Alat Tersedia
                </CardTitle>
                <Package className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stats.totalItems}</div>
            </CardContent>
          </Card>

          <Card className="neu-flat">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Pengajuan Saya
                </CardTitle>
                <FileText className="h-4 w-4 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stats.myRequests}</div>
            </CardContent>
          </Card>

          {(userRoles.includes("owner") || userRoles.includes("headmaster")) && (
            <Card className="neu-flat">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Menunggu Approval
                  </CardTitle>
                  <AlertCircle className="h-4 w-4 text-accent" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{stats.pendingApprovals}</div>
              </CardContent>
            </Card>
          )}

          <Card className="neu-flat">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Pinjaman Aktif
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stats.activeLoans}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Aksi Cepat</h2>
          <div className="grid grid-cols-1 gap-3">
            {quickActions.map((action) => (
              <Link key={action.title} to={action.link}>
                <Card className="neu-flat hover:neu-raised transition-all">
                  <CardContent className="py-4">
                    <div className="flex items-center space-x-3">
                      <div className="neu-raised p-3 rounded-xl">
                        <action.icon className={`h-5 w-5 ${action.color}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{action.title}</CardTitle>
                        <CardDescription className="text-sm">
                          {action.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}