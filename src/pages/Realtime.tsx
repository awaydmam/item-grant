import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/layout/BottomNav";
import { TrendingUp, Calendar, Package, User, Building2, Clock, Activity } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
interface BorrowerProfile {
  id: string;
  full_name?: string;
  unit?: string;
}

interface ItemEntity {
  id: string;
  name?: string;
}

interface RequestItemEntity {
  id: string;
  quantity: number;
  item?: ItemEntity;
}

interface LoanEntity {
  id: string;
  end_date: string;
  purpose?: string;
  borrower?: BorrowerProfile;
  request_items?: RequestItemEntity[];
  status?: string;
  created_at?: string;
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export default function Realtime() {
  const [activeLoans, setActiveLoans] = useState<LoanEntity[]>([]);
  const [recentActivities, setRecentActivities] = useState<LoanEntity[]>([]);
  const [stats, setStats] = useState({
    totalActive: 0,
    totalToday: 0,
    mostBorrowed: "-"
  });
  const [loading, setLoading] = useState(true);

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
      setLoading(true);
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
      // Hitung item/alat paling sering muncul (sederhana) dari activeData
      const freqMap = new Map<string, number>();
      activeData?.forEach((req: LoanEntity) => {
        req.request_items?.forEach((ri: RequestItemEntity) => {
          const key = ri.item?.name || 'Alat';
          freqMap.set(key, (freqMap.get(key) || 0) + ri.quantity);
        });
      });
      const mostBorrowed = [...freqMap.entries()].sort((a,b) => b[1]-a[1])[0]?.[0] || '-';

      setStats({
        totalActive: activeData?.length || 0,
        totalToday: todayCount || 0,
        mostBorrowed
      });
    } catch (error) {
      console.error("Error fetching realtime data:", error);
    }
    finally { setLoading(false); }
  };

  const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; variant: BadgeVariant; color: string }> = {
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

  // Layout baru: dua kolom di desktop
  return (
  <div className="min-h-screen pb-16 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/40 relative text-[15px] md:text-[16px] leading-relaxed">
      {/* Watermark / Brand subtle */}
      <div className="pointer-events-none select-none opacity-[0.04] absolute inset-0 flex items-center justify-center text-[8vw] font-black tracking-tight text-emerald-700">
        DARUL MA'ARIF
      </div>
      {/* Header Kecil Kiri Atas */}
      <div className="sticky top-0 z-30 backdrop-blur-sm bg-white/70 border-b border-emerald-100/60">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-inner text-white font-bold text-sm">
            DA
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-emerald-700 leading-snug tracking-tight">
              Peminjaman Alat Darul Ma'arif
            </h1>
            <p className="text-sm text-emerald-700/70 truncate">
              Monitor real-time pergerakan peminjaman & aktivitas terbaru
            </p>
          </div>
          <div className="hidden md:flex gap-2 text-xs">
            <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium shadow-sm">
              Aktif: {stats.totalActive}
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 font-medium shadow-sm">
              Hari Ini: {stats.totalToday}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 md:py-6 grid gap-6 md:gap-8 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_360px] relative">
        {/* Kolom Utama: Daftar Peminjaman Aktif */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-emerald-700">
              <Package className="h-5 w-5" /> Sedang Dipinjam
              <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                {activeLoans.length}
              </span>
            </h2>
            {loading && <span className="text-xs text-emerald-600 animate-pulse">Memuat...</span>}
          </div>

          {activeLoans.length === 0 && !loading && (
            <Card className="border border-dashed border-emerald-200 bg-white/70">
              <CardContent className="py-10 text-center">
                <Package className="h-10 w-10 mx-auto mb-3 text-emerald-400" />
                <p className="text-sm text-emerald-600">Belum ada peminjaman aktif</p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {activeLoans.map((loan) => {
              const itemsShown = loan.request_items?.slice(0, 3) || [];
              const remaining = (loan.request_items?.length || 0) - itemsShown.length;
              return (
                <div key={loan.id} className="group relative rounded-2xl bg-white/80 backdrop-blur-sm border border-emerald-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600" />
                  <div className="p-4 sm:p-5 pl-5 sm:pl-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center shadow-inner">
                          <User className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base sm:text-lg text-gray-900 leading-snug">
                            {loan.borrower?.full_name}
                          </h3>
                          <p className="text-sm text-emerald-700/80 font-medium mt-0.5">
                            {loan.borrower?.unit}
                          </p>
                          {loan.purpose && (
                            <p className="text-xs mt-1 text-gray-600 line-clamp-1">
                              <span className="font-medium text-emerald-700">Keperluan:</span> {loan.purpose}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex items-center justify-end gap-1 text-xs text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">Selesai {format(new Date(loan.end_date), 'dd MMM', { locale: id })}</span>
                        </div>
                        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-semibold tracking-wide uppercase shadow-sm">
                          Aktif
                        </div>
                      </div>
                    </div>
                    {/* Items */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {itemsShown.map((ri: RequestItemEntity) => (
                        <span key={ri.id} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-700">
                          <span className="font-mono font-semibold text-sm">{ri.quantity}x</span>
                          <span className="truncate max-w-[150px] font-medium">{ri.item?.name}</span>
                        </span>
                      ))}
                      {remaining > 0 && (
                        <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-dashed border-emerald-200 text-xs text-emerald-600">
                          +{remaining} lainnya
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Stats kecil + Aktivitas Terbaru */}
        <div className="space-y-5 md:sticky md:top-20 h-fit">
          {/* Stats Mini */}
          <Card className="bg-white/80 border border-emerald-100 shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <Activity className="h-5 w-5" />
                <h3 className="font-semibold text-base">Statistik Singkat</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-sm text-gray-500 font-medium">Aktif</div>
                  <div className="mt-1 text-base font-bold text-emerald-700">{stats.totalActive}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 font-medium">Hari Ini</div>
                  <div className="mt-1 text-base font-bold text-emerald-700">{stats.totalToday}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 font-medium">Top</div>
                  <div className="mt-1 text-xs sm:text-sm font-semibold text-emerald-700 line-clamp-1">{stats.mostBorrowed}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aktivitas Terbaru Mini */}
            <Card className="bg-white/80 border border-emerald-100 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base text-emerald-700 flex items-center gap-2">
                    <Clock className="h-5 w-5" /> Terbaru
                  </h3>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">
                    {recentActivities.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {recentActivities.length === 0 && !loading && (
                    <p className="text-sm text-gray-500 text-center py-4">Tidak ada aktivitas</p>
                  )}
                  {recentActivities.slice(0,6).map(act => (
                    <div key={act.id} className="flex items-start gap-2">
                      <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 text-sm font-bold">
                        { (act.borrower?.full_name || '?').substring(0,2).toUpperCase() }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                          {act.borrower?.full_name}
                        </p>
                        <p className="text-[11px] text-emerald-600/70 truncate">
                          {act.request_items?.length} alat • {getTimeAgo(act.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}