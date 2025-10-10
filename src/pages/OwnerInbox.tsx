import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BottomNav } from "@/components/layout/BottomNav";
import { toast } from "sonner";
import { Inbox, CheckCircle, XCircle, Edit3, Calendar, User, FileText, Download, Eye, History } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { BorrowLetter } from "@/components/PDF/BorrowLetter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function OwnerInbox() {
  interface RequestItem {
    id: string;
    quantity: number;
    item?: { name: string; code?: string; department?: { name: string } };
  }
  interface BorrowRequest {
    id: string;
    purpose: string;
    start_date: string;
    end_date: string;
    location_usage?: string;
    pic_name: string;
    pic_contact: string;
    request_items?: RequestItem[];
    borrower?: { full_name: string; unit: string; phone?: string };
    owner_reviewer?: { full_name: string };
    created_at?: string;
    letter_generated_at?: string;
    rejection_reason?: string;
    owner_reviewed_at?: string;
    letter_number?: string;
  }
  const [requests, setRequests] = useState<BorrowRequest[]>([]); // pending_owner
  const [approvedRequests, setApprovedRequests] = useState<BorrowRequest[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotes, setActionNotes] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewRequest, setPreviewRequest] = useState<BorrowRequest | null>(null);
  const [showLetterPreview, setShowLetterPreview] = useState(false);
  const [draftMode, setDraftMode] = useState(false); // bedakan preview draft vs setelah approve
  const [ownerProfile, setOwnerProfile] = useState<{ full_name: string; department?: string } | null>(null);
  const [ownerDepartment, setOwnerDepartment] = useState<string | null>(null);

  const baseSelect = `
    *,
    request_items(
      *,
      item:items(name, code, department:departments(name))
    ),
    borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit, phone),
    owner_reviewer:profiles!borrow_requests_owner_reviewed_by_fkey(full_name)
  `;

  const fetchRequests = useCallback(async () => {
    // Pending
    const { data: pendingData } = await supabase
      .from("borrow_requests")
      .select(baseSelect)
      .eq("status", "pending_owner")
      .order("created_at", { ascending: false });

    // Approved (internal direct OR setelah headmaster approve) yang sudah generate surat internal tanpa headmaster
    const { data: approvedData } = await supabase
      .from("borrow_requests")
      .select(baseSelect)
      .in("status", ["approved", "active", "completed"]) // show history of successes
      .not("owner_reviewed_at", "is", null)
      .order("owner_reviewed_at", { ascending: false })
      .limit(50);

    // Rejected by owner (status rejected dan owner_reviewed_by tidak null)
    const { data: rejectedData } = await supabase
      .from("borrow_requests")
      .select(baseSelect)
      .eq("status", "rejected")
      .not("owner_reviewed_at", "is", null)
      .order("owner_reviewed_at", { ascending: false })
      .limit(50);

    const filterByDept = (arr: BorrowRequest[] | null) => {
      let list: BorrowRequest[] = arr || [];
      if (ownerDepartment) {
        list = list.filter((req) =>
          req.request_items?.some((ri) => ri.item?.department?.name === ownerDepartment)
        );
      }
      return list;
    };

    setRequests(filterByDept(pendingData as BorrowRequest[]));
    setApprovedRequests(filterByDept(approvedData as BorrowRequest[]));
    setRejectedRequests(filterByDept(rejectedData as BorrowRequest[]));
    setLoading(false);
  }, [ownerDepartment, baseSelect]);

  const initOwnerAndRequests = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      const { data: role } = await supabase
        .from("user_roles")
        .select("department, role")
        .eq("user_id", user.id)
        .eq("role", "owner")
        .single();
      setOwnerProfile(profile ? { full_name: profile.full_name, department: role?.department } : null);
      setOwnerDepartment(role?.department || null);
    }
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    initOwnerAndRequests();
  }, [initOwnerAndRequests]);

  const handleApprove = async (requestId: string) => {
    // This will be handled by the dual option buttons
  };

  const handleDirectLetter = async (requestId: string) => {
    setProcessingId(requestId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      // Update status to approved and generate internal letter
      const { error } = await supabase
        .from("borrow_requests")
        .update({
          status: "approved",
          owner_notes: actionNotes || null,
          owner_reviewed_by: user.id,
          owner_reviewed_at: new Date().toISOString(),
          letter_generated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      // Get request for PDF generation
      const { data: requestData } = await supabase
        .from("borrow_requests")
        .select(`
          *,
          request_items(
            *,
            items(name, code, description, department:departments(name))
          ),
          borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit, phone),
          owner_reviewer:profiles!borrow_requests_owner_reviewed_by_fkey(full_name)
        `)
        .eq("id", requestId)
        .single();

      if (requestData) {
        setPreviewRequest(requestData);
        setShowLetterPreview(true);
      }

      toast.success("Disetujui! Surat internal siap dicetak.");
      setActionNotes("");
      fetchRequests();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal menyetujui permintaan");
    } finally {
      setProcessingId(null);
    }
  };

  // Preview draft tanpa mengubah status
  const handlePreviewDraft = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      setDraftMode(true);
      // Ambil data lengkap request untuk PDF
      const { data: requestData, error } = await supabase
        .from('borrow_requests')
        .select(`
          *,
          request_items(*, items(name, code, description, department:departments(name))),
          borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit, phone),
          owner_reviewer:profiles!borrow_requests_owner_reviewed_by_fkey(full_name)
        `)
        .eq('id', requestId)
        .single();
      if (error) throw error;
      if (requestData) {
        setPreviewRequest(requestData);
        setShowLetterPreview(true);
      }
    } catch (e) {
      toast.error('Gagal memuat draft surat');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSendToHeadmaster = async (requestId: string) => {
    setProcessingId(requestId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { error } = await supabase
        .from("borrow_requests")
        .update({
          status: "pending_headmaster",
          owner_notes: actionNotes || null,
          owner_reviewed_by: user.id,
          owner_reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Diteruskan ke Kepala Sekolah untuk persetujuan.");
      setActionNotes("");
      fetchRequests();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal meneruskan permintaan");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!actionNotes.trim()) {
      toast.error("Mohon isi alasan penolakan");
      return;
    }

    setProcessingId(requestId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      // Get request items to restore availability
      const { data: request } = await supabase
        .from("borrow_requests")
        .select("request_items(*)")
        .eq("id", requestId)
        .single();

      // Update request status
      const { error } = await supabase
        .from("borrow_requests")
        .update({
          status: "rejected",
          rejection_reason: actionNotes,
          owner_reviewed_by: user.id,
          owner_reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      // Restore item availability
      if (request?.request_items) {
        for (const item of request.request_items) {
          const { data: currentItem } = await supabase
            .from("items")
            .select("available_quantity, quantity")
            .eq("id", item.item_id)
            .single();

          if (currentItem) {
            await supabase
              .from("items")
              .update({
                available_quantity: currentItem.available_quantity + item.quantity,
                status: "available"
              })
              .eq("id", item.item_id);
          }
        }
      }

      toast.success("Permintaan ditolak");
      setActionNotes("");
      fetchRequests();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal menolak permintaan");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownloadPDF = async () => {
    if (!previewRequest) return;
    
    try {
      // Get headmaster info
      // Untuk surat internal tidak perlu headmasterName.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: ownerProfileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      return {
        request: previewRequest,
        ownerName: ownerProfileData?.full_name,
        headmasterName: undefined,
        schoolName: "Darul Ma'arif",
        schoolAddress: "Jalan Raya Kaplongan No. 28, Kaplongan, Karangampel, Indramayu",
        letterType: 'internal' as const
      };
    } catch (error) {
      toast.error("Gagal menyiapkan data surat");
      console.error(error);
      return null;
    }
  };

  // Adaptasi data untuk komponen BorrowLetter (struktur longgar)
  interface BorrowLetterRequestAdapted {
    id: string; letter_number?: string; purpose: string; start_date: string; end_date: string; location_usage?: string; pic_name: string; pic_contact: string; created_at?: string; borrower: { full_name: string; unit: string; phone?: string }; request_items: { quantity: number; items: { name: string; code?: string; description?: string } }[];
  }
  const asLetterRequest = (r: BorrowRequest | null): BorrowLetterRequestAdapted | undefined => {
    if (!r) return undefined;
    return {
      id: r.id,
      letter_number: (r as unknown as { letter_number?: string }).letter_number,
      purpose: r.purpose,
      start_date: r.start_date,
      end_date: r.end_date,
      location_usage: r.location_usage,
      pic_name: r.pic_name,
      pic_contact: r.pic_contact,
      created_at: (r as unknown as { created_at?: string }).created_at,
      borrower: r.borrower || { full_name: '-', unit: '-', phone: '' },
      request_items: (r.request_items || []).map(ri => ({
        quantity: ri.quantity,
        items: {
          name: ri.item?.name || '-',
          code: ri.item?.code || '',
          description: ''
        }
      }))
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-16">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Memuat...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="container-mobile pt-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Kotak Masuk Pemilik</h1>
          <p className="text-muted-foreground">
            Review, terbitkan, atau kelola riwayat surat peminjaman
          </p>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="pending">Menunggu</TabsTrigger>
            <TabsTrigger value="approved">Disetujui</TabsTrigger>
            <TabsTrigger value="rejected">Ditolak</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {requests.length === 0 ? (
              <Card className="neu-flat">
                <CardContent className="py-12 text-center">
                  <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Tidak ada permintaan baru</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <Card key={request.id} className="neu-flat">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base leading-tight">
                        {request.borrower?.full_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 break-words">
                        {request.borrower?.unit}
                      </p>
                      {request.borrower?.phone && (
                        <p className="text-xs text-muted-foreground">
                          {request.borrower.phone}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0">
                      Menunggu
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Items */}
                  <div>
                    <p className="text-sm font-medium mb-2">Alat yang Diminta:</p>
                    <div className="space-y-2">
                      {request.request_items?.map((ri: RequestItem) => (
                        <div
                          key={ri.id}
                          className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                        >
                          <Badge variant="outline" className="font-mono text-xs flex-shrink-0">
                            {ri.quantity}x
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm leading-tight">{ri.item?.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {ri.item?.department?.name}
                              {ri.item?.code && ` • ${ri.item.code}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium mb-1">Keperluan:</p>
                      <p className="text-muted-foreground">{request.purpose}</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Tanggal Pemakaian:</p>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {format(new Date(request.start_date), "dd MMM", { locale: id })} - {format(new Date(request.end_date), "dd MMM yyyy", { locale: id })}
                        </span>
                      </div>
                    </div>
                    {request.location_usage && (
                      <div>
                        <p className="font-medium mb-1">Lokasi Penggunaan:</p>
                        <p className="text-muted-foreground">{request.location_usage}</p>
                      </div>
                    )}
                    <div>
                      <p className="font-medium mb-1">Penanggung Jawab:</p>
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <User className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>{request.pic_name} • {request.pic_contact}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t pt-4 space-y-3">
                    <div>
                      <Label htmlFor={`notes-${request.id}`} className="text-sm">Catatan (opsional)</Label>
                      <Textarea
                        id={`notes-${request.id}`}
                        placeholder="Tambahkan catatan untuk pemohon..."
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        className="neu-sunken mt-2"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-3">
                      {/* Dual Option Buttons */}
                      <div className="space-y-3">
                        <Button
                          onClick={() => handlePreviewDraft(request.id)}
                          disabled={processingId === request.id}
                          variant="secondary"
                          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 border-0 neu-button-raised hover:neu-button-pressed text-left"
                          size="lg"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <FileText className="h-4 w-4" />
                            <div className="text-center">
                              <div>👁️ Preview Surat (Draft)</div>
                              <div className="text-xs opacity-80 mt-1">Tanpa mengubah status</div>
                            </div>
                          </div>
                        </Button>
                        <Button
                          onClick={() => handleDirectLetter(request.id)}
                          disabled={processingId === request.id}
                          variant="default"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 neu-button-raised hover:neu-button-pressed text-left"
                          size="lg"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            <div className="text-center">
                              <div>✅ Terima & Cetak Surat Langsung</div>
                              <div className="text-xs opacity-80 mt-1">Untuk alat ringan/internal</div>
                            </div>
                          </div>
                        </Button>
                        
                        <Button
                          onClick={() => handleSendToHeadmaster(request.id)}
                          disabled={processingId === request.id}
                          variant="outline"
                          className="w-full bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 border-0 neu-button-raised hover:neu-button-pressed text-left"
                          size="lg"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Edit3 className="h-4 w-4" />
                            <div className="text-center">
                              <div>📤 Kirim ke Kepala Sekolah</div>
                              <div className="text-xs opacity-80 mt-1">Untuk alat penting/formal</div>
                            </div>
                          </div>
                        </Button>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="destructive"
                              className="w-full bg-red-500 hover:bg-red-600 text-white border-0 neu-button-raised hover:neu-button-pressed"
                              disabled={processingId === request.id}
                              size="lg"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              ❌ Tolak Permintaan
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="mx-4">
                            <DialogHeader>
                              <DialogTitle>Konfirmasi Penolakan</DialogTitle>
                              <DialogDescription>
                                Apakah Anda yakin ingin menolak permintaan ini?
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="reject-reason">Alasan Penolakan *</Label>
                                <Textarea
                                  id="reject-reason"
                                  placeholder="Jelaskan alasan penolakan..."
                                  value={actionNotes}
                                  onChange={(e) => setActionNotes(e.target.value)}
                                  className="mt-2 neu-sunken"
                                />
                              </div>
                              <Button
                                variant="destructive"
                                className="w-full bg-red-500 hover:bg-red-600 text-white border-0 neu-button-raised hover:neu-button-pressed"
                                onClick={() => handleReject(request.id)}
                                disabled={!actionNotes.trim()}
                              >
                                Tolak Permintaan
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="mt-4">
            {approvedRequests.length === 0 ? (
              <Card className="neu-flat">
                <CardContent className="py-10 text-center space-y-2">
                  <History className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground text-sm">Belum ada riwayat surat disetujui</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {approvedRequests.map((request) => (
                  <Card key={request.id} className="neu-flat">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base leading-tight">
                            {request.borrower?.full_name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1 break-words">
                            {request.borrower?.unit}
                          </p>
                        </div>
                        <Badge variant="secondary" className="flex-shrink-0">Disetujui</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {format(new Date(request.start_date), "dd MMM", { locale: id })} - {format(new Date(request.end_date), "dd MMM yyyy", { locale: id })}
                        </span>
                      </div>
                      {request.letter_generated_at && (
                        <p className="text-xs text-muted-foreground">Surat terbit: {format(new Date(request.letter_generated_at), "dd MMM yyyy HH:mm", { locale: id })}</p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setPreviewRequest(request); setShowLetterPreview(true); setDraftMode(false); }}
                        className="w-full"
                      >
                        Lihat Surat
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-4">
            {rejectedRequests.length === 0 ? (
              <Card className="neu-flat">
                <CardContent className="py-10 text-center space-y-2">
                  <History className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground text-sm">Tidak ada permintaan ditolak</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {rejectedRequests.map((request) => (
                  <Card key={request.id} className="neu-flat">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base leading-tight">
                            {request.borrower?.full_name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1 break-words">
                            {request.borrower?.unit}
                          </p>
                        </div>
                        <Badge variant="destructive" className="flex-shrink-0">Ditolak</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {format(new Date(request.start_date), "dd MMM", { locale: id })} - {format(new Date(request.end_date), "dd MMM yyyy", { locale: id })}
                        </span>
                      </div>
                      {request.rejection_reason && (
                        <p className="text-xs text-red-600 break-words">Alasan: {request.rejection_reason}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Ditolak: {request.owner_reviewed_at ? format(new Date(request.owner_reviewed_at), "dd MMM yyyy HH:mm", { locale: id }) : '-'}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Letter Preview Dialog */}
      <Dialog open={showLetterPreview} onOpenChange={(o) => { if (!o) { setDraftMode(false); setShowLetterPreview(false);} }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{draftMode ? 'Draft Surat Internal' : 'Surat Internal Disetujui'}</DialogTitle>
            <DialogDescription>
              {draftMode ? 'Pratinjau sebelum persetujuan. Belum sah sampai Anda klik Terima.' : 'Surat peminjaman telah disetujui dan siap untuk dicetak'}
            </DialogDescription>
          </DialogHeader>
          
          {previewRequest && (
            <div className="space-y-4">
              {/* PDF Preview */}
              <div className="h-[600px] border rounded-lg overflow-hidden">
                <PDFViewer 
                  style={{ width: '100%', height: '100%' }}
                  showToolbar={false}
                >
                  <BorrowLetter data={{
                    request: asLetterRequest(previewRequest)!,
                    ownerName: previewRequest?.owner_reviewer?.full_name || ownerProfile?.full_name || 'Pengelola Inventaris',
                    headmasterName: undefined,
                    schoolName: 'Darul Ma\'arif',
                    schoolAddress: 'Jalan Raya Kaplongan No. 28, Kaplongan, Karangampel, Indramayu',
                    letterType: 'internal'
                  }} />
                </PDFViewer>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-4 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowLetterPreview(false)}
                  className="bg-gray-50 hover:bg-gray-100 neu-button-raised hover:neu-button-pressed border-0"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Tutup Preview
                </Button>
                
                {!draftMode && (
                  <PDFDownloadLink
                  document={
                    <BorrowLetter 
                      data={{
                        request: asLetterRequest(previewRequest)!,
                        ownerName: previewRequest?.owner_reviewer?.full_name || ownerProfile?.full_name || "Pengelola Inventaris",
                        headmasterName: undefined,
                        schoolName: "Darul Ma'arif",
                        schoolAddress: "Jalan Raya Kaplongan No. 28, Kaplongan, Karangampel, Indramayu",
                        letterType: 'internal'
                      }}
                    />
                  }
                  fileName={`Surat_Peminjaman_${previewRequest.borrower?.full_name?.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`}
                >
                  {({ loading }) => (
                    <Button 
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white neu-button-raised hover:neu-button-pressed border-0"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {loading ? 'Mempersiapkan PDF...' : 'Download PDF'}
                    </Button>
                  )}
                </PDFDownloadLink>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <BottomNav />
    </div>
  );
}