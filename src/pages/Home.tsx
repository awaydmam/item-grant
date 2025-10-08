import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/layout/BottomNav";
import { useCart } from "@/hooks/use-cart";
import { 
  Home as HomeIcon, 
  Package, 
  FileText, 
  Clock, 
  TrendingUp, 
  ShoppingCart,
  Building2,
  Users,
  ArrowRight,
  Bell
} from "lucide-react";

export default function Home() {
  const { totalItems } = useCart();
  const [stats, setStats] = useState({
    totalItems: 0,
    myRequests: 0,
    pendingApprovals: 0,
    activeLoans: 0,
    totalDepartments: 0,
  });
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchUserData();
    fetchStats();
    fetchRecentActivity();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // Get roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (profile) setUserProfile(profile);
      if (roles) setUserRoles(roles.map(r => r.role));
    }
  };

  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Total items available
    const { count: itemsCount } = await supabase
      .from("items")
      .select("*", { count: "exact", head: true })
      .eq("status", "available");

    // Total departments
    const { count: deptCount } = await supabase
      .from("departments")
      .select("*", { count: "exact", head: true });

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
      totalDepartments: deptCount || 0,
      myRequests: requestsCount || 0,
      pendingApprovals: pendingCount || 0,
      activeLoans: activeCount || 0,
    });
  };

  const fetchRecentActivity = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        status,
        created_at,
        purpose,
        request_items(item:items(name))
      `)
      .eq("borrower_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (data) setRecentActivity(data);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Selamat Pagi";
    if (hour < 17) return "Selamat Siang";
    return "Selamat Sore";
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      borrower: "Peminjam",
      owner: "Pemilik Alat",
      headmaster: "Kepala Sekolah",
      admin: "Administrator"
    };
    return roleMap[role] || role;
  };

  const quickActions = [
    {
      title: "Pilih Alat",
      description: "Browse alat by departemen",
      icon: Building2,
      link: "/departments",
      color: "text-primary",
      gradient: "from-primary/10 to-primary/5"
    },
    {
      title: "Keranjang",
      description: `${totalItems} alat dipilih`,
      icon: ShoppingCart,
      link: "/cart",
      color: "text-orange-600",
      gradient: "from-orange-100 to-orange-50",
      badge: totalItems > 0 ? totalItems : undefined
    },
    {
      title: "Pengajuan Saya",
      description: "Track status peminjaman",
      icon: FileText,
      link: "/orders",
      color: "text-blue-600",
      gradient: "from-blue-100 to-blue-50"
    },
    {
      title: "Aktivitas Real-time",
      description: "Lihat peminjaman aktif",
      icon: TrendingUp,
      link: "/realtime",
      color: "text-green-600",
      gradient: "from-green-100 to-green-50"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-16">
      {/* Enhanced Hero Section */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="space-y-4">
            {/* Enhanced Greeting */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
                <span className="text-xl font-bold text-blue-700">
                  {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{getGreeting()}!</h1>
                <p className="text-base sm:text-lg text-gray-600">
                  {userProfile?.full_name || "User"}
                </p>
                {userProfile?.unit && (
                  <p className="text-sm text-gray-500">{userProfile.unit}</p>
                )}
              </div>
              
              {/* Cart Button */}
              {totalItems > 0 && (
                <Link to="/cart">
                  <Button size="sm" className="relative bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-4 py-2">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Keranjang</span>
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 bg-red-500 text-white text-xs flex items-center justify-center">
                      {totalItems}
                    </Badge>
                  </Button>
                </Link>
              )}
            </div>

            {/* Enhanced Roles */}
            {userRoles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {userRoles.map((role) => (
                  <Badge key={role} variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 rounded-full px-3 py-1">
                    {getRoleLabel(role)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalItems}</div>
              <div className="text-xs sm:text-sm text-gray-600 font-medium">Alat Tersedia</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalDepartments}</div>
              <div className="text-xs sm:text-sm text-gray-600 font-medium">Departemen</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.myRequests}</div>
              <div className="text-xs sm:text-sm text-gray-600 font-medium">Pengajuan Saya</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.activeLoans}</div>
              <div className="text-xs sm:text-sm text-gray-600 font-medium">Sedang Dipinjam</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Aksi Cepat</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link key={action.title} to={action.link}>
                <Card className="neu-flat hover:neu-raised transition-all h-full">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="relative">
                        <div className={`neu-raised w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${action.gradient}`}>
                          <action.icon className={`h-6 w-6 ${action.color}`} />
                        </div>
                        {action.badge && (
                          <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs">
                            {action.badge}
                          </Badge>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{action.title}</h3>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Aktivitas Terbaru</h2>
              <Link to="/orders">
                <Button variant="ghost" size="sm" className="text-primary">
                  Lihat Semua <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {recentActivity.slice(0, 2).map((activity) => (
                <Card key={activity.id} className="neu-flat">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="neu-raised p-2 rounded-lg">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {activity.purpose}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.request_items?.length} alat • {activity.status}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {activity.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Inbox for Owners/Headmasters */}
        {(userRoles.includes("owner") || userRoles.includes("headmaster")) && stats.pendingApprovals > 0 && (
          <Card className="neu-raised border-orange-200 bg-orange-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="neu-raised p-2 rounded-lg bg-orange-100">
                  <Bell className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-800">Perlu Review</h3>
                  <p className="text-sm text-orange-700">
                    {stats.pendingApprovals} pengajuan menunggu persetujuan
                  </p>
                </div>
                <Link to={userRoles.includes("headmaster") ? "/headmaster-inbox" : "/owner-inbox"}>
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                    Review
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
}