import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, FileText, Inbox, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalItems: 0,
    myRequests: 0,
    pendingApprovals: 0,
    activeLoans: 0,
  });
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    fetchStats();
    fetchUserRoles();
  }, []);

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
      link: "/active-loans",
      color: "text-success",
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Selamat datang di sistem peminjaman alat sekolah
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="neu-flat hover:neu-raised transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Alat Tersedia
              </CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalItems}</div>
            </CardContent>
          </Card>

          <Card className="neu-flat hover:neu-raised transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pengajuan Saya
              </CardTitle>
              <FileText className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.myRequests}</div>
            </CardContent>
          </Card>

          {(userRoles.includes("owner") || userRoles.includes("headmaster")) && (
            <Card className="neu-flat hover:neu-raised transition-all cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Menunggu Persetujuan
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
              </CardContent>
            </Card>
          )}

          <Card className="neu-flat hover:neu-raised transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pinjaman Aktif
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeLoans}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Aksi Cepat</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Link key={action.title} to={action.link}>
                <Card className="neu-flat hover:neu-raised transition-all h-full">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="neu-raised p-3 rounded-xl">
                        <action.icon className={`h-6 w-6 ${action.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{action.title}</CardTitle>
                        <CardDescription className="text-sm">
                          {action.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}