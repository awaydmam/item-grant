import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, LogIn, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function Index() {
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // Check auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Fetch active loans
    fetchActiveLoans();

    // Realtime subscription
    const channel = supabase
      .channel("public-active-loans")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "borrow_requests",
          filter: "status=in.(active,completed)",
        },
        () => {
          fetchActiveLoans();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActiveLoans = async () => {
    const { data } = await supabase
      .from("borrow_requests")
      .select(`
        *,
        request_items(
          quantity,
          item:items(name)
        ),
        borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit)
      `)
      .in("status", ["active", "completed"])
      .order("started_at", { ascending: false })
      .limit(20);

    if (data) setActiveLoans(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header with Login */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="neu-raised p-2 rounded-xl">
              <img src="/logodm.png" alt="Logo Darul Ma'arif" className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Peminjaman Alat DM</h1>
              <p className="text-xs text-muted-foreground">Sistem Peminjaman Alat</p>
            </div>
          </div>
          
          {!session ? (
            <Button asChild size="sm" className="neu-raised gap-2">
              <Link to="/auth">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Masuk</span>
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" className="neu-flat gap-2">
              <Link to="/dashboard">
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Papan Peminjaman <span className="text-primary">Real-time</span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Pantau aktivitas peminjaman alat secara langsung. Data diperbarui otomatis.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <Card className="neu-flat">
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary mb-1">
                {activeLoans.filter(l => l.status === "active").length}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">Aktif Dipinjam</p>
            </CardContent>
          </Card>
          <Card className="neu-flat">
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-green-600 mb-1">
                {activeLoans.filter(l => l.status === "completed").length}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">Selesai</p>
            </CardContent>
          </Card>
          <Card className="neu-flat">
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-blue-600 mb-1">
                {new Set(activeLoans.map(l => l.borrower?.unit)).size}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">Unit Aktif</p>
            </CardContent>
          </Card>
          <Card className="neu-flat">
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-purple-600 mb-1">
                {activeLoans.reduce((acc, l) => acc + (l.request_items?.length || 0), 0)}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">Total Item</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Loans List */}
        <Card className="neu-flat">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Aktivitas Peminjaman
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Memuat data...</p>
              </div>
            ) : activeLoans.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground">Belum ada peminjaman aktif</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeLoans.map((loan) => (
                  <div
                    key={loan.id}
                    className="p-3 md:p-4 rounded-lg neu-sunken hover:neu-flat transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={loan.status === "active" ? "default" : "secondary"}>
                          {loan.status === "active" ? "Dipinjam" : "Selesai"}
                        </Badge>
                        <span className="font-semibold text-sm md:text-base">
                          {loan.borrower?.unit || "Unit Tidak Diketahui"}
                        </span>
                      </div>
                      {loan.end_date && (
                        <span className="text-xs md:text-sm text-muted-foreground">
                          Kembali: {format(new Date(loan.end_date), "dd MMM yyyy", { locale: id })}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {loan.request_items?.map((ri: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="font-mono text-xs">
                            {ri.quantity}x
                          </Badge>
                          <span className="text-muted-foreground">{ri.item?.name}</span>
                        </div>
                      ))}
                    </div>
                    
                    {loan.purpose && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                        Keperluan: {loan.purpose}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CTA */}
        {!session && (
          <div className="text-center mt-8">
            <Button asChild size="lg" className="neu-raised">
              <Link to="/auth">
                Mulai Gunakan Sistem
              </Link>
            </Button>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Peminjaman Alat DM. Sistem Peminjaman Alat Sekolah.</p>
        </div>
      </footer>
    </div>
  );
}
