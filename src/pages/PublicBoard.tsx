import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Calendar } from "lucide-react";
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
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Papan Publik</h1>
          <p className="text-muted-foreground">Siapa sedang pinjam apa (realtime)</p>
        </div>

        {activeLoans.length === 0 ? (
          <Card className="neu-flat">
            <CardContent className="py-12 text-center">
              <LayoutDashboard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Tidak ada pinjaman aktif saat ini</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeLoans.map((loan) => (
              <Card key={loan.id} className="neu-flat hover:neu-raised transition-all">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge>Dipinjam</Badge>
                        <span className="font-medium">{loan.borrower?.unit}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {loan.request_items?.map((ri: any) => (
                          <span key={ri.id} className="text-sm text-muted-foreground">
                            {ri.item?.name} ({ri.quantity}x)
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Kembali: {format(new Date(loan.end_date), "dd MMM", { locale: id })}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}