import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/layout/BottomNav";
import { Users, Calendar, Package } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function PublicBoard() {
  const [activeLoans, setActiveLoans] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    
    const loadActiveLoans = async () => {
      try {
        const { data } = await supabase
          .from("borrow_requests")
          .select(`
            *,
            request_items(*, item:items(name)),
            borrower:profiles!borrow_requests_borrower_id_fkey(unit)
          `)
          .eq("status", "active")
          .order("started_at", { ascending: false });

        if (isMounted && data) {
          setActiveLoans(data);
        }
      } catch (error) {
        console.error("Error loading active loans:", error);
      }
    };

    loadActiveLoans();

    // Realtime subscription
    const channel = supabase
      .channel("public-loans")
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "borrow_requests" },
        () => {
          if (isMounted) loadActiveLoans();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

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
            <p className="text-sm sm:text-base text-gray-600">Siapa sedang meminjam apa (realtime)</p>
            <Badge className="mt-2 bg-green-100 text-green-800 border-green-200">
              {activeLoans.length} peminjaman aktif
            </Badge>
          </div>
        </div>
      </div>

      {/* Enhanced Content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">

        {activeLoans.length === 0 ? (
          <Card className="neu-flat">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Tidak ada pinjaman aktif saat ini</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeLoans.map((loan) => (
              <Card key={loan.id} className="neu-flat hover:neu-raised transition-all">
                <CardContent className="py-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Dipinjam
                        </Badge>
                        <span className="font-medium text-sm">{loan.borrower?.unit}</span>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Kembali: {format(new Date(loan.end_date), "dd MMM", { locale: id })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-1">
                      {loan.request_items?.map((ri: any) => (
                        <div key={ri.id} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="font-mono text-xs">
                            {ri.quantity}x
                          </Badge>
                          <span className="text-muted-foreground">{ri.item?.name}</span>
                        </div>
                      ))}
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
      <BottomNav />
    </div>
  );
}