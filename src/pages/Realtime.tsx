import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/layout/BottomNav";
import { TrendingUp, Calendar, Package, User, Building2, Clock } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function Realtime() {
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalActive: 0,
    totalToday: 0,
    mostBorrowed: ""
  });

  useEffect(() => {
    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel("realtime-activities")
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "borrow_requests" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      // Active loans
      const { data: activeData } = await supabase
        .from("borrow_requests")
        .select(`
          *,
          request_items(*, item:items(name)),
          borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit)
        `)
        .eq("status", "active")
        .order("started_at", { ascending: false });

      // Recent activities (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { data: recentData } = await supabase
        .from("borrow_requests")
        .select(`
          *,
          request_items(*, item:items(name)),
          borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit)
        `)
        .gte("created_at", yesterday.toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      // Today's requests
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: todayCount } = await supabase
        .from("borrow_requests")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      if (activeData) setActiveLoans(activeData);
      if (recentData) setRecentActivities(recentData);
      
      setStats({
        totalActive: activeData?.length || 0,
        totalToday: todayCount || 0,
        mostBorrowed: "Lab Komputer" // TODO: Calculate from data
      });
    } catch (error) {
      console.error("Error fetching realtime data:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any; color: string }> = {
      active: { label: "Sedang Dipinjam", variant: "default", color: "bg-green-100 text-green-700" },
      pending_owner: { label: "Menunggu Review", variant: "secondary", color: "bg-blue-100 text-blue-700" },
      pending_headmaster: { label: "Menunggu Surat", variant: "secondary", color: "bg-orange-100 text-orange-700" },
      approved: { label: "Disetujui", variant: "default", color: "bg-purple-100 text-purple-700" },
      completed: { label: "Selesai", variant: "outline", color: "bg-gray-100 text-gray-700" },
    };

    const statusInfo = statusMap[status] || { label: status, variant: "secondary", color: "bg-gray-100 text-gray-700" };
    return (
      <Badge variant={statusInfo.variant} className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Baru saja";
    if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} jam lalu`;
    return format(date, "dd MMM, HH:mm", { locale: id });
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-background">
        <div className="container-mobile pt-6 pb-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
              <TrendingUp className="h-6 w-6" />
              Real-time Activity
            </h1>
            <p className="text-muted-foreground">
              Monitor aktivitas peminjaman secara langsung
            </p>
          </div>
        </div>
      </div>

      <div className="container-mobile py-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="neu-flat">
            <CardContent className="p-4 text-center">
              <div className="neu-raised w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 bg-green-100">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.totalActive}</div>
              <div className="text-xs text-muted-foreground">Sedang Dipinjam</div>
            </CardContent>
          </Card>

          <Card className="neu-flat">
            <CardContent className="p-4 text-center">
              <div className="neu-raised w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 bg-blue-100">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalToday}</div>
              <div className="text-xs text-muted-foreground">Pengajuan Hari Ini</div>
            </CardContent>
          </Card>

          <Card className="neu-flat">
            <CardContent className="p-4 text-center">
              <div className="neu-raised w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 bg-purple-100">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-sm font-bold text-purple-600">{stats.mostBorrowed}</div>
              <div className="text-xs text-muted-foreground">Terpopuler</div>
            </CardContent>
          </Card>
        </div>

        {/* Active Loans */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            Sedang Dipinjam ({activeLoans.length})
          </h2>
          
          {activeLoans.length === 0 ? (
            <Card className="neu-flat">
              <CardContent className="py-8 text-center">
                <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Tidak ada alat yang sedang dipinjam</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeLoans.map((loan) => (
                <Card key={loan.id} className="neu-flat">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="neu-raised p-2 rounded-lg bg-green-100">
                            <User className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">{loan.borrower?.full_name}</h4>
                            <p className="text-xs text-muted-foreground">{loan.borrower?.unit}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Sampai {format(new Date(loan.end_date), "dd MMM", { locale: id })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-1">
                        {loan.request_items?.slice(0, 2).map((ri: any) => (
                          <div key={ri.id} className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="font-mono text-xs">
                              {ri.quantity}x
                            </Badge>
                            <span className="text-muted-foreground">{ri.item?.name}</span>
                          </div>
                        ))}
                        {loan.request_items?.length > 2 && (
                          <p className="text-xs text-muted-foreground">
                            +{loan.request_items.length - 2} alat lainnya
                          </p>
                        )}
                      </div>

                      {/* Purpose */}
                      {loan.purpose && (
                        <div className="text-xs text-muted-foreground border-t pt-2">
                          <span className="font-medium">Keperluan:</span> {loan.purpose}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Aktivitas Terbaru
          </h2>
          
          {recentActivities.length === 0 ? (
            <Card className="neu-flat">
              <CardContent className="py-8 text-center">
                <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Belum ada aktivitas terbaru</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentActivities.slice(0, 5).map((activity) => (
                <Card key={activity.id} className="neu-flat">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="neu-raised p-2 rounded-lg bg-blue-100">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-sm truncate">
                            {activity.borrower?.full_name}
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            {getTimeAgo(activity.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {activity.borrower?.unit}
                        </p>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(activity.status)}
                          <span className="text-xs text-muted-foreground">
                            {activity.request_items?.length} alat
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}