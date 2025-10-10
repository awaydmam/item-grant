import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Calendar, MapPin, User, Download, CheckCircle, XCircle, Clock, ArrowLeft } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { generatePDF } from "@/lib/pdfGenerator";
import { useNavigate } from "react-router-dom";

export default function MyRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadRequests = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

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

        if (isMounted && data) {
          setRequests(data);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading requests:", error);
        if (isMounted) setLoading(false);
      }
    };

    loadRequests();
    
    return () => {
      isMounted = false;
    };
  }, []);

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

  const downloadLetter = async (request: any) => {
    try {
      // Fetch headmaster name
      const { data: headmasterData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", request.headmaster_approved_by)
        .single();

      const pdfData = {
        request: {
          id: request.id,
          letter_number: request.letter_number || "",
          purpose: request.purpose,
          start_date: request.start_date,
          end_date: request.end_date,
          location_usage: request.location_usage,
          pic_name: request.pic_name,
          pic_contact: request.pic_contact,
          created_at: request.created_at,
          borrower: {
            full_name: request.borrower?.full_name || "Unknown",
            unit: request.borrower?.unit || "Unknown",
            phone: "N/A",
          },
          request_items: request.request_items?.map((ri: any) => ({
            quantity: ri.quantity,
            items: {
              name: ri.item?.name || "Unknown Item",
              code: ri.item?.code || "N/A",
              description: "",
            },
          })) || [],
        },
        ownerName: request.owner_reviewer?.full_name || "Pengelola Inventaris",
        headmasterName: headmasterData?.full_name,
        schoolName: "Darul Ma'arif",
        schoolAddress: "Jalan Raya Kaplongan No. 28, Kaplongan, Karangampel, Indramayu",
      };

      await generatePDF(pdfData);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
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

  const navigate = useNavigate();
  
  const approvedRequests = requests.filter(r => 
    ["approved", "active", "completed"].includes(r.status)
  );
  const rejectedRequests = requests.filter(r => r.status === "rejected");
  const pendingRequests = requests.filter(r => 
    ["draft", "pending_owner", "pending_headmaster"].includes(r.status)
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-border/40">
        <div className="container-mobile py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="neu-flat hover:neu-raised rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Riwayat Surat</h1>
              <p className="text-sm text-muted-foreground">Semua pengajuan peminjaman</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content with Tabs */}
      <div className="container-mobile py-6">
        {requests.length === 0 ? (
          <Card className="neu-flat border-0">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada pengajuan peminjaman</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="approved" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 neu-flat rounded-2xl p-1 h-auto">
              <TabsTrigger 
                value="approved" 
                className="rounded-xl data-[state=active]:neu-pressed data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-2.5 text-sm"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Diterima ({approvedRequests.length})
              </TabsTrigger>
              <TabsTrigger 
                value="rejected"
                className="rounded-xl data-[state=active]:neu-pressed data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive py-2.5 text-sm"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Ditolak ({rejectedRequests.length})
              </TabsTrigger>
              <TabsTrigger 
                value="pending"
                className="rounded-xl data-[state=active]:neu-pressed data-[state=active]:bg-yellow-500/10 data-[state=active]:text-yellow-600 py-2.5 text-sm"
              >
                <Clock className="h-4 w-4 mr-2" />
                Pending ({pendingRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="approved" className="space-y-4 mt-6">
              {approvedRequests.length === 0 ? (
                <Card className="neu-flat border-0">
                  <CardContent className="py-8 text-center">
                    <CheckCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Belum ada surat yang diterima</p>
                  </CardContent>
                </Card>
              ) : (
                approvedRequests.map((request) => (
                  <Card key={request.id} className="neu-flat hover:neu-raised transition-all border-0">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="truncate">#{request.id.slice(0, 8)}</span>
                            {getStatusBadge(request.status)}
                          </CardTitle>
                          {request.letter_number && (
                            <CardDescription className="text-sm font-mono text-primary">
                              Surat No: {request.letter_number}
                            </CardDescription>
                          )}
                          <CardDescription className="text-sm">
                            {getStatusMessage(request)}
                          </CardDescription>
                        </div>
                        {request.letter_number && (
                          <Button
                            size="sm"
                            onClick={() => downloadLetter(request)}
                            className="neu-raised flex-shrink-0 rounded-xl"
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
                              <Badge variant="outline" className="font-mono text-xs neu-flat">
                                {ri.quantity}x
                              </Badge>
                              <span className="flex-1 truncate">{ri.item?.name}</span>
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
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4 mt-6">
              {rejectedRequests.length === 0 ? (
                <Card className="neu-flat border-0">
                  <CardContent className="py-8 text-center">
                    <XCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Tidak ada surat yang ditolak</p>
                  </CardContent>
                </Card>
              ) : (
                rejectedRequests.map((request) => (
                  <Card key={request.id} className="neu-flat border-0">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                            <FileText className="h-4 w-4 text-destructive flex-shrink-0" />
                            <span className="truncate">#{request.id.slice(0, 8)}</span>
                            {getStatusBadge(request.status)}
                          </CardTitle>
                          <CardDescription className="text-sm text-destructive">
                            {request.rejection_reason || "Tidak ada alasan"}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Alat yang Diajukan:</p>
                        <div className="space-y-1">
                          {request.request_items?.map((ri: any) => (
                            <div key={ri.id} className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className="font-mono text-xs neu-flat">
                                {ri.quantity}x
                              </Badge>
                              <span className="flex-1 truncate">{ri.item?.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
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
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-4 mt-6">
              {pendingRequests.length === 0 ? (
                <Card className="neu-flat border-0">
                  <CardContent className="py-8 text-center">
                    <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Tidak ada pengajuan pending</p>
                  </CardContent>
                </Card>
              ) : (
                pendingRequests.map((request) => (
                  <Card key={request.id} className="neu-flat border-0">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                            <FileText className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                            <span className="truncate">#{request.id.slice(0, 8)}</span>
                            {getStatusBadge(request.status)}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {getStatusMessage(request)}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Alat yang Diajukan:</p>
                        <div className="space-y-1">
                          {request.request_items?.map((ri: any) => (
                            <div key={ri.id} className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className="font-mono text-xs neu-flat">
                                {ri.quantity}x
                              </Badge>
                              <span className="flex-1 truncate">{ri.item?.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
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
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
      <BottomNav />
    </div>
  );
}