import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BottomNav } from "@/components/layout/BottomNav";
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  User, 
  Phone, 
  FileText, 
  Download,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { generatePDF } from "@/lib/pdfGenerator";
import { startLoanProcess, completeLoanProcess } from "@/lib/loanManagement";

interface RequestDetail {
  id: string;
  status: string;
  purpose: string;
  start_date: string;
  end_date: string;
  location_usage: string;
  pic_name: string;
  pic_contact: string;
  letter_number: string;
  letter_generated_at: string;
  owner_notes: string;
  headmaster_notes: string;
  rejection_reason: string;
  created_at: string;
  borrower: {
    full_name: string;
    unit: string;
    phone: string;
  };
  request_items: {
    id: string;
    quantity: number;
    items: {
      id: string;
      name: string;
      code: string;
      image_url: string;
      departments: {
        name: string;
      };
    };
  }[];
}

export default function RequestDetail() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequestDetail = async () => {
      try {
        const { data, error } = await supabase
          .from("borrow_requests")
          .select(`
            *,
            borrower:profiles(full_name, unit, phone),
            request_items(
              id,
              quantity,
              items(
                id,
                name,
                code,
                image_url,
                departments(name)
              )
            )
          `)
          .eq("id", requestId)
          .single();

        if (error) throw error;
        setRequest(data);
      } catch (error) {
        console.error("Error fetching request:", error);
        toast.error("Gagal memuat detail permintaan");
        navigate("/orders");
      } finally {
        setLoading(false);
      }
    };

    if (requestId) {
      fetchRequestDetail();
    }
  }, [requestId, navigate]);

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: typeof FileText }> = {
      draft: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: FileText },
      pending_owner: { label: "Menunggu Owner", color: "bg-yellow-100 text-yellow-700", icon: Clock },
      pending_headmaster: { label: "Menunggu Kepsek", color: "bg-blue-100 text-blue-700", icon: Clock },
      approved: { label: "Disetujui", color: "bg-green-100 text-green-700", icon: CheckCircle },
      active: { label: "Sedang Dipinjam", color: "bg-purple-100 text-purple-700", icon: Package },
      completed: { label: "Selesai", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
      rejected: { label: "Ditolak", color: "bg-red-100 text-red-700", icon: XCircle },
      cancelled: { label: "Dibatalkan", color: "bg-gray-100 text-gray-700", icon: XCircle }
    };
    return statusMap[status] || { label: status, color: "bg-gray-100 text-gray-700", icon: AlertCircle };
  };

  const handleStartLoan = async () => {
    if (!request?.id) return;

    const confirmed = window.confirm(
      "Mulai peminjaman alat? Ini akan mengurangi jumlah stok tersedia dan mengubah status menjadi 'Sedang Dipinjam'."
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const result = await startLoanProcess(request.id);
      if (result.success) {
        toast.success("Peminjaman dimulai! Stok alat telah diperbarui.");
        // Refresh data
        window.location.reload();
      } else {
        throw new Error("Failed to start loan");
      }
    } catch (error) {
      console.error("Error starting loan:", error);
      toast.error("Gagal memulai peminjaman");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteLoan = async () => {
    if (!request?.id) return;

    const confirmed = window.confirm(
      "Selesaikan peminjaman? Ini akan mengembalikan alat ke stok tersedia dan mengubah status menjadi 'Selesai'."
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const result = await completeLoanProcess(request.id);
      if (result.success) {
        toast.success("Peminjaman selesai! Alat telah dikembalikan ke stok.");
        // Refresh data
        window.location.reload();
      } else {
        throw new Error("Failed to complete loan");
      }
    } catch (error) {
      console.error("Error completing loan:", error);
      toast.error("Gagal menyelesaikan peminjaman");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadLetter = async () => {
    if (!request?.letter_number) {
      toast.error("Surat belum tersedia");
      return;
    }

    try {
      // Get owner and headmaster info
      const { data: ownerData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", request.borrower.id)
        .single();

      const { data: headmasterData } = await supabase
        .from("user_roles")
        .select("profiles(full_name)")
        .eq("role", "headmaster")
        .single();

      // Prepare PDF data
      const pdfData = {
        request: {
          id: request.id,
          letter_number: request.letter_number,
          purpose: request.purpose,
          start_date: request.start_date,
          end_date: request.end_date,
          location_usage: request.location_usage,
          pic_name: request.pic_name,
          pic_contact: request.pic_contact,
          created_at: request.created_at,
          borrower: {
            full_name: request.borrower.full_name,
            unit: request.borrower.unit,
            phone: request.borrower.phone
          },
          request_items: request.request_items.map(item => ({
            quantity: item.quantity,
            items: {
              name: item.items.name,
              code: item.items.code,
              description: item.items.description || ""
            }
          }))
        },
        ownerName: ownerData?.full_name,
        headmasterName: headmasterData?.profiles?.full_name,
        schoolName: "SMK NEGERI 1 KOTA BEKASI",
        schoolAddress: "Jl. Bintara VIII No.2, Bintara, Kec. Bekasi Barat\nKota Bekasi, Jawa Barat 17134\nTelp: (021) 8844567 | Email: smkn1kotabekasi@gmail.com"
      };

      await generatePDF(pdfData);
      toast.success("Surat PDF berhasil diunduh");
    } catch (error) {
      console.error("Error downloading letter:", error);
      toast.error("Gagal mengunduh surat");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-16">
        <div className="container-mobile pt-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-muted-foreground">Memuat detail permintaan...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background pb-16">
        <div className="container-mobile pt-6">
          <div className="text-center">
            <p className="text-muted-foreground">Permintaan tidak ditemukan</p>
            <Button onClick={() => navigate("/orders")} className="mt-4">
              Kembali ke Daftar Pesanan
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const statusInfo = getStatusInfo(request.status);

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container-mobile py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/orders")}
              className="neu-flat"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Detail Permintaan</h1>
              <p className="text-sm text-muted-foreground">
                #{request.id.slice(0, 8)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-mobile py-4 space-y-6">
        {/* Status Card */}
        <Card className="neu-flat">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <statusInfo.icon className="h-6 w-6 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">Status Permintaan</h3>
                  <Badge className={statusInfo.color}>
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>
              
              {(request.status === 'approved' || request.status === 'active' || request.status === 'completed') && request.letter_number && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadLetter}
                  className="neu-flat"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Unduh Surat
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {(request.status === 'approved' || request.status === 'active') && (
          <Card className="neu-flat">
            <CardHeader>
              <CardTitle className="text-lg">Kelola Peminjaman</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {request.status === 'approved' && (
                <Button
                  onClick={handleStartLoan}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Package className="h-4 w-4 mr-2" />
                  {loading ? "Memproses..." : "Mulai Peminjaman"}
                </Button>
              )}
              
              {request.status === 'active' && (
                <Button
                  onClick={handleCompleteLoan}
                  disabled={loading}
                  variant="outline"
                  className="w-full border-green-600 text-green-600 hover:bg-green-50"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {loading ? "Memproses..." : "Selesaikan Peminjaman"}
                </Button>
              )}
              
              <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg">
                <strong>Info:</strong>
                {request.status === 'approved' && 
                  " Klik 'Mulai Peminjaman' untuk mengurangi stok alat dan mengubah status menjadi aktif."
                }
                {request.status === 'active' && 
                  " Klik 'Selesaikan Peminjaman' untuk mengembalikan alat ke stok dan menyelesaikan transaksi."
                }
              </div>
            </CardContent>
          </Card>
        )}

        {/* Request Info */}
        <Card className="neu-flat">
          <CardHeader>
            <CardTitle className="text-lg">Informasi Permintaan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Periode Peminjaman</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(request.start_date), "dd MMM yyyy", { locale: id })} - {format(new Date(request.end_date), "dd MMM yyyy", { locale: id })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Keperluan</p>
                <p className="text-sm text-muted-foreground">{request.purpose}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Lokasi Penggunaan</p>
                <p className="text-sm text-muted-foreground">{request.location_usage}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Penanggung Jawab</p>
                <p className="text-sm text-muted-foreground">
                  {request.pic_name}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {request.pic_contact}
                </p>
              </div>
            </div>

            {request.letter_number && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Nomor Surat</p>
                  <p className="text-sm text-muted-foreground">{request.letter_number}</p>
                  <p className="text-xs text-muted-foreground">
                    Dibuat: {format(new Date(request.letter_generated_at), "dd MMM yyyy HH:mm", { locale: id })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items List */}
        <Card className="neu-flat">
          <CardHeader>
            <CardTitle className="text-lg">Daftar Alat ({request.request_items.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {request.request_items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden neu-sunken">
                  {item.items.image_url ? (
                    <img src={item.items.image_url} alt={item.items.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{item.items.name}</h4>
                  <p className="text-sm text-muted-foreground">{item.items.code}</p>
                  <p className="text-xs text-muted-foreground">{item.items.departments.name}</p>
                </div>
                <Badge variant="secondary">
                  {item.quantity} unit
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notes */}
        {(request.owner_notes || request.headmaster_notes || request.rejection_reason) && (
          <Card className="neu-flat">
            <CardHeader>
              <CardTitle className="text-lg">Catatan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {request.owner_notes && (
                <div>
                  <p className="font-medium text-sm">Catatan Pemilik Alat:</p>
                  <p className="text-sm text-muted-foreground">{request.owner_notes}</p>
                </div>
              )}
              
              {request.headmaster_notes && (
                <>
                  {request.owner_notes && <Separator />}
                  <div>
                    <p className="font-medium text-sm">Catatan Kepala Sekolah:</p>
                    <p className="text-sm text-muted-foreground">{request.headmaster_notes}</p>
                  </div>
                </>
              )}
              
              {request.rejection_reason && (
                <>
                  {(request.owner_notes || request.headmaster_notes) && <Separator />}
                  <div>
                    <p className="font-medium text-sm text-red-600">Alasan Penolakan:</p>
                    <p className="text-sm text-red-500">{request.rejection_reason}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
}