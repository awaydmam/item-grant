import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/layout/BottomNav';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { FileText, CheckCircle, XCircle, Calendar, User, ArrowLeft, Download, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { BorrowLetter } from '@/components/PDF/BorrowLetter';

interface RequestItem { id: string; quantity: number; item?: { name: string; code?: string }; }
interface ReviewRequest {
  id: string;
  purpose: string;
  start_date: string;
  end_date: string;
  location_usage?: string;
  pic_name: string;
  pic_contact: string;
  status: string;
  letter_number?: string;
  letter_generated_at?: string;
  rejection_reason?: string;
  owner_reviewed_at?: string;
  headmaster_approved_at?: string;
  borrower?: { full_name: string; unit: string; phone?: string };
  request_items?: RequestItem[];
  owner_reviewer?: { full_name: string };
}

export default function ReviewHistory() {
  const navigate = useNavigate();
  const [approved, setApproved] = useState<ReviewRequest[]>([]);
  const [rejected, setRejected] = useState<ReviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewRequest, setPreviewRequest] = useState<ReviewRequest | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isHeadmaster, setIsHeadmaster] = useState(false);

  const adaptLetter = (r: ReviewRequest | null) => {
    if (!r) return undefined;
    return {
      id: r.id,
      letter_number: r.letter_number,
      purpose: r.purpose,
      start_date: r.start_date,
      end_date: r.end_date,
      location_usage: r.location_usage,
      pic_name: r.pic_name,
      pic_contact: r.pic_contact,
      created_at: r.owner_reviewed_at || r.headmaster_approved_at || r.letter_generated_at,
      borrower: r.borrower || { full_name: '-', unit: '-', phone: '' },
      request_items: (r.request_items || []).map(ri => ({
        quantity: ri.quantity,
        items: { name: ri.item?.name || '-', code: ri.item?.code || '', description: '' }
      }))
    };
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // cek role headmaster
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const isHM = roles?.some(r => r.role === 'headmaster');
    setIsHeadmaster(isHM || false);

    // ambil request yang pernah direview user ini (owner_reviewed_by atau headmaster_approved_by)
    const { data } = await supabase
      .from('borrow_requests')
      .select(`
        *,
        request_items(*, item:items(name, code)),
        borrower:profiles!borrow_requests_borrower_id_fkey(full_name, unit, phone),
        owner_reviewer:profiles!borrow_requests_owner_reviewed_by_fkey(full_name)
      `)
      .or(`owner_reviewed_by.eq.${user.id},headmaster_approved_by.eq.${user.id}`)
      .order('updated_at', { ascending: false })
      .limit(150);

    const all = (data as ReviewRequest[] | null) || [];
    setApproved(all.filter(r => ['approved','active','completed'].includes(r.status)));
    setRejected(all.filter(r => r.status === 'rejected'));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const renderCard = (r: ReviewRequest, variant: 'approved' | 'rejected') => (
    <Card key={r.id} className="neu-flat hover:neu-raised transition-all border-0">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              <FileText className={`h-4 w-4 ${variant==='approved' ? 'text-primary' : 'text-destructive'} flex-shrink-0`} />
              <span className="truncate font-mono">#{r.id.slice(0,8)}</span>
              <Badge variant={variant==='approved'? 'secondary':'destructive'}>
                {variant==='approved'? 'Disetujui' : 'Ditolak'}
              </Badge>
              {r.letter_number && variant==='approved' && (
                <span className="text-xs text-primary font-mono">No: {r.letter_number}</span>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {variant==='approved' ? (r.letter_number ? 'Surat terbit & siap digunakan' : 'Disetujui') : (r.rejection_reason || 'Ditolak')}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="sm" variant="outline" className="rounded-xl" onClick={()=>{setPreviewRequest(r); setShowPreview(true);}}>
              <Eye className="h-4 w-4" />
            </Button>
            {variant==='approved' && r.letter_number && (
              <PDFDownloadLink
                document={<BorrowLetter data={{ request: adaptLetter(r), ownerName: r.owner_reviewer?.full_name, headmasterName: isHeadmaster ? r.owner_reviewer?.full_name : undefined, schoolName: 'Darul Ma\'arif', schoolAddress: 'Jalan Raya Kaplongan No. 28, Kaplongan, Karangampel, Indramayu', letterType: isHeadmaster ? 'official':'internal' }} />}
                fileName={`Surat_${r.letter_number || r.id}.pdf`}
              >
                {({loading}) => (
                  <Button size="sm" disabled={loading} className="rounded-xl">
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </PDFDownloadLink>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{format(new Date(r.start_date), 'dd MMM', { locale: id })} - {format(new Date(r.end_date), 'dd MMM yyyy', { locale: id })}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="h-4 w-4" />
          <span>{r.borrower?.full_name} • {r.borrower?.unit}</span>
        </div>
        {r.owner_reviewed_at && (
          <p className="text-xs text-muted-foreground">Review Pemilik: {format(new Date(r.owner_reviewed_at), 'dd MMM yyyy HH:mm', { locale: id })}</p>
        )}
        {r.headmaster_approved_at && (
          <p className="text-xs text-muted-foreground">Approve Kepsek: {format(new Date(r.headmaster_approved_at), 'dd MMM yyyy HH:mm', { locale: id })}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-border/40">
        <div className="container-mobile py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={()=>navigate(-1)} className="neu-flat hover:neu-raised rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Riwayat Review</h1>
            <p className="text-sm text-muted-foreground">Semua surat yang sudah Anda proses</p>
          </div>
        </div>
      </div>
      <div className="container-mobile py-6 space-y-6">
        <Tabs defaultValue="approved" className="space-y-4">
          <TabsList className="grid grid-cols-2 w-full neu-flat rounded-2xl p-1 h-auto">
            <TabsTrigger value="approved" className="rounded-xl data-[state=active]:neu-pressed data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-2.5 text-sm flex items-center justify-center">
              <CheckCircle className="h-4 w-4 mr-2" /> Disetujui ({approved.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="rounded-xl data-[state=active]:neu-pressed data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive py-2.5 text-sm flex items-center justify-center">
              <XCircle className="h-4 w-4 mr-2" /> Ditolak ({rejected.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="approved" className="space-y-4 mt-4">
            {approved.length === 0 ? (
              <Card className="neu-flat border-0">
                <CardContent className="py-10 text-center space-y-2">
                  <CheckCircle className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Belum ada surat disetujui</p>
                </CardContent>
              </Card>
            ) : approved.map(r => renderCard(r, 'approved'))}
          </TabsContent>
          <TabsContent value="rejected" className="space-y-4 mt-4">
            {rejected.length === 0 ? (
              <Card className="neu-flat border-0">
                <CardContent className="py-10 text-center space-y-2">
                  <XCircle className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Tidak ada surat ditolak</p>
                </CardContent>
              </Card>
            ) : rejected.map(r => renderCard(r, 'rejected'))}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Preview Surat</DialogTitle>
            <DialogDescription>Pratinjau surat peminjaman</DialogDescription>
          </DialogHeader>
          {previewRequest && (
            <div className="space-y-4">
              <div className="h-[600px] border rounded-lg overflow-hidden">
                <PDFViewer style={{width:'100%', height:'100%'}} showToolbar={false}>
                  <BorrowLetter data={{ request: adaptLetter(previewRequest), ownerName: previewRequest.owner_reviewer?.full_name, headmasterName: isHeadmaster ? previewRequest.owner_reviewer?.full_name : undefined, schoolName: 'Darul Ma\'arif', schoolAddress: 'Jalan Raya Kaplongan No. 28, Kaplongan, Karangampel, Indramayu', letterType: isHeadmaster ? 'official':'internal' }} />
                </PDFViewer>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={()=>setShowPreview(false)} className="neu-raised">Tutup</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
