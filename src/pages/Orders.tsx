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
    let isMounted = true;
    
    const fetchRequests = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      const { data } = await supabase
        .from("borrow_requests")
        .select(`
          *,
          request_items(
            quantity,
            items!inner(name, code)
          )
        `)
        .eq("borrower_id", user.id)
        .order("created_at", { ascending: false });

      if (data && isMounted) setRequests(data);
      if (isMounted) setLoading(false);
    };

    fetchRequests();
    
    return () => {
      isMounted = false;
    };
  }, []);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-20">
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200">
          <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="space-y-2">
              <div className="w-48 h-6 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="w-64 h-4 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/80 rounded-xl p-6 space-y-4">
              <div className="w-32 h-5 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="w-full h-4 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-20">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="space-y-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Status Peminjaman</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Track semua pengajuan peminjaman Anda
              </p>
            </div>
            
            {/* Process Flow Info */}
            <div className="border-0 shadow-sm bg-white/80 backdrop-blur-sm rounded-xl p-4">
              <h3 className="font-semibold text-sm mb-3 text-gray-900">Alur Persetujuan:</h3>
              <div className="flex items-center justify-between text-xs">
                <div className="text-center flex-1">
                  <div className="w-8 h-8 bg-blue-100 rounded-xl mx-auto mb-1 flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                  <span className="text-gray-700 font-medium">Diajukan</span>
                </div>
                <div className="flex-1 h-1 bg-gray-200 mx-1 rounded-full"></div>
                <div className="text-center flex-1">
                  <div className="w-8 h-8 bg-orange-100 rounded-xl mx-auto mb-1 flex items-center justify-center">
                    <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                  </div>
                  <span className="text-gray-700 font-medium">Owner</span>
                </div>
                <div className="flex-1 h-1 bg-gray-200 mx-1 rounded-full"></div>
                <div className="text-center flex-1">
                  <div className="w-8 h-8 bg-purple-100 rounded-xl mx-auto mb-1 flex items-center justify-center">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  </div>
                  <span className="text-gray-700 font-medium">Kepsek</span>
                </div>
                <div className="flex-1 h-1 bg-gray-200 mx-1 rounded-full"></div>
                <div className="text-center flex-1">
                  <div className="w-8 h-8 bg-green-100 rounded-xl mx-auto mb-1 flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <span className="text-gray-700 font-medium">Selesai</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {requests.length === 0 ? (
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Belum Ada Pengajuan</h3>
              <p className="text-gray-600 mb-6">
                Anda belum pernah mengajukan peminjaman alat
              </p>
              <Button onClick={() => navigate('/inventory')} className="rounded-xl">
                Mulai Ajukan Peminjaman
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 bg-white/80 p-1 rounded-xl">
              <TabsTrigger value="all" className="text-xs sm:text-sm rounded-lg">Semua</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs sm:text-sm rounded-lg">Proses</TabsTrigger>
              <TabsTrigger value="active" className="text-xs sm:text-sm rounded-lg">Aktif</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs sm:text-sm rounded-lg">Selesai</TabsTrigger>
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
    <Card 
      className="border-0 shadow-sm bg-white/80 backdrop-blur-sm hover:shadow-md transition-all cursor-pointer"
      onClick={() => onViewDetail(request.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">
                  Order #{request.id.slice(0, 8)}
                </CardTitle>
                <CardDescription className="text-xs text-gray-600">
                  {format(new Date(request.created_at), "dd MMM yyyy, HH:mm", { locale: id })}
                </CardDescription>
              </div>
            </div>
            
            <p className="text-sm text-gray-700">
              {getStatusMessage(request)}
            </p>
            
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(request.status)}
              {request.letter_number && (
                <Badge variant="outline" className="text-xs font-mono bg-green-50 text-green-700 border-green-200">
                  {request.letter_number}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Items */}
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-sm font-semibold mb-2 text-gray-900">
            {request.request_items?.length} Alat Dipinjam:
          </p>
          <div className="space-y-2">
            {request.request_items?.slice(0, 2).map((ri: any) => (
              <div key={ri.id} className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{ri.items?.name}</p>
                  <p className="text-xs text-gray-600">{ri.quantity}x {ri.items?.code}</p>
                </div>
              </div>
            ))}
            {request.request_items?.length > 2 && (
              <p className="text-xs text-gray-600 pl-10">
                +{request.request_items.length - 2} alat lainnya
              </p>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium">
              {format(new Date(request.start_date), "dd MMM", { locale: id })} - {format(new Date(request.end_date), "dd MMM yyyy", { locale: id })}
            </span>
          </div>
          <div className="flex items-start gap-2 text-gray-600">
            <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{request.purpose}</span>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          className="w-full rounded-xl"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail(request.id);
          }}
        >
          <Eye className="h-4 w-4 mr-2" />
          Lihat Detail & Unduh Surat
        </Button>
      </CardContent>
    </Card>
  );
}