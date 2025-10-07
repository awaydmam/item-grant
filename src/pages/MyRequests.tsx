import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, MapPin, User, Download } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function MyRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("borrow_requests")
      .select(`
        *,
        request_items(
          *,
          item:items(name, code)
        ),
        borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit),
        owner_reviewer:profiles!borrow_requests_owner_reviewed_by_fkey(full_name),
        headmaster_approver:profiles!borrow_requests_headmaster_approved_by_fkey(full_name)
      `)
      .eq("borrower_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setRequests(data);
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      draft: { label: "Draft", variant: "secondary" },
      pending_owner: { label: "Menunggu Pemilik", variant: "default" },
      pending_headmaster: { label: "Menunggu Kepsek", variant: "default" },
      approved: { label: "Disetujui", variant: "default" },
      active: { label: "Dipinjam", variant: "default" },
      completed: { label: "Selesai", variant: "secondary" },
      rejected: { label: "Ditolak", variant: "destructive" },
      cancelled: { label: "Dibatalkan", variant: "secondary" },
    };

    const statusInfo = statusMap[status] || { label: status, variant: "secondary" };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getStatusMessage = (request: any) => {
    switch (request.status) {
      case "pending_owner":
        return "Permintaan terkirim. Menunggu verifikasi Pemilik Alat.";
      case "pending_headmaster":
        return "Diteruskan ke Kepsek untuk surat turun.";
      case "approved":
        return `Surat No. ${request.letter_number} terbit. Siap serah terima.`;
      case "active":
        return "Barang sedang dipinjam.";
      case "completed":
        return "Peminjaman selesai.";
      case "rejected":
        return `Ditolak: ${request.rejection_reason || "Tidak ada alasan"}`;
      default:
        return "";
    }
  };

  const downloadLetter = (requestId: string) => {
    // TODO: Implement letter download
    console.log("Download letter:", requestId);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Pengajuan Saya</h1>
          <p className="text-muted-foreground">Pantau status pengajuan peminjaman Anda</p>
        </div>

        {requests.length === 0 ? (
          <Card className="neu-flat">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada pengajuan peminjaman</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="neu-flat hover:neu-raised transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Pengajuan #{request.id.slice(0, 8)}
                        {getStatusBadge(request.status)}
                      </CardTitle>
                      <CardDescription>
                        {getStatusMessage(request)}
                      </CardDescription>
                    </div>
                    {request.status === "approved" && request.letter_number && (
                      <Button
                        size="sm"
                        onClick={() => downloadLetter(request.id)}
                        className="neu-raised"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Unduh Surat
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Items */}
                  <div>
                    <p className="text-sm font-medium mb-2">Alat yang Dipinjam:</p>
                    <div className="space-y-1">
                      {request.request_items?.map((ri: any) => (
                        <div key={ri.id} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="font-mono">
                            {ri.quantity}x
                          </Badge>
                          <span>{ri.item?.name}</span>
                          {ri.item?.code && (
                            <span className="text-muted-foreground">({ri.item.code})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>Keperluan: {request.purpose}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(request.start_date), "dd MMM", { locale: id })} - {format(new Date(request.end_date), "dd MMM yyyy", { locale: id })}
                      </span>
                    </div>
                    {request.location_usage && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>Lokasi: {request.location_usage}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>PJ: {request.pic_name}</span>
                    </div>
                  </div>

                  {/* Timeline */}
                  {(request.owner_reviewed_at || request.headmaster_approved_at) && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-2">Timeline:</p>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div>
                          ✓ Diajukan: {format(new Date(request.created_at), "dd MMM yyyy, HH:mm", { locale: id })}
                        </div>
                        {request.owner_reviewed_at && (
                          <div>
                            ✓ Review Pemilik: {format(new Date(request.owner_reviewed_at), "dd MMM yyyy, HH:mm", { locale: id })}
                            {request.owner_reviewer?.full_name && ` oleh ${request.owner_reviewer.full_name}`}
                          </div>
                        )}
                        {request.headmaster_approved_at && (
                          <div>
                            ✓ Approve Kepsek: {format(new Date(request.headmaster_approved_at), "dd MMM yyyy, HH:mm", { locale: id })}
                            {request.headmaster_approver?.full_name && ` oleh ${request.headmaster_approver.full_name}`}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {(request.owner_notes || request.headmaster_notes) && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-2">Catatan:</p>
                      <div className="space-y-2 text-sm">
                        {request.owner_notes && (
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="font-medium">Pemilik Alat:</p>
                            <p className="text-muted-foreground">{request.owner_notes}</p>
                          </div>
                        )}
                        {request.headmaster_notes && (
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="font-medium">Kepala Sekolah:</p>
                            <p className="text-muted-foreground">{request.headmaster_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
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