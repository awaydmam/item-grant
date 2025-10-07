import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function ActiveLoans() {
  const [loans, setLoans] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    
    if (roles) setUserRoles(roles.map((r) => r.role));

    // Fetch approved and active loans
    const { data } = await supabase
      .from("borrow_requests")
      .select(`
        *,
        request_items(*, item:items(name, department:departments(name))),
        borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit)
      `)
      .in("status", ["approved", "active"])
      .order("start_date", { ascending: true });

    if (data) setLoans(data);
  };

  const handleStartUsing = async (loanId: string) => {
    const { error } = await supabase
      .from("borrow_requests")
      .update({
        status: "active",
        started_at: new Date().toISOString(),
      })
      .eq("id", loanId);

    if (error) {
      toast.error("Gagal memulai peminjaman");
      return;
    }

    // Update items to borrowed
    const loan = loans.find(l => l.id === loanId);
    if (loan?.request_items) {
      for (const ri of loan.request_items) {
        await supabase
          .from("items")
          .update({ status: "borrowed" })
          .eq("id", ri.item_id);
      }
    }

    toast.success("Konfirmasi Mulai Pakai berhasil");
    fetchData();
  };

  const handleReturn = async (loanId: string) => {
    const { error } = await supabase
      .from("borrow_requests")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", loanId);

    if (error) {
      toast.error("Gagal menyelesaikan peminjaman");
      return;
    }

    // Restore items
    const loan = loans.find(l => l.id === loanId);
    if (loan?.request_items) {
      for (const ri of loan.request_items) {
        const { data: item } = await supabase
          .from("items")
          .select("available_quantity")
          .eq("id", ri.item_id)
          .single();

        if (item) {
          await supabase
            .from("items")
            .update({
              available_quantity: item.available_quantity + ri.quantity,
              status: "available"
            })
            .eq("id", ri.item_id);
        }
      }
    }

    toast.success("Konfirmasi Kembali berhasil");
    fetchData();
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Pinjaman Aktif</h1>
          <p className="text-muted-foreground">Kelola serah terima dan pengembalian alat</p>
        </div>

        {loans.length === 0 ? (
          <Card className="neu-flat">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Tidak ada pinjaman aktif</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {loans.map((loan) => (
              <Card key={loan.id} className="neu-flat">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{loan.borrower?.full_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{loan.borrower?.unit}</p>
                    </div>
                    <Badge variant={loan.status === "active" ? "default" : "secondary"}>
                      {loan.status === "active" ? "Dipinjam" : "Siap Ambil"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {loan.request_items?.map((ri: any) => (
                      <div key={ri.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <span className="text-sm font-medium">{ri.item?.name}</span>
                        <Badge variant="outline">{ri.quantity}x</Badge>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Kembali: {format(new Date(loan.end_date), "dd MMM yyyy", { locale: id })}
                    </span>
                  </div>

                  {loan.status === "approved" && (
                    <Button
                      onClick={() => handleStartUsing(loan.id)}
                      className="w-full neu-raised hover:neu-pressed"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Mulai Pakai
                    </Button>
                  )}

                  {loan.status === "active" && (
                    <Button
                      onClick={() => handleReturn(loan.id)}
                      className="w-full neu-raised hover:neu-pressed bg-success text-success-foreground"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Kembalikan
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}