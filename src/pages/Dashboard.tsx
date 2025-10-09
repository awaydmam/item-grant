import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, FileText, Inbox, CheckCircle2, Clock, AlertCircle, LogOut, User } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalItems: 0,
    availableItems: 0,
    borrowedItems: 0,
    unavailableItems: 0,
    myRequests: 0,
    pendingApprovals: 0,
    activeLoans: 0,
  });
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<{ full_name?: string; unit?: string } | null>(null);

  const fetchUserProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name, unit")
      .eq("id", user.id)
      .maybeSingle();
    if (data) setUserProfile(data);
  }, []);

  const fetchUserRoles = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (data) setUserRoles(data.map(r => r.role));
  }, []);

  const fetchStats = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Items & borrowed calc
    const { data: allItems } = await supabase.from("items").select("id, quantity");
    const { data: activeRequests } = await supabase
      .from("borrow_requests")
      .select(`request_items(item_id, quantity)`) // only counts
      .in("status", ["approved", "active"]);

    const borrowedMap = new Map<string, number>();
    activeRequests?.forEach(req => {
      req.request_items?.forEach((ri: { item_id: string; quantity: number }) => {
        borrowedMap.set(ri.item_id, (borrowedMap.get(ri.item_id) || 0) + ri.quantity);
      });
    });

    let totalItems = 0; let availableItems = 0; let borrowedItems = 0; let unavailableItems = 0;
    allItems?.forEach(it => {
      const borrowed = borrowedMap.get(it.id) || 0;
      const available = Math.max(0, it.quantity - borrowed);
      totalItems++;
      if (available > 0) availableItems++; else unavailableItems++;
      if (borrowed > 0) borrowedItems++;
    });

    // My requests
    const { count: myRequests } = await supabase
      .from("borrow_requests")
      .select("id", { count: "exact", head: true })
      .eq("borrower_id", user.id);

    // Active loans
    const { count: activeLoans } = await supabase
      .from("borrow_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    // Pending approvals filtered
    let pendingApprovals = 0;
    if (userRoles.includes('owner')) {
      // Pull pending_owner and filter by department via join traversal
      const { data: pendingOwner } = await supabase
        .from('borrow_requests')
        .select(`id, request_items(item:items(department:departments(name)))`)
        .eq('status', 'pending_owner');
      const { data: ownerRole } = await supabase
        .from('user_roles')
        .select('department')
        .eq('user_id', user.id)
        .eq('role', 'owner')
        .maybeSingle();
      const ownerDeptName = ownerRole?.department;
      if (ownerDeptName) {
        interface PendingOwnerItem { item?: { department?: { name?: string } } }
        interface PendingOwnerReq { request_items?: PendingOwnerItem[] }
        const filtered = (pendingOwner as PendingOwnerReq[] || []).filter(r =>
          r.request_items?.some((ri: PendingOwnerItem) => ri.item?.department?.name === ownerDeptName)
        );
        pendingApprovals += filtered.length;
      }
    }
    if (userRoles.includes('headmaster')) {
      const { count: headPending } = await supabase
        .from('borrow_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_headmaster');
      pendingApprovals += headPending || 0;
    }

    setStats({
      totalItems,
      availableItems,
      borrowedItems,
      unavailableItems,
      myRequests: myRequests || 0,
      pendingApprovals,
      activeLoans: activeLoans || 0,
    });
  }, [userRoles]);

  useEffect(() => {
    fetchUserRoles();
  }, [fetchUserRoles]);

  useEffect(() => {
    // setelah roles siap, ambil stats & profil
    fetchStats();
    fetchUserProfile();
    const interval = setInterval(fetchStats, 30000);
    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'borrow_requests' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'request_items' }, () => fetchStats())
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [fetchStats, fetchUserProfile]);

  const fetchStats = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: allItems } = await supabase
      .from("items")
      .select("id, quantity");

    const { data: activeRequests } = await supabase
      .from("borrow_requests")
      .select(`
        request_items (
          item_id,
          quantity
        )
      `)
      .in("status", ["approved", "active"]);

    const borrowedMap = new Map<string, number>();
    activeRequests?.forEach(request => {
      request.request_items?.forEach((item: { item_id: string; quantity: number }) => {
        const current = borrowedMap.get(item.item_id) || 0;
        borrowedMap.set(item.item_id, current + item.quantity);
      });
    });

    let totalItems = 0;
    let availableItems = 0;
    let borrowedItems = 0;
    let unavailableItems = 0;

    allItems?.forEach(item => {
      const borrowed = borrowedMap.get(item.id) || 0;
      const available = Math.max(0, item.quantity - borrowed);
      totalItems++;
      if (available > 0) availableItems++; else unavailableItems++;
      if (borrowed > 0) borrowedItems++;
    });

    const { count: requestsCount } = await supabase
      .from("borrow_requests")
      .select("*", { count: "exact", head: true })
      .eq("borrower_id", user.id);

    // Pending approvals filtered sesuai role & departemen
    let pendingApprovals = 0;
    if (userRoles.includes('owner')) {
      const { data: ownerRole } = await supabase
        .from('user_roles')
        .select('department')
        .eq('user_id', user.id)
        .eq('role', 'owner')
        .maybeSingle();
      const ownerDept = ownerRole?.department;
      if (ownerDept) {
        // (Optimisasi ke depan: tambahkan kolom department ke borrow_requests untuk count cepat)
        const { data: ownerPendRaw } = await supabase
          .from('borrow_requests')
          .select('id, request_items(item:items(department:departments(name)))')
          .eq('status', 'pending_owner');
        interface PendingOwnerItem2 { item?: { department?: { name?: string } } }
        interface PendingOwnerReq2 { request_items?: PendingOwnerItem2[] }
        const ownerFiltered = (ownerPendRaw as PendingOwnerReq2[] || []).filter(r =>
          r.request_items?.some((ri: PendingOwnerItem2) => ri.item?.department?.name === ownerDept)
        );
        pendingApprovals += ownerFiltered.length;
      }
    }
    if (userRoles.includes('headmaster')) {
      const { count: headPending } = await supabase
        .from('borrow_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_headmaster');
      pendingApprovals += headPending || 0;
    }

    const { count: activeCount } = await supabase
      .from("borrow_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    setStats({
      totalItems,
      availableItems,
      borrowedItems,
      unavailableItems,
      myRequests: requestsCount || 0,
      pendingApprovals,
      activeLoans: activeCount || 0,
    });
  }, [userRoles]);

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
          <Button variant="outline" size="sm" onClick={handleLogout} className="neu-flat">
            <LogOut className="h-4 w-4 mr-2" /> Logout
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Items */}
          <Card className="neu-flat">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Total Alat
                </CardTitle>
                <Package className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stats.totalItems}</div>
              <p className="text-xs text-muted-foreground">Semua kategori</p>
            </CardContent>
          </Card>

          {/* Available Items */}
          <Card className="neu-flat">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Tersedia
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-success">{stats.availableItems}</div>
              <p className="text-xs text-muted-foreground">Bisa dipinjam</p>
            </CardContent>
          </Card>

          {/* Borrowed Items */}
          <Card className="neu-flat">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Sedang Dipinjam
                </CardTitle>
                <Clock className="h-4 w-4 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-warning">{stats.borrowedItems}</div>
              <p className="text-xs text-muted-foreground">Dalam peminjaman</p>
            </CardContent>
          </Card>

          {/* Unavailable Items */}
          <Card className="neu-flat">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Tidak Tersedia
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-destructive">{stats.unavailableItems}</div>
              <p className="text-xs text-muted-foreground">Habis/maintenance</p>
            </CardContent>
          </Card>
        </div>

        {/* User Activity Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="neu-flat">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Pengajuan Saya
                </CardTitle>
                <FileText className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stats.myRequests}</div>
              <p className="text-xs text-muted-foreground">Total pengajuan</p>
            </CardContent>
          </Card>

          {(userRoles.includes("owner") || userRoles.includes("headmaster")) && (
            <Card className="neu-flat">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Menunggu Approval
                  </CardTitle>
                  <Inbox className="h-4 w-4 text-accent" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{stats.pendingApprovals}</div>
                <p className="text-xs text-muted-foreground">Perlu ditinjau</p>
              </CardContent>
            </Card>
          )}

          {!userRoles.includes("owner") && !userRoles.includes("headmaster") && (
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
                <p className="text-xs text-muted-foreground">Sedang berjalan</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Aksi Cepat</h2>
          <div className="grid grid-cols-1 gap-3">
            {quickActions.map(action => (
              <Link key={action.title} to={action.link}>
                <Card className="neu-flat hover:neu-raised transition-all">
                  <CardContent className="py-4">
                    <div className="flex items-center space-x-3">
                      <div className="neu-raised p-3 rounded-xl">
                        <action.icon className={`h-5 w-5 ${action.color}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{action.title}</CardTitle>
                        <CardDescription className="text-sm">{action.description}</CardDescription>
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