import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarIcon, ArrowLeft, Package, CheckCircle, MapPin, User, Phone } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/layout/BottomNav";
import { useCart } from "@/hooks/useCart";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/useUserRole";

export default function Checkout() {
  const navigate = useNavigate();
  const { items: cartItems, clearCart, getTotalItems } = useCart();
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    phone: string;
    email: string;
  } | null>(null);
  const [useOwnContact, setUseOwnContact] = useState(false);
  const { isOwner, getUserDepartment } = useUserRole();
  const ownerDepartmentName = getUserDepartment();

  const [formData, setFormData] = useState({
    purpose: "",
    location_usage: "",
    pic_name: "",
    pic_contact: "",
  });

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate("/cart");
    }
    fetchUserProfile();
  }, [cartItems, navigate]);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserProfile({
          ...profile,
          email: user.email || "",
        });
      }
    }
  };

  // Update form when using own contact
  useEffect(() => {
    if (useOwnContact && userProfile) {
      setFormData(prev => ({
        ...prev,
        pic_name: userProfile.full_name || "",
        pic_contact: userProfile.phone || "",
      }));
    } else if (!useOwnContact) {
      setFormData(prev => ({
        ...prev,
        pic_name: "",
        pic_contact: "",
      }));
    }
  }, [useOwnContact, userProfile]);

  const handleSubmit = async () => {
    if (!formData.purpose || !startDate || !endDate || !formData.pic_name || !formData.pic_contact || !formData.location_usage) {
      toast.error("Mohon lengkapi semua field yang wajib diisi");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      toast.error("Tanggal selesai harus setelah tanggal mulai");
      return;
    }

    // Cek jika owner mencoba meminjam alat departemen sendiri
    if (isOwner() && ownerDepartmentName) {
      const selfOwned = cartItems.filter(ci => ci.department_name === ownerDepartmentName);
      if (selfOwned.length > 0) {
        toast.error("Owner tidak boleh meminjam alat milik departemen sendiri. Hapus item tersebut dari keranjang.");
        return;
      }
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create request
      const { data: request, error: requestError } = await supabase
        .from("borrow_requests")
        .insert({
          borrower_id: user.id,
          status: "pending_owner",
          purpose: formData.purpose,
          start_date: startDate,
          end_date: endDate,
          location_usage: formData.location_usage,
          pic_name: formData.pic_name,
          pic_contact: formData.pic_contact,
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Create request items
      const requestItems = cartItems.map((item) => ({
        request_id: request.id,
        item_id: item.id,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("request_items")
        .insert(requestItems);

      if (itemsError) throw itemsError;

      toast.success("Pengajuan berhasil dikirim!");
      clearCart();
      navigate("/orders");
    } catch (error: unknown) {
      console.error("Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Gagal mengajukan permintaan";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalDays = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 untuk menghitung hari inclusive
      return diffDays;
    }
    return 0;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header dengan Safe Area Support */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border safe-area-top">
        <div className="container-mobile pt-6 pb-4">
          <div className="flex items-center gap-3 mb-6 mt-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/cart")}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white border-0 neu-button-raised hover:neu-button-pressed"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">Checkout</h1>
              <p className="text-sm text-muted-foreground mt-1">Lengkapi detail pengajuan peminjaman</p>
            </div>
          </div>
          
          {/* Progress Steps dengan Neumorphism Enhancement */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold neu-raised shadow-lg">
                ✓
              </div>
              <span className="text-xs sm:text-sm font-medium text-blue-600">Pilih Alat</span>
            </div>
            <div className="w-6 sm:w-8 h-0.5 bg-blue-600 rounded-full neu-flat"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold neu-raised shadow-lg">
                ✓
              </div>
              <span className="text-xs sm:text-sm font-medium text-blue-600">Review Keranjang</span>
            </div>
            <div className="w-6 sm:w-8 h-0.5 bg-blue-600 rounded-full neu-flat"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold neu-raised shadow-lg border-2 border-blue-700">
                3
              </div>
              <span className="text-xs sm:text-sm font-semibold text-blue-700">Form Peminjaman</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container-mobile py-6 space-y-6">
        {/* Cart Summary dengan enhancement */}
        <Card className="neu-raised border-primary/20 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-3">
              <div className="neu-raised p-2 rounded-xl bg-blue-100">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              Ringkasan Peminjaman ({getTotalItems()} unit)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cartItems.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg neu-sunken">
                <Badge variant="outline" className="font-mono neu-raised bg-blue-50 text-blue-700 border-blue-200">
                  {item.quantity}x
                </Badge>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-gray-900 leading-tight">{item.name}</h4>
                  {item.code && (
                    <p className="text-xs text-muted-foreground mt-1">{item.code}</p>
                  )}
                </div>
              </div>
            ))}
            {cartItems.length > 3 && (
              <div className="text-center text-sm text-muted-foreground p-2 bg-muted/20 rounded-lg">
                +{cartItems.length - 3} alat lainnya
              </div>
            )}
          </CardContent>
        </Card>

        {/* Date Selection dengan enhancement */}
        <Card className="neu-flat overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-3">
              <div className="neu-raised p-2 rounded-xl bg-green-100">
                <CalendarIcon className="h-5 w-5 text-green-600" />
              </div>
              Periode Peminjaman
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Tanggal Mulai *</Label>
                <div className="relative mt-2">
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600 pointer-events-none z-10" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10 h-12 bg-white hover:bg-gray-50 border-0 neu-button-raised focus:neu-button-pressed"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Tanggal Selesai *</Label>
                <div className="relative mt-2">
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600 pointer-events-none z-10" />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate} // Pastikan tanggal selesai tidak sebelum tanggal mulai
                    className="pl-10 h-12 bg-white hover:bg-gray-50 border-0 neu-button-raised focus:neu-button-pressed"
                    required
                  />
                </div>
              </div>
            </div>

            {startDate && endDate && (
              <div className="text-center p-4 bg-blue-50 rounded-lg neu-sunken border border-blue-200">
                <p className="text-sm font-semibold text-blue-700">
                  Periode: {format(new Date(startDate), "dd MMMM yyyy", { locale: id })} - {format(new Date(endDate), "dd MMMM yyyy", { locale: id })}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Durasi: {calculateTotalDays()} hari
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Form dengan enhancement */}
        <Card className="neu-flat overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-3">
              <div className="neu-raised p-2 rounded-xl bg-orange-100">
                <CheckCircle className="h-5 w-5 text-orange-600" />
              </div>
              Detail Penggunaan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="purpose" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <CheckCircle className="h-4 w-4 text-orange-600" />
                Keperluan / Tujuan Peminjaman *
              </Label>
              <Textarea
                id="purpose"
                value={formData.purpose}
                onChange={(e) =>
                  setFormData({ ...formData, purpose: e.target.value })
                }
                placeholder="Jelaskan untuk apa alat ini akan digunakan..."
                className="min-h-24 neu-sunken mt-3 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <Label htmlFor="location_usage" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MapPin className="h-4 w-4 text-orange-600" />
                Lokasi Penggunaan *
              </Label>
              <Input
                id="location_usage"
                value={formData.location_usage}
                onChange={(e) =>
                  setFormData({ ...formData, location_usage: e.target.value })
                }
                placeholder="Dimana alat akan digunakan?"
                className="neu-sunken mt-3 h-12 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
          </CardContent>
        </Card>

        {/* Person in Charge dengan enhancement */}
        <Card className="neu-flat overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-3">
              <div className="neu-raised p-2 rounded-xl bg-purple-100">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              Penanggung Jawab
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Use own contact checkbox dengan enhancement */}
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg neu-sunken border border-blue-200">
              <Checkbox
                id="useOwnContact"
                checked={useOwnContact}
                onCheckedChange={(checked) => setUseOwnContact(checked as boolean)}
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label htmlFor="useOwnContact" className="text-sm font-medium text-blue-700 cursor-pointer">
                Gunakan nomor dan nama saya sendiri
              </Label>
            </div>

            <div>
              <Label htmlFor="pic_name" className="text-sm font-medium text-gray-700">Nama Penanggung Jawab *</Label>
              <Input
                id="pic_name"
                value={formData.pic_name}
                onChange={(e) =>
                  setFormData({ ...formData, pic_name: e.target.value })
                }
                placeholder="Nama lengkap PIC"
                className="neu-sunken mt-3 h-12 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                disabled={useOwnContact}
              />
            </div>

            <div>
              <Label htmlFor="pic_contact" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Phone className="h-4 w-4 text-purple-600" />
                Nomor Kontak PIC *
              </Label>
              <Input
                id="pic_contact"
                value={formData.pic_contact}
                onChange={(e) =>
                  setFormData({ ...formData, pic_contact: e.target.value })
                }
                placeholder="08xxxxxxxxxx"
                type="tel"
                className="neu-sunken mt-3 h-12 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                disabled={useOwnContact}
              />
              {useOwnContact && (
                <p className="text-xs text-blue-600 mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                  Menggunakan data profil Anda: <span className="font-medium">{userProfile?.full_name}</span> - <span className="font-medium">{userProfile?.phone}</span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button dengan enhancement */}
        <div className="space-y-4 pb-6">
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white border-0 neu-button-raised hover:neu-button-pressed"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Package className="h-5 w-5 mr-3 animate-spin" />
                Mengirim Pengajuan...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-3" />
                Kirim Pengajuan Peminjaman
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="w-full h-12 text-base font-medium border-gray-300 hover:bg-gray-50 border-0 neu-button-raised hover:neu-button-pressed"
            onClick={() => navigate("/cart")}
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Keranjang
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}