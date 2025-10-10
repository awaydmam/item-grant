import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BottomNav } from "@/components/layout/BottomNav";
import { toast } from "sonner";
import { Inbox, CheckCircle, XCircle, FileText, Calendar, User, Eye, Download, History } from "lucide-react";
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

export default function HeadmasterInbox() {
  interface RequestItem {
    id: string;
    quantity: number;
    // Bisa muncul sebagai 'item' (alias item:items) atau 'items' (tanpa alias) tergantung query yang dipakai
    item?: {
      name: string;
      code?: string;
      department?: { name: string };
    };
    items?: {
      name: string;
      code?: string;
      department?: { name: string };
    };
  }

  interface BorrowRequest {
    id: string;
    purpose: string;
    start_date: string;
    end_date: string;
    location_usage?: string;
    pic_name: string;
    pic_contact: string;
    owner_notes?: string;
    owner_reviewed_at?: string;
    headmaster_approved_at?: string;
    letter_generated_at?: string;
    rejection_reason?: string;
    request_items?: RequestItem[];
    borrower?: {
      full_name: string;
      unit: string;
      phone?: string;
    };
    owner_reviewer?: {
      full_name: string;
    };
  }

  const [requests, setRequests] = useState<BorrowRequest[]>([]); // pending_headmaster
  const [approvedRequests, setApprovedRequests] = useState<BorrowRequest[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<BorrowRequest | null>(null);
  const [previewRequest, setPreviewRequest] = useState<BorrowRequest | null>(null);
  const [showLetterPreview, setShowLetterPreview] = useState(false);
  const [headmasterName, setHeadmasterName] = useState<string>("Kepala Sekolah");

  // Helper untuk adapt struktur ke kebutuhan BorrowLetter (minimal fields)
  interface BorrowLetterRequestAdapted {
    id: string; purpose: string; start_date: string; end_date: string; location_usage?: string; pic_name: string; pic_contact: string; created_at?: string; letter_number?: string;
    borrower: { full_name: string; unit: string; phone?: string };
    request_items: { quantity: number; items: { name: string; code?: string; description?: string } }[];
  }
  const asLetterRequest = (r: BorrowRequest): BorrowLetterRequestAdapted | undefined => {
    if (!r) return undefined;
    const letter_number = (r as unknown as { letter_number?: string }).letter_number;
    const created_at = (r as unknown as { created_at?: string }).created_at;
    return {
      id: r.id,
      letter_number,
      purpose: r.purpose,
      start_date: r.start_date,
      end_date: r.end_date,
      location_usage: r.location_usage,
      pic_name: r.pic_name,
      pic_contact: r.pic_contact,
      created_at,
      borrower: r.borrower || { full_name: '-', unit: '-', phone: '' },
      request_items: (r.request_items || []).map(ri => ({
        quantity: ri.quantity,
        items: {
          name: ri.item?.name || ri.items?.name || '-',
          code: ri.item?.code || ri.items?.code || '',
          description: ''
        }
      }))
    };
  };

  // Effect dipindah ke bawah setelah deklarasi fetchRequests agar tidak reference sebelum deklarasi

  const fetchHeadmaster = async () => {
    const { data: headmasterRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "headmaster")
      .maybeSingle();
    if (headmasterRole?.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", headmasterRole.user_id)
        .single();
      if (profile?.full_name) setHeadmasterName(profile.full_name);
    }
  };

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
    const { data: pendingData } = await supabase
      .from("borrow_requests")
      .select(baseSelect)
      .eq("status", "pending_headmaster")
      .order("owner_reviewed_at", { ascending: false });

    const { data: approvedData } = await supabase
      .from("borrow_requests")
      .select(baseSelect)
      .in("status", ["approved", "active", "completed"]) // show success history
      .not("headmaster_approved_at", "is", null)
      .order("headmaster_approved_at", { ascending: false })
      .limit(50);

    const { data: rejectedData } = await supabase
      .from("borrow_requests")
      .select(baseSelect)
      .eq("status", "rejected")
      .not("headmaster_approved_at", "is", null)
      .order("headmaster_approved_at", { ascending: false })
      .limit(50);

    if (pendingData) setRequests(pendingData);
    if (approvedData) setApprovedRequests(approvedData);
    if (rejectedData) setRejectedRequests(rejectedData);
    setLoading(false);
  }, [baseSelect]);

  useEffect(() => {
    fetchRequests();
    fetchHeadmaster();
  }, [fetchRequests]);

  const generateLetterNumber = () => {
    // Format: XXX/IG/MM/YYYY
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const number = String(Math.floor(Math.random() * 900) + 100);
    return `${number}/IG/${month}/${year}`;
  };

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const letterNumber = generateLetterNumber();

      const { error } = await supabase
        .from("borrow_requests")
        .update({
          status: "approved",
          headmaster_notes: notes || null,
          headmaster_approved_by: user.id,
          headmaster_approved_at: new Date().toISOString(),
          letter_number: letterNumber,
          letter_generated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      // Get updated request for PDF preview
      const { data: requestData } = await supabase
        .from("borrow_requests")
        .select(`
          *,
          request_items(
            *,
            items(name, code, description)
          ),
          borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit, phone)
        `)
        .eq("id", requestId)
        .single();

      if (requestData) {
        setPreviewRequest(requestData);
        setShowLetterPreview(true);
      }

      toast.success(`Surat No. ${letterNumber} terbit—siap serah terima.`);
      setNotes("");
      fetchRequests();
    } catch (error: Error | unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal menyetujui permintaan");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!notes.trim()) {
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

      const { error } = await supabase
        .from("borrow_requests")
        .update({
          status: "rejected",
          rejection_reason: notes,
          headmaster_approved_by: user.id,
          headmaster_approved_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      // Restore item availability
      if (request?.request_items) {
        for (const item of request.request_items) {
          const { data: currentItem } = await supabase
            .from("items")
            .select("available_quantity")
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
      setNotes("");
      fetchRequests();
    } catch (error: Error | unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal menolak permintaan");
    } finally {
      setProcessingId(null);
    }
  };

  const LetterPreview = ({ request }: { request: BorrowRequest }) => {
    const previewLetterNumber = generateLetterNumber();
    
    return (
      <div className="space-y-4 p-6 bg-white text-black rounded-lg max-h-[70vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4">
          <h2 className="text-xl font-bold">SEKOLAH [NAMA SEKOLAH]</h2>
          <p className="text-sm">Jl. Alamat Sekolah, Kota, Provinsi</p>
          <p className="text-sm">Telp: (021) xxxx-xxxx | Email: sekolah@example.com</p>
        </div>

        {/* Letter Info */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Nomor</span>
            <span className="font-mono">: {previewLetterNumber} (akan digenerate)</span>
          </div>
          <div className="flex justify-between">
            <span>Tanggal</span>
            <span>: {format(new Date(), "dd MMMM yyyy", { locale: id })}</span>
          </div>
          <div className="flex justify-between">
            <span>Perihal</span>
            <span>: <strong>Peminjaman Alat</strong></span>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-3 text-sm mt-6">
          <p>Yang bertanda tangan di bawah ini:</p>
          
          <div className="ml-6 space-y-1">
            <p>Nama : <strong>[Kepala Sekolah]</strong></p>
            <p>Jabatan : <strong>Kepala Sekolah</strong></p>
          </div>

          <p>Menyetujui peminjaman alat dengan detail sebagai berikut:</p>

          {/* Borrower Info */}
          <div className="ml-6 space-y-1">
            <p>Peminjam : <strong>{request.borrower?.full_name}</strong></p>
            <p>Unit/Bagian : <strong>{request.borrower?.unit}</strong></p>
            <p>Kontak : <strong>{request.borrower?.phone}</strong></p>
          </div>

          {/* Items */}
          <p className="font-semibold mt-4">Daftar Alat:</p>
          <table className="w-full border border-black text-xs">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-black p-2 text-left">No</th>
                <th className="border border-black p-2 text-left">Nama Alat</th>
                <th className="border border-black p-2 text-center">Kode</th>
                <th className="border border-black p-2 text-center">Jumlah</th>
                <th className="border border-black p-2 text-left">Pemilik</th>
              </tr>
            </thead>
            <tbody>
              {request.request_items?.map((ri: { id: string; quantity: number; item?: { name: string; code?: string; department?: { name: string } } }, idx: number) => (
                <tr key={ri.id}>
                  <td className="border border-black p-2">{idx + 1}</td>
                  <td className="border border-black p-2">{ri.item?.name}</td>
                  <td className="border border-black p-2 text-center">{ri.item?.code || "-"}</td>
                  <td className="border border-black p-2 text-center">{ri.quantity}</td>
                  <td className="border border-black p-2">{ri.item?.department?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Usage Details */}
          <div className="ml-6 space-y-1 mt-4">
            <p>Keperluan : <strong>{request.purpose}</strong></p>
            <p>Periode Pemakaian : <strong>{format(new Date(request.start_date), "dd MMMM yyyy", { locale: id })} - {format(new Date(request.end_date), "dd MMMM yyyy", { locale: id })}</strong></p>
            {request.location_usage && (
              <p>Lokasi Penggunaan : <strong>{request.location_usage}</strong></p>
            )}
            <p>Penanggung Jawab : <strong>{request.pic_name} ({request.pic_contact})</strong></p>
          </div>

          {/* Notes */}
          <div className="mt-4 p-3 bg-gray-50 border border-gray-300 rounded text-xs">
            <p className="font-semibold">Catatan Penting:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Peminjam wajib menjaga dan merawat alat dengan baik</li>
              <li>Pengembalian harus tepat waktu sesuai periode yang disetujui</li>
              <li>Kerusakan atau kehilangan menjadi tanggung jawab peminjam</li>
            </ul>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mt-8 text-center">
            <div>
              <p className="mb-16">Pemilik Alat</p>
              <p className="font-semibold underline">{request.owner_reviewer?.full_name || "[Nama Pemilik]"}</p>
              <p className="text-xs">TTD (akan ditambahkan otomatis)</p>
            </div>
            <div>
              <p className="mb-16">Kepala Sekolah</p>
              <p className="font-semibold underline">[Nama Kepala Sekolah]</p>
              <p className="text-xs">TTD (akan ditambahkan otomatis)</p>
            </div>
          </div>

          {/* QR Code Placeholder */}
          <div className="mt-6 text-center">
            <div className="inline-block p-3 border-2 border-black">
              <div className="w-24 h-24 bg-gray-200 flex items-center justify-center">
                <p className="text-xs">QR Code</p>
              </div>
            </div>
            <p className="text-xs mt-2">Scan untuk verifikasi dokumen</p>
          </div>
        </div>
      </div>
    );
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
          <h1 className="text-2xl font-bold mb-2">Kotak Masuk Kepala Sekolah</h1>
          <p className="text-muted-foreground">
            Review dan kelola riwayat surat resmi
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
                  <p className="text-muted-foreground">Tidak ada permintaan menunggu persetujuan</p>
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
                    <Badge className="bg-warning text-warning-foreground flex-shrink-0">
                      Butuh Persetujuan
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary */}
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">Keperluan</p>
                        <p className="text-muted-foreground break-words">{request.purpose}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">Rentang Waktu</p>
                        <p className="text-muted-foreground">
                          {format(new Date(request.start_date), "dd MMM", { locale: id })} - {format(new Date(request.end_date), "dd MMM yyyy", { locale: id })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">Penanggung Jawab</p>
                        <p className="text-muted-foreground break-words">{request.pic_name} • {request.pic_contact}</p>
                      </div>
                    </div>
                  </div>

                  {/* Items Count */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm font-medium mb-2">
                      {request.request_items?.length || 0} Alat Diminta
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {request.request_items?.slice(0, 3).map((ri: { id: string; item?: { name: string } }) => (
                        <Badge key={ri.id} variant="outline" className="text-xs">
                          {ri.item?.name}
                        </Badge>
                      ))}
                      {request.request_items?.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{request.request_items.length - 3} lainnya
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Owner Notes */}
                  {request.owner_notes && (
                    <div className="p-3 bg-muted/30 rounded-lg text-sm">
                      <p className="font-medium mb-1">Catatan Pemilik:</p>
                      <p className="text-muted-foreground break-words">{request.owner_notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="border-t pt-4 space-y-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full neu-flat"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Lihat Preview Surat
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl mx-4">
                        <DialogHeader>
                          <DialogTitle>Preview Surat Peminjaman</DialogTitle>
                          <DialogDescription>
                            Surat akan terbit setelah Anda approve
                          </DialogDescription>
                        </DialogHeader>
                        {selectedRequest && <LetterPreview request={selectedRequest} />}
                      </DialogContent>
                    </Dialog>

                    <div>
                      <Label htmlFor={`notes-${request.id}`} className="text-sm">
                        Catatan (opsional)
                      </Label>
                      <Textarea
                        id={`notes-${request.id}`}
                        placeholder="Tambahkan catatan untuk pemohon..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="neu-sunken mt-2 text-sm"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                            disabled={processingId === request.id}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Tolak
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="mx-4">
                          <DialogHeader>
                            <DialogTitle>Konfirmasi Penolakan</DialogTitle>
                            <DialogDescription>
                              Alasan penolakan akan dikirim ke pemohon
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Alasan Penolakan *</Label>
                              <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Jelaskan alasan penolakan..."
                                className="mt-2 neu-sunken"
                              />
                            </div>
                            <Button
                              variant="destructive"
                              className="w-full"
                              onClick={() => handleReject(request.id)}
                              disabled={!notes.trim()}
                            >
                              Tolak Permintaan
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                        disabled={processingId === request.id}
                        className="flex-1 neu-flat bg-success text-success-foreground"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {processingId === request.id ? "Memproses..." : "Setujui & Terbitkan"}
                      </Button>
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
                  <p className="text-muted-foreground text-sm">Belum ada surat resmi disetujui</p>
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
                        onClick={() => { setPreviewRequest(request); setShowLetterPreview(true); }}
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
                      <p className="text-xs text-muted-foreground">Diputuskan: {request.headmaster_approved_at ? format(new Date(request.headmaster_approved_at), "dd MMM yyyy HH:mm", { locale: id }) : '-'}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Letter Preview Dialog */}
      <Dialog open={showLetterPreview} onOpenChange={setShowLetterPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Preview Surat Peminjaman - Disetujui Kepala Sekolah</DialogTitle>
            <DialogDescription>
              Surat peminjaman telah disetujui dan siap untuk dicetak dengan tanda tangan resmi
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
                  <BorrowLetter 
                    data={{
                      request: asLetterRequest(previewRequest!),
                      ownerName: previewRequest?.owner_reviewer?.full_name || "Pengelola Inventaris",
                      headmasterName,
                      schoolName: "Darul Ma'arif",
                      schoolAddress: "Jalan Raya Kaplongan No. 28, Kaplongan, Karangampel, Indramayu",
                      letterType: 'official'
                    }}
                  />
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
                
                <PDFDownloadLink
                  document={
                    <BorrowLetter 
                      data={{
                        request: asLetterRequest(previewRequest!),
                        ownerName: previewRequest?.owner_reviewer?.full_name || "Pengelola Inventaris",
                        headmasterName,
                        schoolName: "Darul Ma'arif",
                        schoolAddress: "Jalan Raya Kaplongan No. 28, Kaplongan, Karangampel, Indramayu",
                        letterType: 'official'
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
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <BottomNav />
    </div>
  );
}

// Jalankan effect setelah komponen didefinisikan (React memproses fungsi di atas). (Note: Tidak ideal menaruh di luar tapi kita butuh di dalam komponen sebenarnya. Revisi: pindahkan kembali ke posisi internal sebelum return.)