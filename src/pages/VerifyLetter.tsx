import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, AlertCircle, XCircle, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

interface VerifyData {
  id: string;
  status: string;
  letter_number?: string;
  purpose: string;
  start_date: string;
  end_date: string;
  letter_generated_at?: string;
  borrower?: { full_name: string; unit: string; phone?: string };
  owner_reviewer?: { full_name: string };
  headmaster_approver?: { full_name: string };
}

export default function VerifyLetter() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<VerifyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('borrow_requests')
        .select(`*, borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit, phone), owner_reviewer:profiles!borrow_requests_owner_reviewed_by_fkey(full_name), headmaster_approver:profiles!borrow_requests_headmaster_approved_by_fkey(full_name)`) // optional headmaster
        .eq('id', id)
        .maybeSingle();
      if (error || !data) {
        setNotFound(true);
      } else {
        setData(data);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
      case 'completed':
        return <Badge className="bg-green-600 text-white">VALID</Badge>;
      case 'rejected':
      case 'cancelled':
        return <Badge variant="destructive">TIDAK BERLAKU</Badge>;
      default:
        return <Badge variant="secondary">DRAFT/PROSES</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-10 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl bg-white/60">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Verifikasi Surat</h1>
        </div>
        {loading && (
          <Card className="neu-raised border-0 animate-pulse">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">Memuat data...</CardContent>
          </Card>
        )}
        {notFound && !loading && (
          <Card className="neu-raised border-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" /> Surat Tidak Ditemukan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>QR code atau tautan tidak valid / data sudah dihapus.</p>
              <Button onClick={() => navigate('/auth')} className="rounded-xl">Masuk Sistem</Button>
            </CardContent>
          </Card>
        )}
        {data && !loading && (
          <Card className="neu-raised border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Surat Peminjaman
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between p-3 rounded-lg neu-sunken bg-white/70">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status Keabsahan</p>
                  <div className="flex items-center gap-2">
                    {statusBadge(data.status)}
                    {data.letter_number && <Badge className="bg-blue-600 text-white">Official</Badge>}
                    {!data.letter_number && data.status === 'approved' && <Badge className="bg-indigo-600 text-white">Internal</Badge>}
                  </div>
                </div>
                {data.letter_number && (
                  <div className="text-right text-xs">
                    <p className="font-semibold">No: {data.letter_number}</p>
                    {data.letter_generated_at && <p className="text-gray-500 mt-0.5">Terbit {format(new Date(data.letter_generated_at), 'dd MMM yyyy', { locale: localeID })}</p>}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Peminjam</p>
                  <p className="font-medium leading-tight">{data.borrower?.full_name}</p>
                  <p className="text-xs text-gray-600">{data.borrower?.unit}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Periode</p>
                  <p className="font-medium leading-tight">{format(new Date(data.start_date), 'dd MMM', { locale: localeID })} - {format(new Date(data.end_date), 'dd MMM yyyy', { locale: localeID })}</p>
                  <p className="text-xs text-gray-600">{data.purpose.slice(0,60)}{data.purpose.length>60?'...':''}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Disetujui Owner</p>
                  <p className="font-medium leading-tight">{data.owner_reviewer?.full_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Disetujui Kepsek</p>
                  <p className="font-medium leading-tight">{data.headmaster_approver?.full_name || '-'}</p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 text-xs text-blue-700 leading-relaxed">
                Jika status VALID dan data sesuai, surat ini diterbitkan oleh sistem resmi peminjaman inventaris sekolah. QR Code bersifat unik untuk setiap surat.
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => navigate('/auth')} className="flex-1 rounded-xl">Masuk Sistem</Button>
                <Button variant="outline" onClick={() => navigate('/landing')} className="flex-1 rounded-xl">Landing Page</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
