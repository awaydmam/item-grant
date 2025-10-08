import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, MapPin, User, Download, Package, Clock, Eye } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Orders() {
  const navigate = useNavigate();
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
    const statusMap: Record<string, { label: string; variant: any; color: string }> = {
      draft: { label: "Draft", variant: "secondary", color: "text-gray-600" },
      pending_owner: { label: "Menunggu Owner", variant: "default", color: "text-blue-600" },
      pending_headmaster: { label: "Menunggu Kepsek", variant: "default", color: "text-orange-600" },
      approved: { label: "Disetujui", variant: "default", color: "text-green-600" },
      active: { label: "Sedang Dipinjam", variant: "default", color: "text-purple-600" },
      completed: { label: "Selesai", variant: "secondary", color: "text-gray-600" },
      rejected: { label: "Ditolak", variant: "destructive", color: "text-red-600" },
      cancelled: { label: "Dibatalkan", variant: "secondary", color: "text-gray-600" },
    };

    const statusInfo = statusMap[status] || { label: status, variant: "secondary", color: "text-gray-600" };
    return (
      <Badge variant={statusInfo.variant} className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getStatusProgress = (status: string) => {
    const progressMap: Record<string, number> = {
      draft: 0,
      pending_owner: 25,
      pending_headmaster: 50,
      approved: 75,
      active: 90,
      completed: 100,
      rejected: 0,
      cancelled: 0,
    };
    return progressMap[status] || 0;
  };

  const getStatusMessage = (request: any) => {
    switch (request.status) {
      case "pending_owner":
        return "Permintaan sedang direview oleh pemilik alat";
      case "pending_headmaster":
        return "Menunggu persetujuan dan surat dari Kepala Sekolah";
      case "approved":
        return `Surat ${request.letter_number || 'peminjaman'} sudah terbit. Siap ambil alat.`;
      case "active":
        return "Alat sedang dipinjam. Jangan lupa dikembalikan tepat waktu.";
      case "completed":
        return "Peminjaman selesai. Terima kasih!";
      case "rejected":
        return `Ditolak: ${request.rejection_reason || "Tidak ada alasan yang diberikan"}`;
      default:
        return "";
    }
  };

  const filterRequestsByStatus = (status: string[]) => {
    return requests.filter(req => status.includes(req.status));
  };

  const downloadLetter = (requestId: string) => {
    // Navigate to detail page for download
    navigate(`/orders/${requestId}`);
  };

  const viewDetail = (requestId: string) => {
    navigate(`/orders/${requestId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-16">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Memuat orders...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-background">
        <div className="container-mobile pt-6 pb-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Orders</h1>
            <p className="text-muted-foreground">
              Track semua pengajuan peminjaman Anda
            </p>
          </div>
        </div>
      </div>

      <div className="container-mobile py-4">
        {requests.length === 0 ? (
          <Card className="neu-flat">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Belum Ada Orders</h3>
              <p className="text-muted-foreground mb-4">
                Anda belum pernah mengajukan peminjaman alat
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="text-xs">Semua</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">Proses</TabsTrigger>
              <TabsTrigger value="active" className="text-xs">Aktif</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs">Selesai</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {requests.map((request) => (
                <OrderCard key={request.id} request={request} onDownload={downloadLetter} onViewDetail={viewDetail} />
              ))}
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              {filterRequestsByStatus(['pending_owner', 'pending_headmaster', 'approved']).map((request) => (
                <OrderCard key={request.id} request={request} onDownload={downloadLetter} onViewDetail={viewDetail} />
              ))}
            </TabsContent>

            <TabsContent value="active" className="space-y-4">
              {filterRequestsByStatus(['active']).map((request) => (
                <OrderCard key={request.id} request={request} onDownload={downloadLetter} onViewDetail={viewDetail} />
              ))}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {filterRequestsByStatus(['completed', 'rejected', 'cancelled']).map((request) => (
                <OrderCard key={request.id} request={request} onDownload={downloadLetter} onViewDetail={viewDetail} />
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function OrderCard({ request, onDownload, onViewDetail }: { 
  request: any; 
  onDownload: (id: string) => void;
  onViewDetail: (id: string) => void;
}) {
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      draft: { label: "Draft", variant: "secondary" },
      pending_owner: { label: "Menunggu Owner", variant: "default" },
      pending_headmaster: { label: "Menunggu Kepsek", variant: "default" },
      approved: { label: "Disetujui", variant: "default" },
      active: { label: "Sedang Dipinjam", variant: "default" },
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
        return "Menunggu review pemilik alat";
      case "pending_headmaster":
        return "Menunggu surat dari Kepsek";
      case "approved":
        return "Surat sudah terbit, siap ambil alat";
      case "active":
        return "Alat sedang dipinjam";
      case "completed":
        return "Peminjaman selesai";
      case "rejected":
        return `Ditolak: ${request.rejection_reason || "Tidak ada alasan"}`;
      default:
        return "";
    }
  };

  return (
    <Card className="neu-flat hover:neu-raised transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="truncate">Order #{request.id.slice(0, 8)}</span>
            </CardTitle>
            <CardDescription className="text-sm">
              {getStatusMessage(request)}
            </CardDescription>
            <div className="flex items-center gap-2 mt-2">
              {getStatusBadge(request.status)}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewDetail(request.id)}
                className="neu-flat h-7 px-2"
              >
                <Eye className="h-3 w-3 mr-1" />
                <span className="text-xs">Detail</span>
              </Button>
              {request.status === "approved" && request.letter_number && (
                <Button
                  size="sm"
                  onClick={() => onDownload(request.id)}
                  className="neu-raised h-7 px-2"
                >
                  <Download className="h-3 w-3 mr-1" />
                  <span className="text-xs">Unduh</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items */}
        <div>
          <p className="text-sm font-medium mb-2">Alat ({request.request_items?.length}):</p>
          <div className="space-y-1">
            {request.request_items?.slice(0, 2).map((ri: any) => (
              <div key={ri.id} className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="font-mono text-xs">
                  {ri.quantity}x
                </Badge>
                <span className="flex-1 truncate">{ri.item?.name}</span>
              </div>
            ))}
            {request.request_items?.length > 2 && (
              <p className="text-xs text-muted-foreground">
                +{request.request_items.length - 2} alat lainnya
              </p>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>
              {format(new Date(request.start_date), "dd MMM", { locale: id })} - {format(new Date(request.end_date), "dd MMM yyyy", { locale: id })}
            </span>
          </div>
          <div className="flex items-start gap-2 text-muted-foreground">
            <Package className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="truncate">{request.purpose}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}