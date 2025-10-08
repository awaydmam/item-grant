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
    fetchLoans();

    // Realtime subscription
    const channel = supabase
      .channel("public-loans")
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "borrow_requests" },
        () => fetchLoans()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLoans = async () => {
    const { data } = await supabase
      .from("borrow_requests")
      .select(`
        *,
        request_items(*, item:items(name)),
        borrower:profiles!borrow_requests_borrower_id_fkey(unit)
      `)
      .eq("status", "active")
      .order("started_at", { ascending: false });

    if (data) setActiveLoans(data);
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="container-mobile pt-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Papan Publik</h1>
          <p className="text-muted-foreground">Siapa sedang pinjam apa (realtime)</p>
        </div>

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