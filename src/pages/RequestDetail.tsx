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
      description: string | null;
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
    let isMounted = true;
    
    const fetchRequestDetail = async () => {
      try {
        const { data, error } = await supabase
          .from("borrow_requests")
          .select(`
            *,
            request_items(
              id,
              quantity,
              items!inner(
                id,
                name,
                code,
                image_url,
                description,
                departments!inner(name)
              )
            )
          `)
          .eq("id", requestId)
          .single();

        if (error) throw error;
        
        // Fetch borrower info separately
        const { data: borrowerData } = await supabase
          .from("profiles")
          .select("full_name, unit, phone")
          .eq("id", data.borrower_id)
          .single();
        
        if (isMounted) {
          setRequest({
            ...data,
            borrower: borrowerData || { full_name: '', unit: '', phone: '' }
          } as RequestDetail);
        }
      } catch (error) {
        console.error("Error fetching request:", error);
        if (isMounted) {
          toast.error("Gagal memuat detail permintaan");
          navigate("/orders");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (requestId) {
      fetchRequestDetail();
    }
    
    return () => {
      isMounted = false;
    };
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
      // Get headmaster info
      const { data: headmasterRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "headmaster")
        .limit(1)
        .single();

      let headmasterName = undefined;
      if (headmasterRoles) {
        const { data: headmasterProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", headmasterRoles.user_id)
          .single();
        
        headmasterName = headmasterProfile?.full_name;
      }

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
        headmasterName,
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-20">
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200">
          <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="space-y-2">
                <div className="w-32 h-5 bg-gray-200 rounded-xl animate-pulse"></div>
                <div className="w-24 h-3 bg-gray-200 rounded-xl animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4">
          <div className="bg-white/80 rounded-xl p-6 h-32 animate-pulse"></div>
          <div className="bg-white/80 rounded-xl p-6 h-48 animate-pulse"></div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-20">
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Permintaan Tidak Ditemukan</h3>
              <p className="text-gray-600 mb-6">
                Permintaan yang Anda cari tidak ditemukan atau telah dihapus
              </p>
              <Button onClick={() => navigate("/orders")} className="rounded-xl">
                Kembali ke Daftar Pesanan
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  const statusInfo = getStatusInfo(request.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/orders")}
              className="rounded-xl hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Detail Permintaan</h1>
              <p className="text-xs sm:text-sm text-gray-600">
                #{request.id.slice(0, 8)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4">
        {/* Status Card */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${statusInfo.color}`}>
                  <statusInfo.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Status Permintaan</h3>
                  <Badge className={`${statusInfo.color} mt-1`}>
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>
              
              {(request.status === 'approved' || request.status === 'active' || request.status === 'completed') && request.letter_number && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadLetter}
                  className="rounded-xl bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Unduh Surat PDF
                </Button>
              )}
            </div>
            
            {request.letter_number && (
              <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-200">
                <p className="text-sm font-medium text-green-800">
                  Nomor Surat: <span className="font-mono">{request.letter_number}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {(request.status === 'approved' || request.status === 'active') && (
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900">Kelola Peminjaman</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {request.status === 'approved' && (
                <Button
                  onClick={handleStartLoan}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl h-11"
                >
                  <Package className="h-5 w-5 mr-2" />
                  {loading ? "Memproses..." : "Mulai Peminjaman"}
                </Button>
              )}
              
              {request.status === 'active' && (
                <Button
                  onClick={handleCompleteLoan}
                  disabled={loading}
                  variant="outline"
                  className="w-full border-green-600 text-green-600 hover:bg-green-50 rounded-xl h-11"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  {loading ? "Memproses..." : "Selesaikan Peminjaman"}
                </Button>
              )}
              
              <div className="text-xs text-gray-700 bg-blue-50 p-3 rounded-xl">
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
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">Informasi Permintaan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Periode Peminjaman</p>
                <p className="text-sm text-gray-600">
                  {format(new Date(request.start_date), "dd MMM yyyy", { locale: id })} - {format(new Date(request.end_date), "dd MMM yyyy", { locale: id })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Keperluan</p>
                <p className="text-sm text-gray-600">{request.purpose}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Lokasi Penggunaan</p>
                <p className="text-sm text-gray-600">{request.location_usage}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Penanggung Jawab</p>
                <p className="text-sm text-gray-600">
                  {request.pic_name}
                </p>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {request.pic_contact}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items List */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Daftar Alat ({request.request_items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {request.request_items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center overflow-hidden">
                  {item.items.image_url ? (
                    <img src={item.items.image_url} alt={item.items.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-7 w-7 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900">{item.items.name}</h4>
                  <p className="text-sm text-gray-600">{item.items.code}</p>
                  <p className="text-xs text-gray-500">{item.items.departments.name}</p>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 rounded-full px-3">
                  {item.quantity} unit
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notes */}
        {(request.owner_notes || request.headmaster_notes || request.rejection_reason) && (
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900">Catatan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {request.owner_notes && (
                <div className="bg-blue-50 p-3 rounded-xl">
                  <p className="font-semibold text-sm text-blue-900">Catatan Pemilik Alat:</p>
                  <p className="text-sm text-blue-700 mt-1">{request.owner_notes}</p>
                </div>
              )}
              
              {request.headmaster_notes && (
                <div className="bg-purple-50 p-3 rounded-xl">
                  <p className="font-semibold text-sm text-purple-900">Catatan Kepala Sekolah:</p>
                  <p className="text-sm text-purple-700 mt-1">{request.headmaster_notes}</p>
                </div>
              )}
              
              {request.rejection_reason && (
                <div className="bg-red-50 p-3 rounded-xl border border-red-200">
                  <p className="font-semibold text-sm text-red-900">Alasan Penolakan:</p>
                  <p className="text-sm text-red-700 mt-1">{request.rejection_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
}