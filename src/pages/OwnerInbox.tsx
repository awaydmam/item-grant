import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BottomNav } from "@/components/layout/BottomNav";
import { toast } from "sonner";
import { Inbox, CheckCircle, XCircle, Edit3, Calendar, User } from "lucide-react";
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

export default function OwnerInbox() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotes, setActionNotes] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("borrow_requests")
      .select(`
        *,
        request_items(
          *,
          item:items(name, code, department:departments(name))
        ),
        borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit, phone)
      `)
      .eq("status", "pending_owner")
      .order("created_at", { ascending: false });

    if (data) setRequests(data);
    setLoading(false);
  };

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

      toast.success("Disetujui! Surat internal siap dicetak.");
      setActionNotes("");
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || "Gagal menyetujui permintaan");
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
    } catch (error: any) {
      toast.error(error.message || "Gagal meneruskan permintaan");
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
    } catch (error: any) {
      toast.error(error.message || "Gagal menolak permintaan");
    } finally {
      setProcessingId(null);
    }
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
            Review dan kelola pengajuan peminjaman alat
          </p>
        </div>

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
                      {request.request_items?.map((ri: any) => (
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
                          onClick={() => handleDirectLetter(request.id)}
                          disabled={processingId === request.id}
                          variant="default"
                          className="w-full neu-flat text-left"
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
                          className="w-full neu-flat text-left"
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
                              className="w-full"
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
                                className="w-full"
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
      </div>
      <BottomNav />
    </div>
  );
}