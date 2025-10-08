import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, MapPin, User, Download } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-16">
        {/* Header skeleton */}
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200">
          <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="space-y-2">
              <div className="w-48 h-6 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-64 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
        
        {/* Content skeleton */}
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/80 rounded-xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="w-32 h-5 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="w-20 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-16">
      {/* Enhanced Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Pengajuan Saya</h1>
            <p className="text-sm sm:text-base text-gray-600">Pantau status pengajuan peminjaman Anda</p>
          </div>
        </div>
      </div>

      {/* Enhanced Content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">

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
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="truncate">#{request.id.slice(0, 8)}</span>
                        {getStatusBadge(request.status)}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {getStatusMessage(request)}
                      </CardDescription>
                    </div>
                    {request.status === "approved" && request.letter_number && (
                      <Button
                        size="sm"
                        onClick={() => downloadLetter(request.id)}
                        className="neu-raised flex-shrink-0"
                      >
                        <Download className="h-4 w-4" />
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
                          <Badge variant="outline" className="font-mono text-xs">
                            {ri.quantity}x
                          </Badge>
                          <span className="flex-1 truncate">{ri.item?.name}</span>
                          {ri.item?.code && (
                            <span className="text-muted-foreground text-xs">({ri.item.code})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">Keperluan:</span>
                        <p className="mt-1">{request.purpose}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {format(new Date(request.start_date), "dd MMM", { locale: id })} - {format(new Date(request.end_date), "dd MMM yyyy", { locale: id })}
                      </span>
                    </div>
                    {request.location_usage && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span>Lokasi: {request.location_usage}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4 flex-shrink-0" />
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
      <BottomNav />
    </div>
  );
}