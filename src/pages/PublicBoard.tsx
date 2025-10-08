import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/layout/BottomNav";
import { Users, Calendar, Package, Clock, MapPin, User, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";

export default function PublicBoard() {
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      // Load active loans
      const { data: loansData } = await supabase
        .from("borrow_requests")
        .select(`
          *,
          request_items(*, items(name, code, departments(name))),
          borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit, phone)
        `)
        .eq("status", "active")
        .order("started_at", { ascending: false });

      // Load recent completed loans (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentData } = await supabase
        .from("borrow_requests")
        .select(`
          *,
          request_items(*, items(name, code)),
          borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit)
        `)
        .in("status", ["completed"])
        .gte("completed_at", sevenDaysAgo.toISOString())
        .order("completed_at", { ascending: false })
        .limit(10);

      setActiveLoans(loansData || []);
      setRecentActivities(recentData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Realtime subscription
    const channel = supabase
      .channel("public-board")
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "borrow_requests" },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    loadData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-16">
      {/* Enhanced Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-blue-700" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Papan Publik</h1>
            <p className="text-sm sm:text-base text-gray-600 mb-4">Siapa sedang meminjam apa (realtime)</p>
            
            <div className="flex items-center justify-center gap-4 mb-4">
              <Badge className="bg-green-100 text-green-800 border-green-200">
                {activeLoans.length} peminjaman aktif
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        
        {/* Active Loans Section */}
        <Card className="neu-flat">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              Sedang Dipinjam ({activeLoans.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeLoans.length === 0 ? (
              <div className="py-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Tidak ada pinjaman aktif saat ini</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeLoans.map((loan) => (
                  <Card key={loan.id} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                    <CardContent className="py-4">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-green-800">{loan.borrower?.full_name}</p>
                              <p className="text-sm text-green-600">{loan.borrower?.unit}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Aktif
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                              <Calendar className="h-3 w-3" />
                              <span>Kembali: {format(new Date(loan.end_date), "dd MMM yyyy", { locale: id })}</span>
                            </div>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="bg-white/70 rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Alat yang dipinjam:</p>
                          <div className="space-y-1">
                            {loan.request_items?.map((ri: any) => (
                              <div key={ri.id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {ri.quantity}x
                                  </Badge>
                                  <span className="text-gray-700">{ri.items?.name}</span>
                                  <span className="text-xs text-gray-500">({ri.items?.code})</span>
                                </div>
                                <span className="text-xs text-gray-500">{ri.items?.departments?.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {loan.purpose && (
                            <div className="flex items-start gap-2">
                              <Package className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-medium text-gray-700">Keperluan:</span>
                                <p className="text-gray-600">{loan.purpose}</p>
                              </div>
                            </div>
                          )}
                          {loan.location_usage && (
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-medium text-gray-700">Lokasi:</span>
                                <p className="text-gray-600">{loan.location_usage}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Timeline */}
                        <div className="flex items-center gap-2 text-xs text-gray-500 border-t pt-2">
                          <Clock className="h-3 w-3" />
                          <span>Dimulai: {format(new Date(loan.started_at || loan.created_at), "dd MMM yyyy, HH:mm", { locale: id })}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activities Section */}
        <Card className="neu-flat">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Aktivitas Terbaru (7 hari terakhir)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="py-8 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Belum ada aktivitas dalam 7 hari terakhir</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Package className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-800">
                        {activity.borrower?.full_name} - {activity.borrower?.unit}
                      </p>
                      <p className="text-xs text-blue-600 mb-1">
                        Mengembalikan {activity.request_items?.length || 0} alat
                      </p>
                      <div className="text-xs text-blue-500">
                        {format(new Date(activity.completed_at), "dd MMM yyyy, HH:mm", { locale: id })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <BottomNav />
    </div>
  );
}