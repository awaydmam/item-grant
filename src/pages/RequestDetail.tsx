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
  AlertCircle,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { generatePDF } from "@/lib/pdfGenerator";
import { startLoanProcess, completeLoanProcess } from "@/lib/loanManagement";
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
  const [showLetterPreview, setShowLetterPreview] = useState(false);

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

  const markLetterAsViewed = async () => {
    // no-op for now
  };

  const handlePreviewLetter = () => {
    markLetterAsViewed();
    setShowLetterPreview(true);
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
        schoolName: "Darul Ma'arif",
        schoolAddress: "Jalan Raya Kaplongan No. 28, Kaplongan, Karangampel, Indramayu\nTelp: 082219699610 | Email: pontrendarulmaarif@gmail.com"
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-24 safe-area-pb">
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200">
          <div className="px-4 py-5 safe-area-pt">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 neu-flat rounded-xl animate-pulse"></div>
              <div className="space-y-2">
                <div className="w-32 h-5 neu-flat rounded-xl animate-pulse"></div>
                <div className="w-24 h-3 neu-flat rounded-xl animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 py-6 space-y-5">
          <div className="neu-raised rounded-xl p-6 h-32 animate-pulse"></div>
          <div className="neu-raised rounded-xl p-6 h-48 animate-pulse"></div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-24 safe-area-pb">
        <div className="px-4 py-6 safe-area-pt">
          <Card className="neu-raised border-0">
            <CardContent className="py-16 text-center px-6">
              <div className="w-16 h-16 neu-sunken rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Permintaan Tidak Ditemukan</h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Permintaan yang Anda cari tidak ditemukan atau telah dihapus
              </p>
              <Button 
                onClick={() => navigate("/orders")} 
                className="rounded-xl bg-blue-600 hover:bg-blue-700 px-8"
              >
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-24 safe-area-pb">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="px-4 py-5 safe-area-pt">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/orders")}
              className="neu-button-raised rounded-xl hover:neu-button-pressed transition-all bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Detail Permintaan</h1>
              <p className="text-sm text-gray-600">
                #{request.id.slice(0, 8)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Status Card */}
        <Card className="neu-raised border-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${statusInfo.color.replace('bg-', 'neu-sunken bg-')}`}>
                <statusInfo.icon className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Status Permintaan</h3>
                <Badge className={`${statusInfo.color} rounded-lg px-3 py-1`}>
                  {statusInfo.label}
                </Badge>
              </div>
            </div>
            
            {request.letter_number && (
              <div className="mt-6 p-5 neu-sunken rounded-xl bg-green-50/50">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-xs font-medium text-green-700 mb-2">Nomor Surat Resmi</p>
                    <p className="text-base font-bold text-green-900 font-mono">{request.letter_number}</p>
                  </div>
                  <div className="neu-flat p-3 rounded-xl bg-green-100">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handlePreviewLetter}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 neu-button-raised hover:neu-button-pressed border-0"
                    size="lg"
                  >
                    <Eye className="h-5 w-5 mr-2" />
                    Preview Surat
                  </Button>
                  <Button
                    onClick={handleDownloadLetter}
                    className="bg-green-600 hover:bg-green-700 text-white rounded-xl h-12 neu-button-raised hover:neu-button-pressed border-0"
                    size="lg"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download PDF
                  </Button>
                </div>
                <p className="text-xs text-green-700 mt-3 text-center">
                  Surat resmi lengkap dengan kop dan tanda tangan
                </p>
              </div>
            )}
            
            {!request.letter_number && request.status !== 'rejected' && request.status !== 'cancelled' && (
              <div className="mt-6 p-4 neu-sunken rounded-xl bg-yellow-50/50">
                <p className="text-sm text-yellow-800 text-center">
                  ⏳ Surat sedang diproses. Tunggu persetujuan dari pemilik alat dan kepala sekolah.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {(request.status === 'approved' || request.status === 'active') && (
          <Card className="neu-raised border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900">Kelola Peminjaman</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {request.status === 'approved' && (
                <Button
                  onClick={handleStartLoan}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl h-12 neu-button-raised border-0"
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
                  className="w-full border-green-600 text-green-600 hover:bg-green-50 rounded-xl h-12 neu-button-raised"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  {loading ? "Memproses..." : "Selesaikan Peminjaman"}
                </Button>
              )}
              
              <div className="text-xs text-gray-700 neu-sunken p-4 rounded-xl bg-blue-50/50">
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
        <Card className="neu-raised border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">Informasi Permintaan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 neu-sunken bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-1">Periode Peminjaman</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {format(new Date(request.start_date), "dd MMM yyyy", { locale: id })} - {format(new Date(request.end_date), "dd MMM yyyy", { locale: id })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 neu-sunken bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-1">Keperluan</p>
                <p className="text-sm text-gray-600 leading-relaxed">{request.purpose}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 neu-sunken bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-1">Lokasi Penggunaan</p>
                <p className="text-sm text-gray-600 leading-relaxed">{request.location_usage}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 neu-sunken bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <User className="h-6 w-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-1">Penanggung Jawab</p>
                <p className="text-sm text-gray-600 mb-1">
                  {request.pic_name}
                </p>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {request.pic_contact}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items List */}
        <Card className="neu-raised border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Daftar Alat ({request.request_items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {request.request_items.map((item, index) => (
              <div key={item.id} className={`flex items-center gap-4 p-4 neu-sunken rounded-xl ${index > 0 ? 'mt-4' : ''}`}>
                <div className="w-16 h-16 rounded-xl neu-flat bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.items.image_url ? (
                    <img src={item.items.image_url} alt={item.items.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Package className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 mb-1">{item.items.name}</h4>
                  <p className="text-sm text-gray-600 mb-1">{item.items.code}</p>
                  <p className="text-xs text-gray-500">{item.items.departments.name}</p>
                </div>
                <Badge variant="secondary" className="neu-flat bg-blue-100 text-blue-700 rounded-full px-4 py-1 font-medium">
                  {item.quantity} unit
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notes */}
        {(request.owner_notes || request.headmaster_notes || request.rejection_reason) && (
          <Card className="neu-raised border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900">Catatan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {request.owner_notes && (
                <div className="neu-sunken p-4 rounded-xl bg-blue-50/50">
                  <p className="font-semibold text-sm text-blue-900 mb-2">Catatan Pemilik Alat:</p>
                  <p className="text-sm text-blue-700 leading-relaxed">{request.owner_notes}</p>
                </div>
              )}
              
              {request.headmaster_notes && (
                <div className="neu-sunken p-4 rounded-xl bg-purple-50/50">
                  <p className="font-semibold text-sm text-purple-900 mb-2">Catatan Kepala Sekolah:</p>
                  <p className="text-sm text-purple-700 leading-relaxed">{request.headmaster_notes}</p>
                </div>
              )}
              
              {request.rejection_reason && (
                <div className="neu-sunken p-4 rounded-xl bg-red-50/50 border border-red-200">
                  <p className="font-semibold text-sm text-red-900 mb-2">Alasan Penolakan:</p>
                  <p className="text-sm text-red-700 leading-relaxed">{request.rejection_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Letter Preview Dialog */}
      <Dialog open={showLetterPreview} onOpenChange={setShowLetterPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Preview Surat Peminjaman</DialogTitle>
            <DialogDescription>
              Surat peminjaman resmi yang telah disetujui
            </DialogDescription>
          </DialogHeader>
          
          {request && (
            <div className="space-y-4">
              {/* PDF Preview */}
              <div className="h-[600px] border rounded-lg overflow-hidden">
                <PDFViewer 
                  style={{ width: '100%', height: '100%' }}
                  showToolbar={false}
                >
                  <BorrowLetter 
                    data={{
                      request: {
                        ...request,
                        request_items: request.request_items.map(item => ({
                          quantity: item.quantity,
                          items: {
                            name: item.items.name,
                            code: item.items.code,
                            description: item.items.description
                          }
                        }))
                      },
                      ownerName: "Pengelola Inventaris",
                      headmasterName: "Kepala Sekolah",
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
                        request: {
                          ...request,
                          request_items: request.request_items.map(item => ({
                            quantity: item.quantity,
                            items: {
                              name: item.items.name,
                              code: item.items.code,
                              description: item.items.description
                            }
                          }))
                        },
                        ownerName: "Pengelola Inventaris",
                        headmasterName: "Kepala Sekolah",
                        schoolName: "Darul Ma'arif",
                        schoolAddress: "Jalan Raya Kaplongan No. 28, Kaplongan, Karangampel, Indramayu",
                        letterType: 'official'
                      }}
                    />
                  }
                  fileName={`Surat_Peminjaman_${request.borrower?.full_name?.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`}
                >
                  {({ loading }) => (
                    <Button 
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 text-white neu-button-raised hover:neu-button-pressed border-0"
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